import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    bio: z.string().max(2000).optional(),
    salonName: z.string().max(100).nullable().optional(),
    locationType: z.enum(['SALON', 'MOBILE', 'BOTH']).optional(),
    address: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(50).optional(),
    zipCode: z.string().max(20).optional(),
    country: z.string().max(50).optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    profilePhotoUrl: z.string().url().nullable().optional(),
    coverImageUrl: z.string().url().nullable().optional(),
    yearsExperience: z.number().int().min(0).max(80).optional(),
    certifications: z.array(z.string().max(120)).max(20).optional(),
    timezone: z.string().max(60).optional(),
    autoApprove: z.boolean().optional(),
    bufferMinutes: z.number().int().min(0).max(240).optional(),
    slotIntervalMinutes: z.number().int().min(5).max(240).optional(),
    isPublished: z.boolean().optional(),
  }),
});

export const searchSchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:mm, technician-local
    city: z.string().max(100).optional(),
    state: z.string().max(50).optional(),
    service: z.string().max(100).optional(),  // matches service name or category
    priceMin: z.coerce.number().min(0).optional(),  // dollars
    priceMax: z.coerce.number().min(0).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    name: z.string().max(100).optional(),     // technician or salon name
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
  }),
});

export const portfolioSchema = z.object({
  body: z.object({
    url: z.string().url(),
    caption: z.string().max(200).optional(),
    sortOrder: z.number().int().min(0).default(0),
  }),
});
