/**
 * Full demo seed: 1 admin, 3 customers, 4 published technicians with
 * services, schedules, portfolios, past (completed + reviewed) and upcoming
 * appointments, favorites and payments.
 *
 * All demo accounts use the password: Password123!
 */
import { PrismaClient, Role, LocationType, AppointmentStatus, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();
const TZ = 'America/Los_Angeles';

function at(daysFromToday: number, hour: number, minute = 0): Date {
  return DateTime.now()
    .setZone(TZ)
    .plus({ days: daysFromToday })
    .set({ hour, minute, second: 0, millisecond: 0 })
    .toJSDate();
}

async function main() {
  console.log('Clearing existing data…');
  await prisma.$transaction([
    prisma.review.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.appointmentService.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.favoriteTechnician.deleteMany(),
    prisma.blockedTime.deleteMany(),
    prisma.availabilitySchedule.deleteMany(),
    prisma.portfolioImage.deleteMany(),
    prisma.serviceAddOn.deleteMany(),
    prisma.service.deleteMany(),
    prisma.technicianProfile.deleteMany(),
    prisma.user.deleteMany(),
    prisma.platformSetting.deleteMany(),
  ]);

  const hash = await bcrypt.hash('Password123!', 10);

  // ---------- Admin ----------
  await prisma.user.create({
    data: { email: 'admin@oak.app', passwordHash: hash, firstName: 'Ada', lastName: 'Admin', role: Role.ADMIN },
  });

  // ---------- Customers ----------
  const [lilian, maya, sofia] = await Promise.all([
    prisma.user.create({ data: { email: 'lilian@example.com', passwordHash: hash, firstName: 'Lilian', lastName: 'Tran', phone: '408-555-0101' } }),
    prisma.user.create({ data: { email: 'maya@example.com', passwordHash: hash, firstName: 'Maya', lastName: 'Chen', phone: '408-555-0102' } }),
    prisma.user.create({ data: { email: 'sofia@example.com', passwordHash: hash, firstName: 'Sofia', lastName: 'Reyes', phone: '408-555-0103' } }),
  ]);

  // ---------- Technicians ----------
  type TechSeed = {
    email: string; firstName: string; lastName: string; salonName: string | null;
    bio: string; city: string; state: string; zipCode: string; address: string;
    locationType: LocationType; yearsExperience: number; certifications: string[];
    autoApprove: boolean; bufferMinutes: number;
    services: { name: string; description: string; durationMinutes: number; priceCents: number; category: string; addOns?: { name: string; priceCents: number; durationMinutes: number }[] }[];
  };

  const techSeeds: TechSeed[] = [
    {
      email: 'vy@oak.app', firstName: 'Vy', lastName: 'Nguyen', salonName: 'Bloom Studio',
      bio: 'Award-winning nail artist specializing in intricate hand-painted designs and Gel X extensions.',
      city: 'San Jose', state: 'CA', zipCode: '95112', address: '210 Blossom Ave',
      locationType: LocationType.SALON, yearsExperience: 8,
      certifications: ['CA Licensed Manicurist', 'Gel X Certified'],
      autoApprove: true, bufferMinutes: 15,
      services: [
        { name: 'Gel Manicure', description: 'Classic gel manicure with cuticle care and polish.', durationMinutes: 60, priceCents: 5500, category: 'Manicure', addOns: [{ name: 'French Tips', priceCents: 1000, durationMinutes: 15 }, { name: 'Paraffin Treatment', priceCents: 1500, durationMinutes: 15 }] },
        { name: 'Gel X Full Set', description: 'Full Gel X extension set, any length.', durationMinutes: 120, priceCents: 9500, category: 'Extensions' },
        { name: 'Nail Art (Custom)', description: 'Hand-painted custom art, per session.', durationMinutes: 90, priceCents: 8000, category: 'Nail Art' },
      ],
    },
    {
      email: 'han@oak.app', firstName: 'Han', lastName: 'Pham', salonName: 'Lotus Nails',
      bio: 'Salon owner focused on flawless acrylics and long-lasting pedicures. Walk in as a client, leave as family.',
      city: 'San Jose', state: 'CA', zipCode: '95126', address: '88 Lotus Lane',
      locationType: LocationType.BOTH, yearsExperience: 12,
      certifications: ['CA Licensed Manicurist'],
      autoApprove: false, bufferMinutes: 10,
      services: [
        { name: 'Acrylic Full Set', description: 'Sculpted acrylic full set with shaping.', durationMinutes: 105, priceCents: 8500, category: 'Extensions', addOns: [{ name: 'Chrome Finish', priceCents: 1500, durationMinutes: 10 }] },
        { name: 'Gel Manicure', description: 'Gel manicure with massage.', durationMinutes: 60, priceCents: 5000, category: 'Manicure' },
        { name: 'Spa Pedicure', description: 'Deluxe spa pedicure with hot stones.', durationMinutes: 75, priceCents: 6500, category: 'Pedicure' },
      ],
    },
    {
      email: 'jess@oak.app', firstName: 'Jess', lastName: 'Kim', salonName: null,
      bio: 'Mobile nail tech bringing the salon to your door across the East Bay. Minimal, clean, modern sets.',
      city: 'Oakland', state: 'CA', zipCode: '94607', address: 'Mobile — service at your location',
      locationType: LocationType.MOBILE, yearsExperience: 5,
      certifications: ['CA Licensed Manicurist', 'Sanitation & Safety Certified'],
      autoApprove: true, bufferMinutes: 30,
      services: [
        { name: 'Gel Manicure', description: 'At-home gel manicure.', durationMinutes: 75, priceCents: 7000, category: 'Manicure' },
        { name: 'Classic Pedicure', description: 'At-home classic pedicure.', durationMinutes: 60, priceCents: 6000, category: 'Pedicure' },
      ],
    },
    {
      email: 'thao@oak.app', firstName: 'Thao', lastName: 'Le', salonName: 'Petal & Polish',
      bio: 'Gentle, detail-obsessed nail care. Specialty: natural nail health and minimalist art.',
      city: 'Houston', state: 'TX', zipCode: '77036', address: '4501 Bellaire Blvd',
      locationType: LocationType.SALON, yearsExperience: 6,
      certifications: ['TX Licensed Manicurist'],
      autoApprove: true, bufferMinutes: 0,
      services: [
        { name: 'Gel Manicure', description: 'Natural-nail-first gel manicure.', durationMinutes: 60, priceCents: 4500, category: 'Manicure' },
        { name: 'Minimalist Nail Art', description: 'Simple line work and accents.', durationMinutes: 45, priceCents: 3500, category: 'Nail Art' },
        { name: 'Spa Pedicure', description: 'Relaxing spa pedicure.', durationMinutes: 90, priceCents: 7000, category: 'Pedicure' },
      ],
    },
  ];

  const img = (seed: string, w = 600, h = 400) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
  const techs: { profileId: string; serviceIds: Record<string, string> }[] = [];

  for (const [i, t] of techSeeds.entries()) {
    const user = await prisma.user.create({
      data: { email: t.email, passwordHash: hash, firstName: t.firstName, lastName: t.lastName, role: Role.TECHNICIAN },
    });
    const profile = await prisma.technicianProfile.create({
      data: {
        userId: user.id, bio: t.bio, salonName: t.salonName, locationType: t.locationType,
        address: t.address, city: t.city, state: t.state, zipCode: t.zipCode,
        yearsExperience: t.yearsExperience, certifications: t.certifications,
        autoApprove: t.autoApprove, bufferMinutes: t.bufferMinutes, timezone: TZ,
        profilePhotoUrl: img(`face${i}`, 300, 300), coverImageUrl: img(`cover${i}`, 1200, 400),
      },
    });

    const serviceIds: Record<string, string> = {};
    for (const s of t.services) {
      const svc = await prisma.service.create({
        data: {
          technicianId: profile.id, name: s.name, description: s.description,
          durationMinutes: s.durationMinutes, priceCents: s.priceCents, category: s.category,
          addOns: s.addOns ? { create: s.addOns } : undefined,
        },
      });
      serviceIds[s.name] = svc.id;
    }

    // Portfolio
    await prisma.portfolioImage.createMany({
      data: [0, 1, 2, 3].map((n) => ({
        technicianId: profile.id, url: img(`nails${i}${n}`), caption: ['Fresh set', 'Client favorite', 'Seasonal design', 'Detail work'][n], sortOrder: n,
      })),
    });

    // Weekly schedule: Tue–Sat 9:00–18:00 with a 12:30–13:30 lunch break
    // (modelled as two working windows per day).
    for (const weekday of [2, 3, 4, 5, 6]) {
      await prisma.availabilitySchedule.createMany({
        data: [
          { technicianId: profile.id, weekday, startMinutes: 9 * 60, endMinutes: 12 * 60 + 30 },
          { technicianId: profile.id, weekday, startMinutes: 13 * 60 + 30, endMinutes: 18 * 60 },
        ],
      });
    }

    // A vacation day ~3 weeks out
    await prisma.blockedTime.create({
      data: { technicianId: profile.id, startAt: at(21 + i, 0), endAt: at(22 + i, 0), reason: 'Vacation' },
    });

    techs.push({ profileId: profile.id, serviceIds });
  }

  // ---------- Appointments ----------
  const mkAppt = async (opts: {
    customerId: string; tech: number; service: string; start: Date;
    status: AppointmentStatus; paid?: boolean;
  }) => {
    const t = techs[opts.tech];
    const svc = await prisma.service.findUniqueOrThrow({ where: { id: t.serviceIds[opts.service] } });
    const end = new Date(opts.start.getTime() + svc.durationMinutes * 60000);
    const appt = await prisma.appointment.create({
      data: {
        customerId: opts.customerId, technicianId: t.profileId,
        startAt: opts.start, endAt: end, status: opts.status, totalCents: svc.priceCents,
        services: { create: { serviceId: svc.id, name: svc.name, priceCents: svc.priceCents, durationMinutes: svc.durationMinutes } },
        payment: { create: { amountCents: svc.priceCents, status: opts.paid ? PaymentStatus.PAID : PaymentStatus.REQUIRES_PAYMENT, stripePaymentIntentId: opts.paid ? `pi_demo_${Math.random().toString(36).slice(2, 10)}` : null } },
      },
    });
    return appt;
  };

  // Past, completed (reviewable / reviewed) — use past Wednesdays/Fridays
  const past1 = await mkAppt({ customerId: lilian.id, tech: 0, service: 'Gel Manicure', start: at(-21, 10), status: AppointmentStatus.COMPLETED, paid: true });
  const past2 = await mkAppt({ customerId: lilian.id, tech: 1, service: 'Acrylic Full Set', start: at(-14, 14), status: AppointmentStatus.COMPLETED, paid: true });
  const past3 = await mkAppt({ customerId: maya.id, tech: 0, service: 'Gel X Full Set', start: at(-10, 9), status: AppointmentStatus.COMPLETED, paid: true });
  const past4 = await mkAppt({ customerId: sofia.id, tech: 2, service: 'Gel Manicure', start: at(-7, 11), status: AppointmentStatus.COMPLETED, paid: true });
  const past5 = await mkAppt({ customerId: maya.id, tech: 3, service: 'Spa Pedicure', start: at(-5, 15), status: AppointmentStatus.COMPLETED, paid: true });
  await mkAppt({ customerId: sofia.id, tech: 1, service: 'Gel Manicure', start: at(-3, 9), status: AppointmentStatus.NO_SHOW });

  // Upcoming
  await mkAppt({ customerId: lilian.id, tech: 0, service: 'Nail Art (Custom)', start: at(3, 10), status: AppointmentStatus.CONFIRMED, paid: true });
  await mkAppt({ customerId: maya.id, tech: 0, service: 'Gel Manicure', start: at(3, 14), status: AppointmentStatus.CONFIRMED, paid: true });
  await mkAppt({ customerId: sofia.id, tech: 1, service: 'Spa Pedicure', start: at(4, 9, 30), status: AppointmentStatus.PENDING });
  await mkAppt({ customerId: lilian.id, tech: 2, service: 'Classic Pedicure', start: at(6, 11), status: AppointmentStatus.CONFIRMED, paid: true });

  // ---------- Reviews ----------
  const reviews = [
    { appt: past1, customerId: lilian.id, tech: 0, rating: 5, comment: 'Vy is incredible — cleanest gel mani I have ever had. Lasted 3+ weeks.' },
    { appt: past2, customerId: lilian.id, tech: 1, rating: 4, comment: 'Beautiful acrylics, salon was busy but worth the wait.' },
    { appt: past3, customerId: maya.id, tech: 0, rating: 5, comment: 'Gel X set was flawless. Shape and length exactly what I asked for.' },
    { appt: past4, customerId: sofia.id, tech: 2, rating: 5, comment: 'Jess came to my apartment and it was the most relaxing experience.' },
    { appt: past5, customerId: maya.id, tech: 3, rating: 4, comment: 'Great pedicure, very gentle and thorough.' },
  ];
  for (const r of reviews) {
    await prisma.review.create({
      data: {
        appointmentId: r.appt.id, customerId: r.customerId, technicianId: techs[r.tech].profileId,
        rating: r.rating, comment: r.comment, photoUrls: [img(`review${r.rating}${r.tech}`)],
      },
    });
  }
  // Recompute denormalized rating caches
  for (const t of techs) {
    const agg = await prisma.review.aggregate({ where: { technicianId: t.profileId, isHidden: false }, _avg: { rating: true }, _count: true });
    await prisma.technicianProfile.update({
      where: { id: t.profileId },
      data: { avgRating: agg._avg.rating ?? 0, reviewCount: agg._count },
    });
  }

  // ---------- Favorites ----------
  await prisma.favoriteTechnician.createMany({
    data: [
      { customerId: lilian.id, technicianId: techs[0].profileId },
      { customerId: lilian.id, technicianId: techs[2].profileId },
      { customerId: maya.id, technicianId: techs[0].profileId },
    ],
  });

  // ---------- Platform settings ----------
  await prisma.platformSetting.createMany({
    data: [
      { key: 'platformFeePercent', value: '10' },
      { key: 'cancellationWindowHours', value: '24' },
      { key: 'currency', value: 'usd' },
    ],
  });

  console.log('Seed complete.');
  console.log('Demo logins (password: Password123!):');
  console.log('  admin@oak.app  (admin)');
  console.log('  lilian@example.com   (customer)');
  console.log('  vy@oak.app     (technician, auto-approve)');
  console.log('  han@oak.app    (technician, manual approval)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
