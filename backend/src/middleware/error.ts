import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/errors';
import { logger } from '../lib/logger';
import { env } from '../config/env';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // Postgres EXCLUDE constraint violations surface as raw query errors —
  // translate the double-booking constraints into a friendly 409.
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('technician_no_overlap') || message.includes('customer_no_overlap')) {
    return res.status(409).json({
      error: { code: 'SLOT_TAKEN', message: 'That time slot was just booked. Please pick another slot.' },
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { code: err.code ?? 'ERROR', message: err.message, details: err.details },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with that value already exists.' } });
    if (err.code === 'P2025') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found.' } });
  }

  logger.error('Unhandled error', { path: req.path, message, stack: err instanceof Error ? err.stack : undefined });
  return res.status(500).json({
    error: { code: 'INTERNAL', message: env.isProd ? 'Something went wrong.' : message },
  });
}
