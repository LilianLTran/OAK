import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/errors';
import { PageParams, paginate } from '../../utils/pagination';

/** Recompute the denormalized rating cache after any review write. */
export async function refreshRatingCache(technicianId: string) {
  const agg = await prisma.review.aggregate({
    where: { technicianId, isHidden: false },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.technicianProfile.update({
    where: { id: technicianId },
    data: { avgRating: Math.round((agg._avg.rating ?? 0) * 100) / 100, reviewCount: agg._count },
  });
}

export const reviewsService = {
  async create(customerId: string, input: { appointmentId: string; rating: number; comment: string; photoUrls: string[] }) {
    const appt = await prisma.appointment.findUnique({
      where: { id: input.appointmentId },
      include: { review: true },
    });
    if (!appt || appt.customerId !== customerId) throw ApiError.notFound('Appointment not found');
    // Business rule: only completed appointments can be reviewed.
    if (appt.status !== AppointmentStatus.COMPLETED) {
      throw ApiError.badRequest('You can only review completed appointments');
    }
    if (appt.review) throw ApiError.conflict('This appointment already has a review');

    const review = await prisma.review.create({
      data: {
        appointmentId: appt.id,
        customerId,
        technicianId: appt.technicianId,
        rating: input.rating,
        comment: input.comment,
        photoUrls: input.photoUrls,
      },
    });
    await refreshRatingCache(appt.technicianId);
    return review;
  },

  async listMine(customerId: string, p: PageParams) {
    const where = { customerId };
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { technician: { select: { id: true, salonName: true, user: { select: { firstName: true, lastName: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.take,
      }),
      prisma.review.count({ where }),
    ]);
    return paginate(items, total, p);
  },

  async listForTechnician(technicianId: string, p: PageParams) {
    const where = { technicianId, isHidden: false };
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { customer: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.take,
      }),
      prisma.review.count({ where }),
    ]);
    return paginate(items, total, p);
  },
};
