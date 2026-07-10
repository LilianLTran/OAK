import { Router } from 'express';
import { asyncHandler } from '../../utils/errors';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { loginSchema, registerSchema } from './auth.schemas';
import { authService } from './auth.service';

export const authRoutes = Router();

authRoutes.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  })
);

authRoutes.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.json(result);
  })
);

// JWTs are stateless: logout is client-side token disposal. The endpoint
// exists so clients have a consistent call (and for future token blacklists).
authRoutes.post('/logout', (_req, res) => res.json({ ok: true }));

authRoutes.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await authService.me(req.user!.id));
  })
);
