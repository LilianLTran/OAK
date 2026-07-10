import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/errors';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { getOwnTechnicianProfile } from '../../utils/ownership';
import { availabilityService } from './availability.service';

export const availabilityRoutes = Router();

const slotsSchema = z.object({
  params: z.object({ technicianId: z.string() }),
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    serviceId: z.string(),
    addOnIds: z.string().optional(), // comma-separated
  }),
});

/** Public: available slots for technician + service on a date. */
availabilityRoutes.get(
  '/:technicianId/slots',
  validate(slotsSchema),
  asyncHandler(async (req, res) => {
    const addOnIds = req.query.addOnIds ? String(req.query.addOnIds).split(',').filter(Boolean) : [];
    const result = await availabilityService.getSlots(
      req.params.technicianId,
      String(req.query.date),
      String(req.query.serviceId),
      addOnIds
    );
    res.json(result);
  })
);

// ---------- Technician self-management (auth required) ----------

availabilityRoutes.get(
  '/me/schedule',
  authenticate,
  authorize('TECHNICIAN'),
  asyncHandler(async (req, res) => {
    const profile = await getOwnTechnicianProfile(req.user!.id);
    res.json(await availabilityService.getMySchedule(profile.id));
  })
);

const scheduleSchema = z.object({
  body: z.object({
    windows: z
      .array(
        z.object({
          weekday: z.number().int().min(0).max(6),
          startMinutes: z.number().int().min(0).max(1439),
          endMinutes: z.number().int().min(1).max(1440),
        })
      )
      .max(50),
  }),
});

availabilityRoutes.put(
  '/me/schedule',
  authenticate,
  authorize('TECHNICIAN'),
  validate(scheduleSchema),
  asyncHandler(async (req, res) => {
    const profile = await getOwnTechnicianProfile(req.user!.id);
    res.json(await availabilityService.replaceSchedule(profile.id, req.body.windows));
  })
);

const blockedSchema = z.object({
  body: z.object({
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    reason: z.string().max(200).optional(),
  }),
});

availabilityRoutes.post(
  '/me/blocked',
  authenticate,
  authorize('TECHNICIAN'),
  validate(blockedSchema),
  asyncHandler(async (req, res) => {
    const profile = await getOwnTechnicianProfile(req.user!.id);
    res.status(201).json(await availabilityService.addBlockedTime(profile.id, req.body));
  })
);

availabilityRoutes.delete(
  '/me/blocked/:id',
  authenticate,
  authorize('TECHNICIAN'),
  asyncHandler(async (req, res) => {
    const profile = await getOwnTechnicianProfile(req.user!.id);
    await availabilityService.removeBlockedTime(profile.id, req.params.id);
    res.status(204).end();
  })
);
