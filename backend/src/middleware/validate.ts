import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/errors';

/**
 * Zod validation middleware. Validates body/query/params against a schema of
 * shape z.object({ body?, query?, params? }) and replaces them with the
 * parsed (coerced, defaulted) values.
 */
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({ body: req.body, query: req.query, params: req.params });
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(ApiError.badRequest('Validation failed', err.flatten().fieldErrors));
      } else {
        next(err);
      }
    }
  };
}
