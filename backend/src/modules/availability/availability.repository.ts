import { AppointmentStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { prisma } from '../../lib/prisma';

/** Data access for slot computation — everything the engine needs for one day. */
export const availabilityRepository = {
  async getSlotInputs(technicianId: string, dateISO: string, timezone: string) {
    const dayStart = DateTime.fromISO(dateISO, { zone: timezone }).startOf('day');
    const dayEnd = dayStart.endOf('day');

    const [windows, blockedTimes, appointments] = await Promise.all([
      prisma.availabilitySchedule.findMany({ where: { technicianId } }),
      prisma.blockedTime.findMany({
        where: {
          technicianId,
          startAt: { lt: dayEnd.toJSDate() },
          endAt: { gt: dayStart.toJSDate() },
        },
      }),
      prisma.appointment.findMany({
        where: {
          technicianId,
          status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
          startAt: { lt: dayEnd.toJSDate() },
          endAt: { gt: dayStart.toJSDate() },
        },
        select: { startAt: true, endAt: true },
      }),
    ]);

    return { windows, blockedTimes, appointments };
  },
};
