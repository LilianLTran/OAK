import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/errors';
import { signToken } from '../../middleware/auth';
import { LoginInput, RegisterInput } from './auth.schemas';

const PUBLIC_USER_SELECT = {
  id: true, email: true, firstName: true, lastName: true, phone: true, role: true, createdAt: true,
} as const;

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: input.role as Role,
        // Technicians get an empty profile immediately so they can start
        // filling it in; it stays unpublished until they publish it.
        technicianProfile: input.role === 'TECHNICIAN' ? { create: { isPublished: false } } : undefined,
      },
      select: { ...PUBLIC_USER_SELECT, technicianProfile: { select: { id: true } } },
    });

    const token = signToken({ id: user.id, role: user.role, email: user.email });
    return { user, token };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { technicianProfile: { select: { id: true } } },
    });
    if (!user) throw ApiError.unauthorized('Invalid email or password');
    if (user.isSuspended) throw ApiError.forbidden('This account has been suspended');

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw ApiError.unauthorized('Invalid email or password');

    const token = signToken({ id: user.id, role: user.role, email: user.email });
    const { passwordHash: _ph, ...safe } = user;
    return { user: safe, token };
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ...PUBLIC_USER_SELECT, isSuspended: true, technicianProfile: { select: { id: true, isPublished: true } } },
    });
    if (!user) throw ApiError.notFound('User not found');
    return user;
  },
};
