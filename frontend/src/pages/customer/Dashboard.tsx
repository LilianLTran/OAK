import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { dateTimeLabel, money } from '../../lib/format';
import { Appointment, Paginated, Review } from '../../types';
import { EmptyState, ErrorNote, Pager, Spinner, Stars, StatusBadge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

function ReviewForm({ appointment, onDone }: { appointment: Appointment; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.post<Review>('/reviews', { appointmentId: appointment.id, rating, comment, photoUrls: [] }),
    onSuccess: onDone,
  });

  return (
    <div className="mt-3 rounded-xl bg-lilac/15 p-4">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? 'text-trust' : 'text-lilac/50'}`} aria-label={`${n} stars`}>★</button>
        ))}
      </div>
      <textarea className="input mt-2" rows={2} placeholder="How was your appointment?" value={comment} onChange={(e) => setComment(e.target.value)} />
      {mutation.error instanceof Error && <p className="mt-1 text-xs text-plum">{mutation.error.message}</p>}
      <button className="btn-primary !py-1.5 mt-2" disabled={mutation.isPending} onClick={() => mutation.mutate()}>Submit review</button>
    </div>
  );
}

function ApptRow({ appt, past }: { appt: Appointment; past?: boolean }) {
  const qc = useQueryClient();
  const [reviewing, setReviewing] = useState(false);
  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/appointments/${appt.id}/cancel`, { reason: 'Cancelled by customer' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myAppointments'] }),
  });

  const techName = appt.technician?.salonName || `${appt.technician?.user.firstName} ${appt.technician?.user.lastName}`;

  return (
    <div className="card !p-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <img src={appt.technician?.profilePhotoUrl ?? 'https://picsum.photos/seed/t/64'} className="h-11 w-11 rounded-full object-cover" alt="" />
          <div className="min-w-0">
            <Link to={`/appointments/${appt.id}`} className="font-semibold text-sm hover:text-teal block truncate">
              {appt.services.map((s) => s.name).join(', ')}
            </Link>
            <div className="text-xs text-plum-soft truncate">
              {techName} · {dateTimeLabel(appt.startAt)} · {money(appt.totalCents)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={appt.status} />
          {!past && (appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
            <button className="btn-ghost !py-1.5 text-xs" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>Cancel</button>
          )}
          {past && appt.status === 'COMPLETED' && !appt.review && !reviewing && (
            <button className="btn-secondary !py-1.5 text-xs" onClick={() => setReviewing(true)}>Leave review</button>
          )}
          {appt.review && <Stars rating={appt.review.rating} />}
        </div>
      </div>
      {cancelMutation.error instanceof Error && <p className="mt-2 text-xs">{cancelMutation.error.message}</p>}
      {reviewing && (
        <ReviewForm
          appointment={appt}
          onDone={() => { setReviewing(false); void qc.invalidateQueries({ queryKey: ['myAppointments'] }); }}
        />
      )}
    </div>
  );
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['myAppointments', tab, page],
    queryFn: () => api.get<Paginated<Appointment>>(`/appointments/mine?scope=${tab}&page=${page}`),
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Hi, {user?.firstName} 💅</h1>
        <Link to="/account/favorites" className="btn-ghost !py-1.5">♥ Favorites</Link>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-lilac/20 p-1 mb-6">
        {(['upcoming', 'past'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setTab(s); setPage(1); }}
            className={`rounded-lg py-2 text-sm font-semibold capitalize transition ${tab === s ? 'bg-white shadow-soft text-teal' : 'text-plum-soft'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading && <Spinner />}
      {error instanceof Error && <ErrorNote message={error.message} />}
      {data && data.items.length === 0 && (
        <EmptyState>
          {tab === 'upcoming' ? <>No upcoming appointments. <Link to="/search" className="text-teal font-semibold">Find a tech →</Link></> : 'No past appointments yet.'}
        </EmptyState>
      )}
      <div className="space-y-3">
        {data?.items.map((a) => <ApptRow key={a.id} appt={a} past={tab === 'past'} />)}
      </div>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
    </div>
  );
}
