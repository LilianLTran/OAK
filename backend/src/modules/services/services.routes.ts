import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/errors';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { servicesService } from './services.service';

export const serviceRoutes = Router();

const addOnInput = z.object({
  name: z.string().min(1).max(100),
  priceCents: z.number().int().min(0),
  durationMinutes: z.number().int().min(0).max(240).default(0),
});

const createServiceSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(1000).default(''),
    durationMinutes: z.number().int().min(15).max(480),
    priceCents: z.number().int().min(0),
    category: z.string().min(1).max(50),
    addOns: z.array(addOnInput).max(20).default([]),
  }),
});

const updateServiceSchema = z.object({
  body: createServiceSchema.shape.body.partial().extend({
    isActive: z.boolean().optional(),
  }),
});

serviceRoutes.get(
  '/me',
  authenticate,
  authorize('TECHNICIAN'),
  asyncHandler(async (req, res) => {
    res.json(await servicesService.listMine(req.user!.id));
  })
);

serviceRoutes.post(
  '/',
  authenticate,
  authorize('TECHNICIAN'),
  validate(createServiceSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await servicesService.create(req.user!.id, req.body));
  })
);

serviceRoutes.patch(
  '/:id',
  authenticate,
  authorize('TECHNICIAN'),
  validate(updateServiceSchema),
  asyncHandler(async (req, res) => {
    res.json(await servicesService.update(req.user!.id, req.params.id, req.body));
  })
);

serviceRoutes.delete(
  '/:id',
  authenticate,
  authorize('TECHNICIAN'),
  asyncHandler(async (req, res) => {
    await servicesService.deactivate(req.user!.id, req.params.id);
    res.status(204).end();
  })
);
