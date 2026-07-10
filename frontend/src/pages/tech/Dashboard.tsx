import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { money, timeLabel } from '../../lib/format';
import { Appointment, Paginated } from '../../types';
import TechNav from '../../components/TechNav';
import ApptActions from '../../components/ApptActions';
import { EmptyState, Spinner, StatusBadge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

interface Earnings {
  completedCount: number;
  completedCents: number;
  upcomingCount: number;
  projectedCents: number;
  note: string;
}

export default function TechDashboard() {
  const { user } = useAuth();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);

  const { data: today, isLoading } = useQuery({
    queryKey: ['techAppointments', 'today'],
    queryFn: () => api.get<Paginated<Appointment>>(`/appointments/technician?from=${start.toISOString()}&to=${end.toISOString()}`),
  });

  const { data: earnings } = useQuery({
    queryKey: ['earnings'],
    queryFn: () => api.get<Earnings>('/appointments/earnings'),
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Welcome back, {user?.firstName} ✨</h1>
      <TechNav />

      {/* Earnings */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          ['Completed appointments', earnings?.completedCount ?? '—'],
          ['Total earned', earnings ? money(earnings.completedCents) : '—'],
          ['Upcoming bookings', earnings?.upcomingCount ?? '—'],
          ['Projected revenue', earnings ? money(earnings.projectedCents) : '—'],
        ].map(([label, value]) => (
          <div key={String(label)} className="card !p-4">
            <div className="text-xs text-plum-soft">{label}</div>
            <div className="mt-1 text-2xl font-bold font-display">{value}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-plum-soft -mt-6 mb-8">{earnings?.note}</p>

      {/* Today's schedule */}
      <h2 className="text-xl font-semibold mb-3">Today’s schedule</h2>
      {isLoading && <Spinner />}
      {today && today.items.length === 0 && <EmptyState>No appointments today. Enjoy the calm 🌿</EmptyState>}
      <div className="space-y-3">
        {today?.items.map((a) => (
          <div key={a.id} className="card !p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="font-bold text-teal">{timeLabel(a.startAt)}</div>
                <div className="text-[10px] text-plum-soft">to {timeLabel(a.endAt)}</div>
              </div>
              <div>
                <div className="font-semibold text-sm">{a.services.map((s) => s.name).join(', ')}</div>
                <div className="text-xs text-plum-soft">{a.customer?.firstName} {a.customer?.lastName} · {money(a.totalCents)}</div>
                {a.customerNote && <div className="text-xs italic text-plum-soft mt-0.5">“{a.customerNote}”</div>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={a.status} />
              <ApptActions appt={a} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
