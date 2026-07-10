import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/errors';
import { availabilityRepository } from '../availability/availability.repository';
import { computeSlotsForDate, hasSlotNear, Slot } from '../availability/availability.engine';

const PUBLIC_TECH_INCLUDE = {
  user: { select: { firstName: true, lastName: true } },
  services: { where: { isActive: true }, include: { addOns: true }, orderBy: { priceCents: 'asc' as const } },
  portfolioImages: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.TechnicianProfileInclude;

export interface SearchFilters {
  date?: string;
  time?: string;
  city?: string;
  state?: string;
  service?: string;
  priceMin?: number; // dollars
  priceMax?: number;
  minRating?: number;
  name?: string;
  page: number;
  pageSize: number;
}

export const technicianService = {
  async getPublicProfile(id: string) {
    const tech = await prisma.technicianProfile.findFirst({
      where: { id, isPublished: true, user: { isSuspended: false } },
      include: {
        ...PUBLIC_TECH_INCLUDE,
        reviews: {
          where: { isHidden: false },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { customer: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    if (!tech) throw ApiError.notFound('Technician not found');
    return tech;
  },

  async getMyProfile(userId: string) {
    const tech = await prisma.technicianProfile.findUnique({
      where: { userId },
      include: PUBLIC_TECH_INCLUDE,
    });
    if (!tech) throw ApiError.forbidden('No technician profile for this account');
    return tech;
  },

  /** Technicians can only edit their own profile (enforced by userId lookup). */
  async updateMyProfile(userId: string, data: Prisma.TechnicianProfileUpdateInput) {
    const existing = await prisma.technicianProfile.findUnique({ where: { userId } });
    if (!existing) throw ApiError.forbidden('No technician profile for this account');
    return prisma.technicianProfile.update({ where: { userId }, data, include: PUBLIC_TECH_INCLUDE });
  },

  // ---------- Portfolio ----------

  async addPortfolioImage(userId: string, input: { url: string; caption?: string; sortOrder?: number }) {
    const profile = await prisma.technicianProfile.findUnique({ where: { userId } });
    if (!profile) throw ApiError.forbidden('No technician profile for this account');
    return prisma.portfolioImage.create({ data: { ...input, technicianId: profile.id } });
  },

  async removePortfolioImage(userId: string, imageId: string) {
    const profile = await prisma.technicianProfile.findUnique({ where: { userId } });
    if (!profile) throw ApiError.forbidden('No technician profile for this account');
    const image = await prisma.portfolioImage.findUnique({ where: { id: imageId } });
    if (!image || image.technicianId !== profile.id) throw ApiError.notFound('Image not found');
    await prisma.portfolioImage.delete({ where: { id: imageId } });
  },

  // ---------- Search ----------

  /**
   * Availability-aware search. Filters technicians in SQL first (location,
   * service, price, rating, name), then — when a date is requested — runs the
   * slot engine per candidate and drops anyone without a matching open slot.
   * Only technicians who can actually take the appointment are returned.
   */
  async search(f: SearchFilters) {
    const where: Prisma.TechnicianProfileWhereInput = {
      isPublished: true,
      user: { isSuspended: false },
    };

    if (f.city) where.city = { contains: f.city, mode: 'insensitive' };
    if (f.state) where.state = { contains: f.state, mode: 'insensitive' };
    if (f.minRating !== undefined) where.avgRating = { gte: f.minRating };
    if (f.name) {
      where.OR = [
        { salonName: { contains: f.name, mode: 'insensitive' } },
        { user: { isSuspended: false, firstName: { contains: f.name, mode: 'insensitive' } } },
        { user: { isSuspended: false, lastName: { contains: f.name, mode: 'insensitive' } } },
      ];
    }

    // Service filter: technician must offer a matching, active service.
    const serviceWhere: Prisma.ServiceWhereInput = { isActive: true };
    if (f.service) {
      serviceWhere.OR = [
        { name: { contains: f.service, mode: 'insensitive' } },
        { category: { contains: f.service, mode: 'insensitive' } },
      ];
    }
    if (f.priceMin !== undefined) serviceWhere.priceCents = { gte: Math.round(f.priceMin * 100) };
    if (f.priceMax !== undefined) {
      serviceWhere.priceCents = {
        ...(serviceWhere.priceCents as object | undefined),
        lte: Math.round(f.priceMax * 100),
      };
    }
    const hasServiceFilter = !!(f.service || f.priceMin !== undefined || f.priceMax !== undefined);
    if (hasServiceFilter) where.services = { some: serviceWhere };

    // SQL pass. Cap candidates: the slot engine runs in-process per candidate.
    const candidates = await prisma.technicianProfile.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true } },
        services: { where: hasServiceFilter ? serviceWhere : { isActive: true }, include: { addOns: true } },
        portfolioImages: { orderBy: { sortOrder: 'asc' }, take: 4 },
      },
      orderBy: [{ avgRating: 'desc' }, { reviewCount: 'desc' }],
      take: 200,
    });

    // Availability pass.
    type Candidate = (typeof candidates)[number] & { availableSlots?: Slot[] };
    let results: Candidate[] = candidates;

    if (f.date) {
      const checked = await Promise.all(
        candidates.map(async (tech) => {
          // Use the matched service with the SHORTEST duration: if that can't
          // fit, no matched service fits at the requested time.
          const service = [...tech.services].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];
          if (!service) return null;

          const { windows, blockedTimes, appointments } = await availabilityRepository.getSlotInputs(tech.id, f.date!, tech.timezone);
          const slots = computeSlotsForDate(f.date!, service.durationMinutes, windows, blockedTimes, appointments, {
            timezone: tech.timezone,
            bufferMinutes: tech.bufferMinutes,
            slotIntervalMinutes: tech.slotIntervalMinutes,
            minLeadMinutes: 30,
          });
          if (!hasSlotNear(slots, tech.timezone, f.date!, f.time, 60)) return null;
          return Object.assign(tech, { availableSlots: slots.slice(0, 6) }) as Candidate;
        })
      );
      results = checked.filter((t): t is Candidate => t !== null);
    }

    const total = results.length;
    const start = (f.page - 1) * f.pageSize;
    return {
      items: results.slice(start, start + f.pageSize),
      page: f.page,
      pageSize: f.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / f.pageSize)),
    };
  },
};
