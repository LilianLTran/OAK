import { AppointmentStatus, PaymentStatus, Prisma, Role } from '@prisma/client';
import { DateTime } from 'luxon';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/errors';
import { getOwnTechnicianProfile } from '../../utils/ownership';
import { PageParams, paginate } from '../../utils/pagination';
import { availabilityRepository } from '../availability/availability.repository';
import { computeSlotsForDate } from '../availability/availability.engine';
import { paymentsService } from '../payments/payments.service';

const APPT_INCLUDE = {
  services: true,
  payment: true,
  review: { select: { id: true, rating: true } },
  customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  technician: {
    select: {
      id: true, salonName: true, city: true, state: true, address: true, profilePhotoUrl: true, timezone: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.AppointmentInclude;

const ACTIVE: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

export interface BookInput {
  technicianId: string;
  serviceId: string;
  addOnIds: string[];
  startAt: Date;
  customerNote?: string;
}

export const appointmentsService = {
  /**
   * Booking — validation happens in three layers:
   *  1. Slot engine: startAt must be an offered slot (working hours, breaks,
   *     blocked time, buffers, lead time all respected).
   *  2. Serializable transaction re-checks overlaps for BOTH parties.
   *  3. Postgres EXCLUDE constraints are the final backstop under races.
   */
  async book(customerId: string, input: BookInput) {
    const tech = await prisma.technicianProfile.findFirst({
      where: { id: input.technicianId, isPublished: true, user: { isSuspended: false } },
    });
    if (!tech) throw ApiError.notFound('Technician not found');

    const service = await prisma.service.findFirst({
      where: { id: input.serviceId, technicianId: tech.id, isActive: true },
      include: { addOns: true },
    });
    if (!service) throw ApiError.notFound('Service not found for this technician');

    const addOns = service.addOns.filter((a) => input.addOnIds.includes(a.id));
    const durationMinutes = service.durationMinutes + addOns.reduce((s, a) => s + a.durationMinutes, 0);
    const totalCents = service.priceCents + addOns.reduce((s, a) => s + a.priceCents, 0);

    const startAt = input.startAt;
    const endAt = new Date(startAt.getTime() + durationMinutes * 60000);
    if (startAt <= new Date()) throw ApiError.badRequest('Appointment must be in the future');

    // Layer 1 — must be an offered slot.
    const dateISO = DateTime.fromJSDate(startAt).setZone(tech.timezone).toISODate()!;
    const { windows, blockedTimes, appointments } = await availabilityRepository.getSlotInputs(tech.id, dateISO, tech.timezone);
    const slots = computeSlotsForDate(dateISO, durationMinutes, windows, blockedTimes, appointments, {
      timezone: tech.timezone,
      bufferMinutes: tech.bufferMinutes,
      slotIntervalMinutes: tech.slotIntervalMinutes,
      minLeadMinutes: 30,
    });
    const requested = startAt.toISOString();
    if (!slots.some((s) => new Date(s.startAt).toISOString() === requested)) {
      throw ApiError.conflict('That time is not available. Please pick one of the offered slots.');
    }

    const paymentData = await paymentsService.createIntentData(totalCents);

    // Layers 2 + 3.
    return prisma.$transaction(
      async (tx) => {
        const [techClash, customerClash] = await Promise.all([
          tx.appointment.findFirst({
            where: { technicianId: tech.id, status: { in: ACTIVE }, startAt: { lt: endAt }, endAt: { gt: startAt } },
          }),
          tx.appointment.findFirst({
            where: { customerId, status: { in: ACTIVE }, startAt: { lt: endAt }, endAt: { gt: startAt } },
          }),
        ]);
        if (techClash) throw ApiError.conflict('That time slot was just booked. Please pick another slot.');
        if (customerClash) throw ApiError.conflict('You already have an appointment that overlaps this time.');

        return tx.appointment.create({
          data: {
            customerId,
            technicianId: tech.id,
            startAt,
            endAt,
            status: tech.autoApprove ? AppointmentStatus.CONFIRMED : AppointmentStatus.PENDING,
            totalCents,
            customerNote: input.customerNote,
            services: {
              create: {
                serviceId: service.id,
                name: service.name,
                priceCents: service.priceCents,
                durationMinutes: service.durationMinutes,
                addOns: addOns.length ? addOns.map((a) => ({ name: a.name, priceCents: a.priceCents, durationMinutes: a.durationMinutes })) : undefined,
              },
            },
            payment: { create: paymentData },
          },
          include: APPT_INCLUDE,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  },

  async getById(id: string, requester: { id: string; role: Role }) {
    const appt = await prisma.appointment.findUnique({ where: { id }, include: APPT_INCLUDE });
    if (!appt) throw ApiError.notFound('Appointment not found');

    if (requester.role === Role.ADMIN) return appt;
    if (requester.role === Role.CUSTOMER && appt.customerId === requester.id) return appt;
    if (requester.role === Role.TECHNICIAN) {
      const profile = await getOwnTechnicianProfile(requester.id);
      if (appt.technicianId === profile.id) return appt;
    }
    throw ApiError.forbidden();
  },

  async listForCustomer(customerId: string, scope: 'upcoming' | 'past' | 'all', p: PageParams) {
    const now = new Date();
    const where: Prisma.AppointmentWhereInput = { customerId };
    if (scope === 'upcoming') { where.startAt = { gte: now }; where.status = { in: ACTIVE }; }
    if (scope === 'past') where.OR = [{ startAt: { lt: now } }, { status: { in: [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW] } }];

    const [items, total] = await Promise.all([
      prisma.appointment.findMany({ where, include: APPT_INCLUDE, orderBy: { startAt: scope === 'past' ? 'desc' : 'asc' }, skip: p.skip, take: p.take }),
      prisma.appointment.count({ where }),
    ]);
    return paginate(items, total, p);
  },

  async listForTechnician(userId: string, opts: { status?: AppointmentStatus; from?: Date; to?: Date }, p: PageParams) {
    const profile = await getOwnTechnicianProfile(userId);
    const where: Prisma.AppointmentWhereInput = { technicianId: profile.id };
    if (opts.status) where.status = opts.status;
    if (opts.from || opts.to) where.startAt = { ...(opts.from && { gte: opts.from }), ...(opts.to && { lte: opts.to }) };

    const [items, total] = await Promise.all([
      prisma.appointment.findMany({ where, include: APPT_INCLUDE, orderBy: { startAt: 'asc' }, skip: p.skip, take: p.take }),
      prisma.appointment.count({ where }),
    ]);
    return paginate(items, total, p);
  },

  // ---------- Status transitions ----------

  async cancelByCustomer(customerId: string, id: string, reason?: string) {
    const appt = await prisma.appointment.findUnique({ where: { id }, include: { payment: true } });
    if (!appt || appt.customerId !== customerId) throw ApiError.notFound('Appointment not found');
    if (!ACTIVE.includes(appt.status)) throw ApiError.badRequest('Only pending or confirmed appointments can be cancelled');

    return prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: reason,
        cancelledBy: Role.CUSTOMER,
        payment: appt.payment?.status === PaymentStatus.PAID ? { update: paymentsService.markRefunded() } : undefined,
      },
      include: APPT_INCLUDE,
    });
  },

  async technicianTransition(
    userId: string,
    id: string,
    action: 'confirm' | 'reject' | 'cancel' | 'complete' | 'no_show',
    reason?: string
  ) {
    const profile = await getOwnTechnicianProfile(userId);
    const appt = await prisma.appointment.findUnique({ where: { id }, include: { payment: true } });
    if (!appt || appt.technicianId !== profile.id) throw ApiError.notFound('Appointment not found');

    const transitions: Record<string, { from: AppointmentStatus[]; to: AppointmentStatus }> = {
      confirm: { from: [AppointmentStatus.PENDING], to: AppointmentStatus.CONFIRMED },
      reject: { from: [AppointmentStatus.PENDING], to: AppointmentStatus.CANCELLED },
      cancel: { from: ACTIVE, to: AppointmentStatus.CANCELLED },
      complete: { from: [AppointmentStatus.CONFIRMED], to: AppointmentStatus.COMPLETED },
      no_show: { from: [AppointmentStatus.CONFIRMED], to: AppointmentStatus.NO_SHOW },
    };
    const t = transitions[action];
    if (!t.from.includes(appt.status)) {
      throw ApiError.badRequest(`Cannot ${action} an appointment with status ${appt.status}`);
    }
    if (action === 'complete' && appt.startAt > new Date()) {
      throw ApiError.badRequest('Cannot complete an appointment before it starts');
    }

    const refund = (action === 'reject' || action === 'cancel') && appt.payment?.status === PaymentStatus.PAID;
    const capture = action === 'complete' && appt.payment?.status === PaymentStatus.REQUIRES_PAYMENT;

    return prisma.appointment.update({
      where: { id },
      data: {
        status: t.to,
        cancellationReason: t.to === AppointmentStatus.CANCELLED ? reason : undefined,
        cancelledBy: t.to === AppointmentStatus.CANCELLED ? Role.TECHNICIAN : undefined,
        payment: refund
          ? { update: paymentsService.markRefunded() }
          : capture
            ? { update: paymentsService.markPaid() }
            : undefined,
      },
      include: APPT_INCLUDE,
    });
  },

  /** Placeholder checkout: marks the payment as paid (Stripe Elements later). */
  async payPlaceholder(customerId: string, id: string) {
    const appt = await prisma.appointment.findUnique({ where: { id }, include: { payment: true } });
    if (!appt || appt.customerId !== customerId) throw ApiError.notFound('Appointment not found');
    if (!appt.payment) throw ApiError.badRequest('No payment attached to this appointment');
    if (appt.payment.status === PaymentStatus.PAID) return appt;

    return prisma.appointment.update({
      where: { id },
      data: { payment: { update: paymentsService.markPaid() } },
      include: APPT_INCLUDE,
    });
  },

  /** Technician earnings summary (placeholder — real payouts via Stripe Connect). */
  async earnings(userId: string) {
    const profile = await getOwnTechnicianProfile(userId);
    const completed = await prisma.appointment.aggregate({
      where: { technicianId: profile.id, status: AppointmentStatus.COMPLETED },
      _sum: { totalCents: true },
      _count: true,
    });
    const upcoming = await prisma.appointment.aggregate({
      where: { technicianId: profile.id, status: { in: ACTIVE }, startAt: { gte: new Date() } },
      _sum: { totalCents: true },
      _count: true,
    });
    return {
      completedCount: completed._count,
      completedCents: completed._sum.totalCents ?? 0,
      upcomingCount: upcoming._count,
      projectedCents: upcoming._sum.totalCents ?? 0,
      note: 'Placeholder — production payouts arrive via Stripe Connect.',
    };
  },
};
