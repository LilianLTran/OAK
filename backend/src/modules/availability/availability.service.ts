import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/errors';
import { availabilityRepository } from './availability.repository';
import { computeSlotsForDate, Slot } from './availability.engine';

export const availabilityService = {
  /**
   * Public: bookable slots for a technician + service (+ add-ons) on a date.
   * Duration = service duration + add-on durations. Never returns slots that
   * collide with existing bookings, breaks, blocked time or buffers.
   */
  async getSlots(technicianId: string, dateISO: string, serviceId: string, addOnIds: string[] = []): Promise<{ slots: Slot[]; durationMinutes: number }> {
    const tech = await prisma.technicianProfile.findUnique({ where: { id: technicianId } });
    if (!tech || !tech.isPublished) throw ApiError.notFound('Technician not found');

    const service = await prisma.service.findFirst({
      where: { id: serviceId, technicianId, isActive: true },
      include: { addOns: true },
    });
    if (!service) throw ApiError.notFound('Service not found for this technician');

    const chosenAddOns = service.addOns.filter((a) => addOnIds.includes(a.id));
    const durationMinutes = service.durationMinutes + chosenAddOns.reduce((s, a) => s + a.durationMinutes, 0);

    const { windows, blockedTimes, appointments } = await availabilityRepository.getSlotInputs(technicianId, dateISO, tech.timezone);

    const slots = computeSlotsForDate(dateISO, durationMinutes, windows, blockedTimes, appointments, {
      timezone: tech.timezone,
      bufferMinutes: tech.bufferMinutes,
      slotIntervalMinutes: tech.slotIntervalMinutes,
      minLeadMinutes: 30,
    });
    return { slots, durationMinutes };
  },

  // ---------- Technician self-management ----------

  async getMySchedule(technicianId: string) {
    const [schedules, blockedTimes] = await Promise.all([
      prisma.availabilitySchedule.findMany({ where: { technicianId }, orderBy: [{ weekday: 'asc' }, { startMinutes: 'asc' }] }),
      prisma.blockedTime.findMany({ where: { technicianId, endAt: { gte: new Date() } }, orderBy: { startAt: 'asc' } }),
    ]);
    return { schedules, blockedTimes };
  },

  /** Replace the entire weekly schedule atomically. */
  async replaceSchedule(technicianId: string, windows: { weekday: number; startMinutes: number; endMinutes: number }[]) {
    for (const w of windows) {
      if (w.endMinutes <= w.startMinutes) throw ApiError.badRequest('Each window must end after it starts');
    }
    // Reject overlapping windows on the same weekday.
    const byDay = new Map<number, { startMinutes: number; endMinutes: number }[]>();
    for (const w of windows) {
      const list = byDay.get(w.weekday) ?? [];
      if (list.some((x) => w.startMinutes < x.endMinutes && x.startMinutes < w.endMinutes)) {
        throw ApiError.badRequest(`Overlapping windows on weekday ${w.weekday}`);
      }
      list.push(w);
      byDay.set(w.weekday, list);
    }

    await prisma.$transaction([
      prisma.availabilitySchedule.deleteMany({ where: { technicianId } }),
      prisma.availabilitySchedule.createMany({ data: windows.map((w) => ({ ...w, technicianId })) }),
    ]);
    return this.getMySchedule(technicianId);
  },

  async addBlockedTime(technicianId: string, input: { startAt: Date; endAt: Date; reason?: string }) {
    if (input.endAt <= input.startAt) throw ApiError.badRequest('endAt must be after startAt');
    return prisma.blockedTime.create({ data: { ...input, technicianId } });
  },

  async removeBlockedTime(technicianId: string, id: string) {
    const blocked = await prisma.blockedTime.findUnique({ where: { id } });
    if (!blocked || blocked.technicianId !== technicianId) throw ApiError.notFound('Blocked time not found');
    await prisma.blockedTime.delete({ where: { id } });
  },
};
