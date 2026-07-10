import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/errors';
import { getOwnTechnicianProfile } from '../../utils/ownership';

interface AddOnInput { name: string; priceCents: number; durationMinutes: number }
interface ServiceInput {
  name?: string; description?: string; durationMinutes?: number;
  priceCents?: number; category?: string; addOns?: AddOnInput[]; isActive?: boolean;
}

async function getOwnedService(userId: string, serviceId: string) {
  const profile = await getOwnTechnicianProfile(userId);
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  // Ownership rule: technicians can only touch their own services.
  if (!service || service.technicianId !== profile.id) throw ApiError.notFound('Service not found');
  return service;
}

export const servicesService = {
  async listMine(userId: string) {
    const profile = await getOwnTechnicianProfile(userId);
    return prisma.service.findMany({
      where: { technicianId: profile.id },
      include: { addOns: true },
      orderBy: { createdAt: 'asc' },
    });
  },

  async create(userId: string, input: Required<Omit<ServiceInput, 'isActive'>>) {
    const profile = await getOwnTechnicianProfile(userId);
    return prisma.service.create({
      data: {
        technicianId: profile.id,
        name: input.name,
        description: input.description,
        durationMinutes: input.durationMinutes,
        priceCents: input.priceCents,
        category: input.category,
        addOns: { create: input.addOns },
      },
      include: { addOns: true },
    });
  },

  async update(userId: string, serviceId: string, input: ServiceInput) {
    await getOwnedService(userId, serviceId);
    const { addOns, ...fields } = input;
    return prisma.$transaction(async (tx) => {
      if (addOns) {
        // Replace add-ons wholesale — simple and predictable for an MVP.
        await tx.serviceAddOn.deleteMany({ where: { serviceId } });
        await tx.serviceAddOn.createMany({ data: addOns.map((a) => ({ ...a, serviceId })) });
      }
      return tx.service.update({ where: { id: serviceId }, data: fields, include: { addOns: true } });
    });
  },

  /** Soft-delete: keeps appointment history intact. */
  async deactivate(userId: string, serviceId: string) {
    await getOwnedService(userId, serviceId);
    await prisma.service.update({ where: { id: serviceId }, data: { isActive: false } });
  },
};
