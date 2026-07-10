import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/errors';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { getPageParams } from '../../utils/pagination';
import { adminService } from './admin.service';

export const adminRoutes = Router();

// Every admin route requires the ADMIN role.
adminRoutes.use(authenticate, authorize('ADMIN'));

adminRoutes.get('/stats', asyncHandler(async (_req, res) => res.json(await adminService.stats())));

adminRoutes.get(
  '/users',
  asyncHandler(async (req, res) => {
    res.json(await adminService.listUsers({
      role: req.query.role ? String(req.query.role) : undefined,
      q: req.query.q ? String(req.query.q) : undefined,
    }, getPageParams(req)));
  })
);

const suspendSchema = z.object({ body: z.object({ suspended: z.boolean() }) });
adminRoutes.post(
  '/users/:id/suspend',
  validate(suspendSchema),
  asyncHandler(async (req, res) => {
    res.json(await adminService.setSuspended(req.params.id, req.body.suspended));
  })
);

adminRoutes.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    await adminService.removeUser(req.params.id);
    res.status(204).end();
  })
);

adminRoutes.get(
  '/appointments',
  asyncHandler(async (req, res) => {
    res.json(await adminService.listAppointments(req.query.status ? String(req.query.status) : undefined, getPageParams(req)));
  })
);

adminRoutes.get(
  '/reviews',
  asyncHandler(async (req, res) => {
    res.json(await adminService.listReviews(getPageParams(req)));
  })
);

const hideSchema = z.object({ body: z.object({ hidden: z.boolean() }) });
adminRoutes.post(
  '/reviews/:id/hide',
  validate(hideSchema),
  asyncHandler(async (req, res) => {
    res.json(await adminService.setReviewHidden(req.params.id, req.body.hidden));
  })
);

adminRoutes.get('/settings', asyncHandler(async (_req, res) => res.json(await adminService.getSettings())));

const settingsSchema = z.object({ body: z.object({ settings: z.record(z.string(), z.string()) }) });
adminRoutes.put(
  '/settings',
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    res.json(await adminService.updateSettings(req.body.settings));
  })
);
