import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Appointment } from '../types';

/** Technician-side status transition buttons for one appointment. */
export default function ApptActions({ appt }: { appt: Appointment }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (action: string) => api.post(`/appointments/${appt.id}/${action}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['techAppointments'] }),
  });

  const past = new Date(appt.startAt) <= new Date();
  const btn = (action: string, label: string, cls = 'btn-ghost') => (
    <button key={action} className={`${cls} !py-1 !px-3 text-xs`} disabled={mutation.isPending} onClick={() => mutation.mutate(action)}>
      {label}
    </button>
  );

  const actions: JSX.Element[] = [];
  if (appt.status === 'PENDING') actions.push(btn('confirm', 'Confirm', 'btn-primary'), btn('reject', 'Reject'));
  if (appt.status === 'CONFIRMED' && past) actions.push(btn('complete', 'Complete', 'btn-primary'), btn('no-show', 'No-show'));
  if (appt.status === 'CONFIRMED' && !past) actions.push(btn('tech-cancel', 'Cancel'));

  return (
    <div className="flex items-center gap-1.5">
      {actions}
      {mutation.error instanceof Error && <span className="text-xs text-plum">{mutation.error.message}</span>}
    </div>
  );
}
