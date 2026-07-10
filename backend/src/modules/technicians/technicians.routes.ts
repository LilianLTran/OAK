import { Router } from 'express';
import { asyncHandler } from '../../utils/errors';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { portfolioSchema, searchSchema, updateProfileSchema } from './technicians.schemas';
import { technicianService } from './technicians.service';

export const technicianRoutes = Router();

/** Public availability-aware search. */
technicianRoutes.get(
  '/search',
  validate(searchSchema),
  asyncHandler(async (req, res) => {
    res.json(await technicianService.search(req.query as never));
  })
);

/** Technician: own profile (must precede '/:id'). */
technicianRoutes.get(
  '/me',
  authenticate,
  authorize('TECHNICIAN'),
  asyncHandler(async (req, res) => {
    res.json(await technicianService.getMyProfile(req.user!.id));
  })
);

technicianRoutes.patch(
  '/me',
  authenticate,
  authorize('TECHNICIAN'),
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    res.json(await technicianService.updateMyProfile(req.user!.id, req.body));
  })
);

technicianRoutes.post(
  '/me/portfolio',
  authenticate,
  authorize('TECHNICIAN'),
  validate(portfolioSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await technicianService.addPortfolioImage(req.user!.id, req.body));
  })
);

technicianRoutes.delete(
  '/me/portfolio/:imageId',
  authenticate,
  authorize('TECHNICIAN'),
  asyncHandler(async (req, res) => {
    await technicianService.removePortfolioImage(req.user!.id, req.params.imageId);
    res.status(204).end();
  })
);

/** Public profile page. */
technicianRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await technicianService.getPublicProfile(req.params.id));
  })
);
