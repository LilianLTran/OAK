import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { dateTimeLabel, money, timeLabel } from '../../lib/format';
import { Appointment } from '../../types';
import { ErrorNote, Spinner, StatusBadge } from '../../components/ui';

export default function AppointmentDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: appt, isLoading, error } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => api.get<Appointment>(`/appointments/${id}`),
  });

  if (isLoading) return <Spinner />;
  if (error instanceof Error) return <ErrorNote message={error.message} />;
  if (!appt) return null;

  const techName = appt.technician?.salonName || `${appt.technician?.user.firstName} ${appt.technician?.user.lastName}`;

  return (
    <div className="max-w-xl mx-auto card">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Appointment</h1>
        <StatusBadge status={appt.status} />
      </div>

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between"><dt className="text-plum-soft">Technician</dt><dd className="font-medium">{techName}</dd></div>
        <div className="flex justify-between"><dt className="text-plum-soft">When</dt><dd className="font-medium">{dateTimeLabel(appt.startAt)} – {timeLabel(appt.endAt)}</dd></div>
        {appt.technician && (
          <div className="flex justify-between"><dt className="text-plum-soft">Where</dt><dd className="font-medium text-right">{appt.technician.address}<br />{appt.technician.city}, {appt.technician.state}</dd></div>
        )}
        <div className="border-t border-lilac/40 pt-3">
          {appt.services.map((s) => (
            <div key={s.id} className="flex justify-between">
              <dt>{s.name} <span className="text-plum-soft">({s.durationMinutes} min)</span></dt>
              <dd>{money(s.priceCents)}</dd>
            </div>
          ))}
          {appt.services.flatMap((s) => s.addOns ?? []).map((a, i) => (
            <div key={i} className="flex justify-between text-plum-soft"><dt>+ {a.name}</dt><dd>{money(a.priceCents)}</dd></div>
          ))}
        </div>
        <div className="flex justify-between border-t border-lilac/40 pt-3 font-bold text-base">
          <dt>Total</dt><dd>{money(appt.totalCents)}</dd>
        </div>
        {appt.payment && (
          <div className="flex justify-between"><dt className="text-plum-soft">Payment</dt><dd className="chip bg-aqua/15 text-teal">{appt.payment.status.replace('_', ' ')}</dd></div>
        )}
        {appt.customerNote && <div><dt className="text-plum-soft">Note</dt><dd className="mt-1">{appt.customerNote}</dd></div>}
        {appt.cancellationReason && <div><dt className="text-plum-soft">Cancellation reason</dt><dd className="mt-1">{appt.cancellationReason}</dd></div>}
      </dl>
    </div>
  );
}
