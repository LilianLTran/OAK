import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/errors';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { getPageParams } from '../../utils/pagination';
import { reviewsService } from './reviews.service';

export const reviewRoutes = Router();

const createReviewSchema = z.object({
  body: z.object({
    appointmentId: z.string(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).default(''),
    photoUrls: z.array(z.string().url()).max(6).default([]),
  }),
});

reviewRoutes.post(
  '/',
  authenticate,
  authorize('CUSTOMER'),
  validate(createReviewSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await reviewsService.create(req.user!.id, req.body));
  })
);

reviewRoutes.get(
  '/mine',
  authenticate,
  authorize('CUSTOMER'),
  asyncHandler(async (req, res) => {
    res.json(await reviewsService.listMine(req.user!.id, getPageParams(req)));
  })
);

/** Public: reviews for a technician. */
reviewRoutes.get(
  '/technician/:technicianId',
  asyncHandler(async (req, res) => {
    res.json(await reviewsService.listForTechnician(req.params.technicianId, getPageParams(req)));
  })
);
