import { AppointmentStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/errors';
import { PageParams, paginate } from '../../utils/pagination';
import { refreshRatingCache } from '../reviews/reviews.service';

export const adminService = {
  /** Basic analytics for the dashboard. */
  async stats() {
    const [users, technicians, customers, appointments, completed, upcoming, reviews, revenue] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.TECHNICIAN } }),
      prisma.user.count({ where: { role: Role.CUSTOMER } }),
      prisma.appointment.count(),
      prisma.appointment.count({ where: { status: AppointmentStatus.COMPLETED } }),
      prisma.appointment.count({ where: { status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] }, startAt: { gte: new Date() } } }),
      prisma.review.count(),
      prisma.appointment.aggregate({ where: { status: AppointmentStatus.COMPLETED }, _sum: { totalCents: true } }),
    ]);
    return {
      users, technicians, customers, appointments,
      completedAppointments: completed, upcomingAppointments: upcoming,
      reviews, grossRevenueCents: revenue._sum.totalCents ?? 0,
    };
  },

  async listUsers(filters: { role?: string; q?: string }, p: PageParams) {
    const where: Prisma.UserWhereInput = {};
    if (filters.role && ['CUSTOMER', 'TECHNICIAN', 'ADMIN'].includes(filters.role)) where.role = filters.role as Role;
    if (filters.q) {
      where.OR = [
        { email: { contains: filters.q, mode: 'insensitive' } },
        { firstName: { contains: filters.q, mode: 'insensitive' } },
        { lastName: { contains: filters.q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, firstName: true, lastName: true, role: true,
          isSuspended: true, createdAt: true,
          technicianProfile: { select: { id: true, salonName: true, city: true, isPublished: true, avgRating: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: p.skip, take: p.take,
      }),
      prisma.user.count({ where }),
    ]);
    return paginate(items, total, p);
  },

  async setSuspended(userId: string, suspended: boolean) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');
    if (user.role === Role.ADMIN) throw ApiError.forbidden('Admins cannot be suspended');
    return prisma.user.update({
      where: { id: userId },
      data: { isSuspended: suspended },
      select: { id: true, email: true, isSuspended: true },
    });
  },

  /** Hard-remove a fake/spam account (cascades wipe dependent rows). */
  async removeUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');
    if (user.role === Role.ADMIN) throw ApiError.forbidden('Admins cannot be removed');
    await prisma.user.delete({ where: { id: userId } });
  },

  async listAppointments(status: string | undefined, p: PageParams) {
    const where: Prisma.AppointmentWhereInput = {};
    if (status && Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
      where.status = status as AppointmentStatus;
    }
    const [items, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          customer: { select: { firstName: true, lastName: true, email: true } },
          technician: { select: { salonName: true, user: { select: { firstName: true, lastName: true } } } },
          services: true,
          payment: { select: { status: true, amountCents: true } },
        },
        orderBy: { startAt: 'desc' },
        skip: p.skip, take: p.take,
      }),
      prisma.appointment.count({ where }),
    ]);
    return paginate(items, total, p);
  },

  async listReviews(p: PageParams) {
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        include: {
          customer: { select: { firstName: true, lastName: true } },
          technician: { select: { id: true, salonName: true, user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: p.skip, take: p.take,
      }),
      prisma.review.count(),
    ]);
    return paginate(items, total, p);
  },

  /** Moderation: hide/unhide instead of deleting (audit trail preserved). */
  async setReviewHidden(reviewId: string, hidden: boolean) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw ApiError.notFound('Review not found');
    const updated = await prisma.review.update({ where: { id: reviewId }, data: { isHidden: hidden } });
    await refreshRatingCache(review.technicianId);
    return updated;
  },

  async getSettings() {
    const rows = await prisma.platformSetting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },

  async updateSettings(settings: Record<string, string>) {
    for (const [key, value] of Object.entries(settings)) {
      await prisma.platformSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    return this.getSettings();
  },
};
