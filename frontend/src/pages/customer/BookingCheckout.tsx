import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { money, todayISO, dateTimeLabel } from '../../lib/format';
import { Appointment, Slot, Technician } from '../../types';
import { ErrorNote, Spinner } from '../../components/ui';
import { t } from '../../i18n';

export default function BookingCheckout() {
  const { technicianId } = useParams<{ technicianId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [serviceId, setServiceId] = useState('');
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [date, setDate] = useState(params.get('date') || todayISO());
  const [slot, setSlot] = useState<string>(params.get('startAt') ?? '');
  const [note, setNote] = useState('');
  const [payNow, setPayNow] = useState(true);
  const [booked, setBooked] = useState<Appointment | null>(null);

  const { data: tech, isLoading } = useQuery({
    queryKey: ['technician', technicianId],
    queryFn: () => api.get<Technician>(`/technicians/${technicianId}`),
  });

  const service = tech?.services.find((s) => s.id === serviceId) ?? null;
  // Preselect the first service once the technician loads.
  useEffect(() => {
    if (tech && !serviceId && tech.services.length > 0) setServiceId(tech.services[0].id);
  }, [tech, serviceId]);

  const { data: slotData, isFetching: slotsLoading } = useQuery({
    queryKey: ['slots', technicianId, date, serviceId, addOnIds.join(',')],
    queryFn: () =>
      api.get<{ slots: Slot[]; durationMinutes: number }>(
        `/availability/${technicianId}/slots?date=${date}&serviceId=${serviceId}${addOnIds.length ? `&addOnIds=${addOnIds.join(',')}` : ''}`
      ),
    enabled: !!technicianId && !!serviceId && !!date,
  });

  const chosenAddOns = useMemo(() => service?.addOns.filter((a) => addOnIds.includes(a.id)) ?? [], [service, addOnIds]);
  const totalCents = (service?.priceCents ?? 0) + chosenAddOns.reduce((s, a) => s + a.priceCents, 0);
  const totalMinutes = (service?.durationMinutes ?? 0) + chosenAddOns.reduce((s, a) => s + a.durationMinutes, 0);

  const bookMutation = useMutation({
    mutationFn: async () => {
      const appt = await api.post<Appointment>('/appointments', {
        technicianId,
        serviceId,
        addOnIds,
        startAt: slot,
        customerNote: note || undefined,
      });
      if (payNow) return api.post<Appointment>(`/appointments/${appt.id}/pay`);
      return appt;
    },
    onSuccess: (appt) => setBooked(appt),
  });

  if (isLoading) return <Spinner />;
  if (!tech) return <ErrorNote message="Technician not found" />;

  const name = tech.salonName || `${tech.user.firstName} ${tech.user.lastName}`;

  if (booked) {
    return (
      <div className="max-w-lg mx-auto card text-center">
        <div className="text-4xl">🎉</div>
        <h1 className="mt-3 text-2xl font-bold">{t().booking.booked}</h1>
        <p className="mt-2 text-sm text-plum-soft">
          {name} · {dateTimeLabel(booked.startAt)}
        </p>
        {booked.status === 'PENDING' && <p className="mt-2 text-sm bg-lime/40 rounded-xl px-4 py-2">{t().booking.pendingNote}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => navigate('/account')} className="btn-primary">View my appointments</button>
          <Link to="/search" className="btn-ghost">Keep browsing</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-1">{t().booking.checkoutTitle}</h1>
      <p className="text-sm text-plum-soft mb-6">with <Link className="text-teal font-semibold" to={`/technicians/${tech.id}`}>{name}</Link> · {tech.city}, {tech.state}</p>

      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3 space-y-6">
          {/* Service */}
          <section className="card">
            <h2 className="font-semibold mb-3">{t().booking.pickService}</h2>
            <div className="space-y-2">
              {tech.services.map((s) => (
                <label key={s.id} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 cursor-pointer transition ${serviceId === s.id ? 'border-teal bg-aqua/10' : 'border-lilac/40 hover:border-lilac'}`}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="service" checked={serviceId === s.id} onChange={() => { setServiceId(s.id); setAddOnIds([]); setSlot(''); }} className="accent-teal" />
                    <span>
                      <span className="block text-sm font-medium">{s.name}</span>
                      <span className="block text-xs text-plum-soft">{s.durationMinutes} {t().booking.duration} · {s.category}</span>
                    </span>
                  </span>
                  <b className="text-sm">{money(s.priceCents)}</b>
                </label>
              ))}
            </div>

            {service && service.addOns.length > 0 && (
              <>
                <h3 className="font-semibold text-sm mt-5 mb-2">{t().booking.pickAddOns}</h3>
                <div className="flex flex-wrap gap-2">
                  {service.addOns.map((a) => {
                    const on = addOnIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => { setAddOnIds((ids) => (on ? ids.filter((x) => x !== a.id) : [...ids, a.id])); setSlot(''); }}
                        className={`chip border transition ${on ? 'bg-teal text-white border-teal' : 'border-lilac/60 hover:bg-lilac/20'}`}
                      >
                        {a.name} +{money(a.priceCents)}{a.durationMinutes > 0 && ` · +${a.durationMinutes}m`}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* Date & slots */}
          <section className="card">
            <h2 className="font-semibold mb-3">{t().booking.pickDate}</h2>
            <input type="date" className="input max-w-xs" min={todayISO()} value={date} onChange={(e) => { setDate(e.target.value); setSlot(''); }} />

            <h3 className="font-semibold text-sm mt-5 mb-2">{t().booking.pickSlot}</h3>
            {slotsLoading && <Spinner />}
            {!slotsLoading && slotData && slotData.slots.length === 0 && (
              <p className="text-sm text-plum-soft">{t().booking.noSlots}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {slotData?.slots.map((s) => (
                <button
                  key={s.startAt}
                  type="button"
                  onClick={() => setSlot(s.startAt)}
                  className={`chip border transition ${slot === s.startAt ? 'bg-teal text-white border-teal' : 'border-lilac/60 hover:bg-aqua/10'}`}
                >
                  {s.localLabel}
                </button>
              ))}
            </div>
          </section>

          {/* Note */}
          <section className="card">
            <label className="label">{t().booking.notes}</label>
            <textarea className="input" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </section>
        </div>

        {/* Summary */}
        <aside className="md:col-span-2">
          <div className="card sticky top-20">
            <h2 className="font-semibold mb-3">Summary</h2>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between"><dt>{service?.name ?? '—'}</dt><dd>{service ? money(service.priceCents) : '—'}</dd></div>
              {chosenAddOns.map((a) => (
                <div key={a.id} className="flex justify-between text-plum-soft"><dt>+ {a.name}</dt><dd>{money(a.priceCents)}</dd></div>
              ))}
              <div className="flex justify-between text-plum-soft"><dt>Duration</dt><dd>{totalMinutes} min</dd></div>
              <div className="flex justify-between border-t border-lilac/40 pt-2 font-bold text-base"><dt>{t().booking.total}</dt><dd>{money(totalCents)}</dd></div>
            </dl>

            <div className="mt-4 space-y-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={payNow} onChange={() => setPayNow(true)} className="accent-teal" /> {t().booking.payNow}
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!payNow} onChange={() => setPayNow(false)} className="accent-teal" /> {t().booking.payLater}
              </label>
              <p className="text-xs text-plum-soft">Payments are a demo placeholder — Stripe integration is architected but stubbed.</p>
            </div>

            {bookMutation.error instanceof Error && <div className="mt-3"><ErrorNote message={bookMutation.error.message} /></div>}

            <button
              className="btn-primary w-full mt-4"
              disabled={!slot || !service || bookMutation.isPending}
              onClick={() => bookMutation.mutate()}
            >
              {bookMutation.isPending ? t().common.loading : t().booking.confirm}
            </button>
            {!tech.autoApprove && <p className="mt-2 text-xs text-plum-soft text-center">{t().booking.pendingNote}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
