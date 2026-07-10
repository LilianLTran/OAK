import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/errors';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { usersService } from './users.service';

export const userRoutes = Router();

userRoutes.use(authenticate);

const updateMeSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    phone: z.string().max(30).nullable().optional(),
  }),
});

userRoutes.patch(
  '/me',
  validate(updateMeSchema),
  asyncHandler(async (req, res) => {
    res.json(await usersService.updateMe(req.user!.id, req.body));
  })
);

// ---------- Favorites (customers) ----------

userRoutes.get(
  '/me/favorites',
  authorize('CUSTOMER'),
  asyncHandler(async (req, res) => {
    res.json(await usersService.listFavorites(req.user!.id));
  })
);

userRoutes.post(
  '/me/favorites/:technicianId',
  authorize('CUSTOMER'),
  asyncHandler(async (req, res) => {
    res.status(201).json(await usersService.addFavorite(req.user!.id, req.params.technicianId));
  })
);

userRoutes.delete(
  '/me/favorites/:technicianId',
  authorize('CUSTOMER'),
  asyncHandler(async (req, res) => {
    await usersService.removeFavorite(req.user!.id, req.params.technicianId);
    res.status(204).end();
  })
);
