import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/errors';

export const usersService = {
  async updateMe(userId: string, data: { firstName?: string; lastName?: string; phone?: string | null }) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true },
    });
  },

  async listFavorites(customerId: string) {
    const favs = await prisma.favoriteTechnician.findMany({
      where: { customerId },
      include: {
        technician: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            services: { where: { isActive: true }, take: 3, orderBy: { priceCents: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return favs.map((f) => f.technician);
  },

  async addFavorite(customerId: string, technicianId: string) {
    const tech = await prisma.technicianProfile.findUnique({ where: { id: technicianId } });
    if (!tech) throw ApiError.notFound('Technician not found');
    return prisma.favoriteTechnician.upsert({
      where: { customerId_technicianId: { customerId, technicianId } },
      create: { customerId, technicianId },
      update: {},
    });
  },

  async removeFavorite(customerId: string, technicianId: string) {
    await prisma.favoriteTechnician.deleteMany({ where: { customerId, technicianId } });
  },
};
