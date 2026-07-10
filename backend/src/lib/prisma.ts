import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

/** Single shared Prisma client (avoids connection storms in dev reloads). */
export const prisma = new PrismaClient({
  log: env.isProd ? ['error'] : ['warn', 'error'],
});
