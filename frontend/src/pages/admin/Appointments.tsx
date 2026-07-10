import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { dateTimeLabel, money } from '../../lib/format';
import { Appointment, AppointmentStatus, Paginated } from '../../types';
import AdminNav from '../../components/AdminNav';
import { Pager, Spinner, StatusBadge } from '../../components/ui';

type AdminAppt = Appointment & {
  customer?: { firstName: string; lastName: string; email: string };
  technician?: { salonName?: string | null; user: { firstName: string; lastName: string } } & Appointment['technician'];
};

const FILTERS: (AppointmentStatus | 'ALL')[] = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export default function AdminAppointments() {
  const [status, setStatus] = useState<AppointmentStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['adminAppointments', status, page],
    queryFn: () => api.get<Paginated<AdminAppt>>(`/admin/appointments?page=${page}${status !== 'ALL' ? `&status=${status}` : ''}`),
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">All appointments</h1>
      <AdminNav />

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

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-plum-soft border-b border-lilac/30">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Technician</th>
              <th className="px-4 py-3">Services</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((a) => (
              <tr key={a.id} className="border-b border-lilac/20 hover:bg-cream/60">
                <td className="px-4 py-3 whitespace-nowrap">{dateTimeLabel(a.startAt)}</td>
                <td className="px-4 py-3">{a.customer?.firstName} {a.customer?.lastName}</td>
                <td className="px-4 py-3">{a.technician?.salonName ?? `${a.technician?.user.firstName} ${a.technician?.user.lastName}`}</td>
                <td className="px-4 py-3 text-plum-soft">{a.services.map((s) => s.name).join(', ')}</td>
                <td className="px-4 py-3 font-medium">{money(a.totalCents)}</td>
                <td className="px-4 py-3 text-xs text-plum-soft">{a.payment?.status.replace('_', ' ').toLowerCase() ?? '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
    </div>
  );
}
