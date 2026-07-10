import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';

import { authRoutes } from './modules/auth/auth.routes';
import { userRoutes } from './modules/users/users.routes';
import { technicianRoutes } from './modules/technicians/technicians.routes';
import { serviceRoutes } from './modules/services/services.routes';
import { availabilityRoutes } from './modules/availability/availability.routes';
import { appointmentRoutes } from './modules/appointments/appointments.routes';
import { reviewRoutes } from './modules/reviews/reviews.routes';
import { paymentRoutes } from './modules/payments/payments.routes';
import { adminRoutes } from './modules/admin/admin.routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  // Stripe webhooks must see the RAW body for signature verification, so the
  // payments router is mounted before the JSON parser.
  app.use('/api/payments', paymentRoutes);
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/technicians', technicianRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/availability', availabilityRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
