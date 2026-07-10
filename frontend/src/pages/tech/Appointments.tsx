import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { dateTimeLabel, money } from '../../lib/format';
import { Appointment, AppointmentStatus, Paginated } from '../../types';
import TechNav from '../../components/TechNav';
import ApptActions from '../../components/ApptActions';
import { EmptyState, Pager, Spinner, StatusBadge } from '../../components/ui';

const FILTERS: (AppointmentStatus | 'ALL')[] = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export default function TechAppointments() {
  const [status, setStatus] = useState<AppointmentStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['techAppointments', status, page],
    queryFn: () => api.get<Paginated<Appointment>>(`/appointments/technician?page=${page}${status !== 'ALL' ? `&status=${status}` : ''}`),
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Appointments</h1>
      <TechNav />

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setStatus(f); setPage(1); }}
            className={`chip border transition ${status === f ? 'bg-teal text-white border-teal' : 'border-lilac/60 hover:bg-lilac/20'}`}
          >
            {f === 'ALL' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading && <Spinner />}
      {data && data.items.length === 0 && <EmptyState>No appointments in this view.</EmptyState>}

      <div className="space-y-3">
        {data?.items.map((a) => (
          <div key={a.id} className="card !p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-sm">{a.services.map((s) => s.name).join(', ')}</div>
              <div className="text-xs text-plum-soft">
                {dateTimeLabel(a.startAt)} · {a.customer?.firstName} {a.customer?.lastName} · {money(a.totalCents)}
                {a.payment && <> · payment: {a.payment.status.replace('_', ' ').toLowerCase()}</>}
              </div>
              {a.customerNote && <div className="text-xs italic text-plum-soft mt-0.5">“{a.customerNote}”</div>}
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={a.status} />
              <ApptActions appt={a} />
            </div>
          </div>
        ))}
      </div>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
    </div>
  );
}
