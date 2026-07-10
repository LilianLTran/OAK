import { NextFunction, Request, RequestHandler, Response } from 'express';

/** Operational error with an HTTP status. Anything else is treated as a 500. */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(msg: string, details?: unknown) { return new ApiError(400, msg, 'BAD_REQUEST', details); }
  static unauthorized(msg = 'Authentication required') { return new ApiError(401, msg, 'UNAUTHORIZED'); }
  static forbidden(msg = 'You do not have permission to do that') { return new ApiError(403, msg, 'FORBIDDEN'); }
  static notFound(msg = 'Resource not found') { return new ApiError(404, msg, 'NOT_FOUND'); }
  static conflict(msg: string) { return new ApiError(409, msg, 'CONFLICT'); }
}

/** Wraps async route handlers so rejections reach the error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
