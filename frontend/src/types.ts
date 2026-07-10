export type Role = 'CUSTOMER' | 'TECHNICIAN' | 'ADMIN';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type PaymentStatus = 'REQUIRES_PAYMENT' | 'PAID' | 'REFUNDED' | 'FAILED';
export type LocationType = 'SALON' | 'MOBILE' | 'BOTH';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: Role;
  isSuspended?: boolean;
  createdAt?: string;
  technicianProfile?: { id: string; isPublished?: boolean } | null;
}

export interface AddOn {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
}

export interface Service {
  id: string;
  technicianId: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  category: string;
  isActive: boolean;
  addOns: AddOn[];
}

export interface PortfolioImage {
  id: string;
  url: string;
  caption?: string | null;
  sortOrder: number;
}

export interface Slot {
  startAt: string;
  endAt: string;
  localLabel: string;
}

export interface Technician {
  id: string;
  bio: string;
  salonName?: string | null;
  locationType: LocationType;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  profilePhotoUrl?: string | null;
  coverImageUrl?: string | null;
  yearsExperience: number;
  certifications: string[];
  timezone: string;
  autoApprove: boolean;
  bufferMinutes: number;
  slotIntervalMinutes: number;
  avgRating: number;
  reviewCount: number;
  isPublished: boolean;
  user: { firstName: string; lastName: string };
  services: Service[];
  portfolioImages: PortfolioImage[];
  reviews?: Review[];
  availableSlots?: Slot[];
}

export interface AppointmentServiceSnap {
  id: string;
  serviceId: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
  addOns?: { name: string; priceCents: number; durationMinutes: number }[] | null;
}

export interface Appointment {
  id: string;
  customerId: string;
  technicianId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  totalCents: number;
  customerNote?: string | null;
  cancellationReason?: string | null;
  services: AppointmentServiceSnap[];
  payment?: { id: string; status: PaymentStatus; amountCents: number } | null;
  review?: { id: string; rating: number } | null;
  customer?: { id: string; firstName: string; lastName: string; email: string; phone?: string | null };
  technician?: {
    id: string;
    salonName?: string | null;
    city: string;
    state: string;
    address: string;
    profilePhotoUrl?: string | null;
    timezone: string;
    user: { firstName: string; lastName: string };
  };
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  photoUrls: string[];
  isHidden?: boolean;
  createdAt: string;
  customer?: { firstName: string; lastName: string };
  technician?: { id: string; salonName?: string | null; user: { firstName: string; lastName: string } };
}

export interface ScheduleWindow {
  id?: string;
  weekday: number;
  startMinutes: number;
  endMinutes: number;
}

export interface BlockedTime {
  id: string;
  startAt: string;
  endAt: string;
  reason?: string | null;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminStats {
  users: number;
  technicians: number;
  customers: number;
  appointments: number;
  completedAppointments: number;
  upcomingAppointments: number;
  reviews: number;
  grossRevenueCents: number;
}
