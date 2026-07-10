import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    phone: z.string().max(30).optional(),
    role: z.enum(['CUSTOMER', 'TECHNICIAN']).default('CUSTOMER'), // ADMIN is never self-service
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
