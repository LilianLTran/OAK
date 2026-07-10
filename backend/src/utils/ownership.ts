import { prisma } from '../lib/prisma';
import { ApiError } from './errors';

/** Resolve the technician profile owned by the authenticated user. */
export async function getOwnTechnicianProfile(userId: string) {
  const profile = await prisma.technicianProfile.findUnique({ where: { userId } });
  if (!profile) throw ApiError.forbidden('No technician profile for this account');
  return profile;
}
