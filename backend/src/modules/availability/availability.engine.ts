/**
 * Slot engine — pure functions, no I/O, unit-testable.
 *
 * Given a technician's weekly working windows, blocked times, existing
 * appointments, buffer and slot interval, computes bookable start times for a
 * service of a given duration on a given local date.
 *
 * All wall-clock math happens in the technician's timezone; results are UTC
 * instants. A slot is offered iff:
 *   - [start, start + duration) fits inside one working window
 *   - it does not overlap any blocked time
 *   - it does not overlap any active appointment expanded by the buffer
 *   - it starts in the future (+ lead time)
 */
import { DateTime, Interval } from 'luxon';

export interface WorkingWindow {
  weekday: number;      // 0 = Sunday … 6 = Saturday
  startMinutes: number; // minutes since local midnight
  endMinutes: number;
}

export interface TimeRange {
  startAt: Date;
  endAt: Date;
}

export interface SlotEngineConfig {
  timezone: string;
  bufferMinutes: number;
  slotIntervalMinutes: number;
  /** Don't offer slots starting sooner than this many minutes from now. */
  minLeadMinutes?: number;
}

export interface Slot {
  startAt: string;   // UTC ISO instant
  endAt: string;
  localLabel: string; // e.g. "9:00 AM" in the technician's timezone
}

/** Luxon weekday (1=Mon..7=Sun) -> our 0=Sun..6=Sat */
function toWeekday0Sun(dt: DateTime): number {
  return dt.weekday % 7;
}

export function computeSlotsForDate(
  dateISO: string, // 'YYYY-MM-DD' interpreted in the technician's timezone
  durationMinutes: number,
  windows: WorkingWindow[],
  blockedTimes: TimeRange[],
  activeAppointments: TimeRange[],
  config: SlotEngineConfig,
  now: Date = new Date()
): Slot[] {
  const day = DateTime.fromISO(dateISO, { zone: config.timezone }).startOf('day');
  if (!day.isValid || durationMinutes <= 0) return [];

  const weekday = toWeekday0Sun(day);
  const todaysWindows = windows
    .filter((w) => w.weekday === weekday && w.endMinutes > w.startMinutes)
    .sort((a, b) => a.startMinutes - b.startMinutes);
  if (todaysWindows.length === 0) return [];

  const step = Math.max(5, config.slotIntervalMinutes || 30);
  const buffer = Math.max(0, config.bufferMinutes || 0);
  const earliestStart = DateTime.fromJSDate(now).plus({ minutes: config.minLeadMinutes ?? 0 });

  // Appointments block their range expanded by the buffer on both sides so a
  // new booking always leaves `buffer` minutes of turnaround.
  const busy: Interval[] = [
    ...activeAppointments.map((a) =>
      Interval.fromDateTimes(
        DateTime.fromJSDate(a.startAt).minus({ minutes: buffer }),
        DateTime.fromJSDate(a.endAt).plus({ minutes: buffer })
      )
    ),
    ...blockedTimes.map((b) => Interval.fromDateTimes(DateTime.fromJSDate(b.startAt), DateTime.fromJSDate(b.endAt))),
  ].filter((i) => i.isValid);

  const slots: Slot[] = [];
  for (const w of todaysWindows) {
    const windowStart = day.plus({ minutes: w.startMinutes });
    const lastStart = day.plus({ minutes: w.endMinutes - durationMinutes });

    for (let cursor = windowStart; cursor <= lastStart; cursor = cursor.plus({ minutes: step })) {
      if (cursor < earliestStart) continue;
      const candidate = Interval.after(cursor, { minutes: durationMinutes });
      if (busy.some((b) => b.overlaps(candidate))) continue;
      slots.push({
        startAt: cursor.toUTC().toISO()!,
        endAt: cursor.plus({ minutes: durationMinutes }).toUTC().toISO()!,
        localLabel: cursor.setZone(config.timezone).toFormat('h:mm a'),
      });
    }
  }
  return slots;
}

/**
 * True if the technician has at least one slot on `dateISO` starting at
 * `timeHHmm` ± `toleranceMinutes` (used by search's "at or near" matching).
 * When timeHHmm is omitted, any slot that day matches.
 */
export function hasSlotNear(
  slots: Slot[],
  timezone: string,
  dateISO: string,
  timeHHmm?: string,
  toleranceMinutes = 60
): boolean {
  if (slots.length === 0) return false;
  if (!timeHHmm) return true;
  const target = DateTime.fromISO(`${dateISO}T${timeHHmm}`, { zone: timezone });
  if (!target.isValid) return true;
  return slots.some((s) => {
    const diff = Math.abs(DateTime.fromISO(s.startAt).diff(target, 'minutes').minutes);
    return diff <= toleranceMinutes;
  });
}

/** Overlap test used by the booking service's transactional re-check. */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
