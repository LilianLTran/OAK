import { Router } from 'express';
import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';
import { asyncHandler } from '../../utils/errors';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { getPageParams } from '../../utils/pagination';
import { appointmentsService } from './appointments.service';

export const appointmentRoutes = Router();

appointmentRoutes.use(authenticate);

const bookSchema = z.object({
  body: z.object({
    technicianId: z.string(),
    serviceId: z.string(),
    addOnIds: z.array(z.string()).max(20).default([]),
    startAt: z.coerce.date(),
    customerNote: z.string().max(500).optional(),
  }),
});

appointmentRoutes.post(
  '/',
  authorize('CUSTOMER'),
  validate(bookSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await appointmentsService.book(req.user!.id, req.body));
  })
);

appointmentRoutes.get(
  '/mine',
  authorize('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const scope = (['upcoming', 'past', 'all'].includes(String(req.query.scope)) ? String(req.query.scope) : 'all') as 'upcoming' | 'past' | 'all';
    res.json(await appointmentsService.listForCustomer(req.user!.id, scope, getPageParams(req)));
  })
);

appointmentRoutes.get(
  '/technician',
  authorize('TECHNICIAN'),
  asyncHandler(async (req, res) => {
    const status = req.query.status && Object.values(AppointmentStatus).includes(req.query.status as AppointmentStatus)
      ? (req.query.status as AppointmentStatus)
      : undefined;
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    res.json(await appointmentsService.listForTechnician(req.user!.id, { status, from, to }, getPageParams(req, 50)));
  })
);

appointmentRoutes.get(
  '/earnings',
  authorize('TECHNICIAN'),
  asyncHandler(async (req, res) => {
    res.json(await appointmentsService.earnings(req.user!.id));
  })
);

appointmentRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await appointmentsService.getById(req.params.id, req.user!));
  })
);

const reasonSchema = z.object({ body: z.object({ reason: z.string().max(300).optional() }).default({}) });

appointmentRoutes.post(
  '/:id/cancel',
  authorize('CUSTOMER'),
  validate(reasonSchema),
  asyncHandler(async (req, res) => {
    res.json(await appointmentsService.cancelByCustomer(req.user!.id, req.params.id, req.body.reason));
  })
);

appointmentRoutes.post(
  '/:id/pay',
  authorize('CUSTOMER'),
  asyncHandler(async (req, res) => {
    res.json(await appointmentsService.payPlaceholder(req.user!.id, req.params.id));
  })
);

// Technician transitions
for (const action of ['confirm', 'reject', 'cancel', 'complete', 'no_show'] as const) {
  appointmentRoutes.post(
    `/:id/${action === 'cancel' ? 'tech-cancel' : action.replace('_', '-')}`,
    authorize('TECHNICIAN'),
    validate(reasonSchema),
    asyncHandler(async (req, res) => {
      res.json(await appointmentsService.technicianTransition(req.user!.id, req.params.id, action, req.body.reason));
    })
  );
}
