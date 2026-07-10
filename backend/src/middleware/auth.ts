import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/errors';

export interface AuthUser {
  id: string;
  role: Role;
  email: string;
}

// Augment Express' Request with the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface JwtPayload {
  sub: string;
  role: Role;
  email: string;
}

export function signToken(user: { id: string; role: Role; email: string }): string {
  const payload: JwtPayload = { sub: user.id, role: user.role, email: user.email };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

/** Requires a valid Bearer token; rejects suspended accounts. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw ApiError.unauthorized();
    const token = header.slice(7);

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    } catch {
      throw ApiError.unauthorized('Invalid or expired token');
    }

    // Re-check the account on every request so suspensions apply immediately.
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw ApiError.unauthorized('Account no longer exists');
    if (user.isSuspended) throw ApiError.forbidden('This account has been suspended');

    req.user = { id: user.id, role: user.role, email: user.email };
    next();
  } catch (err) {
    next(err);
  }
}

/** Role gate. Usage: router.get('/x', authenticate, authorize('ADMIN'), …) */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
}

/** Attaches user if a token is present, but never rejects. */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.headers.authorization) return next();
  return authenticate(req, res, (err?: unknown) => next(err instanceof ApiError && err.statusCode === 401 ? undefined : (err as never)));
}
