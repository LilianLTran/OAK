import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { minutesLabel, WEEKDAYS, dateTimeLabel } from '../../lib/format';
import { BlockedTime, ScheduleWindow, Technician } from '../../types';
import TechNav from '../../components/TechNav';
import { ErrorNote, Spinner } from '../../components/ui';

/** "HH:mm" <-> minutes-since-midnight */
const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const toHHmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export default function TechAvailability() {
  const qc = useQueryClient();
  const [windows, setWindows] = useState<ScheduleWindow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [blocked, setBlocked] = useState({ startAt: '', endAt: '', reason: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['mySchedule'],
    queryFn: () => api.get<{ schedules: ScheduleWindow[]; blockedTimes: BlockedTime[] }>('/availability/me/schedule'),
  });
  const { data: profile } = useQuery({
    queryKey: ['myTechProfile'],
    queryFn: () => api.get<Technician>('/technicians/me'),
  });

  useEffect(() => { if (data && !dirty) setWindows(data.schedules); }, [data, dirty]);

  const saveSchedule = useMutation({
    mutationFn: () => api.put('/availability/me/schedule', { windows: windows.map(({ weekday, startMinutes, endMinutes }) => ({ weekday, startMinutes, endMinutes })) }),
    onSuccess: () => { setDirty(false); void qc.invalidateQueries({ queryKey: ['mySchedule'] }); },
  });

  const addBlocked = useMutation({
    mutationFn: () => api.post('/availability/me/blocked', {
      startAt: new Date(blocked.startAt).toISOString(),
      endAt: new Date(blocked.endAt).toISOString(),
      reason: blocked.reason || undefined,
    }),
    onSuccess: () => { setBlocked({ startAt: '', endAt: '', reason: '' }); void qc.invalidateQueries({ queryKey: ['mySchedule'] }); },
  });

  const removeBlocked = useMutation({
    mutationFn: (id: string) => api.delete(`/availability/me/blocked/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mySchedule'] }),
  });

  const saveSettings = useMutation({
    mutationFn: (body: Partial<Pick<Technician, 'bufferMinutes' | 'slotIntervalMinutes' | 'autoApprove'>>) =>
      api.patch<Technician>('/technicians/me', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myTechProfile'] }),
  });

  if (isLoading) return <div><h1 className="text-3xl font-bold mb-6">Availability</h1><TechNav /><Spinner /></div>;

  const forDay = (d: number) => windows.filter((w) => w.weekday === d).sort((a, b) => a.startMinutes - b.startMinutes);
  const update = (fn: (ws: ScheduleWindow[]) => ScheduleWindow[]) => { setWindows(fn); setDirty(true); };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Availability</h1>
      <TechNav />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly schedule */}
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Weekly working hours</h2>
            <button className="btn-primary !py-1.5" disabled={!dirty || saveSchedule.isPending} onClick={() => saveSchedule.mutate()}>
              {saveSchedule.isPending ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
            </button>
          </div>
          <p className="text-xs text-plum-soft mb-4">
            Add multiple windows per day to model breaks — e.g. 9:00–12:30 and 13:30–18:00 leaves a lunch break.
          </p>
          {saveSchedule.error instanceof Error && <ErrorNote message={saveSchedule.error.message} />}

          <div className="space-y-3 mt-2">
            {WEEKDAYS.map((name, d) => (
              <div key={d} className="flex flex-wrap items-start gap-3 border-b border-lilac/25 pb-3">
                <div className="w-24 pt-2 text-sm font-semibold">{name}</div>
                <div className="flex-1 space-y-2">
                  {forDay(d).length === 0 && <div className="pt-2 text-xs text-plum-soft">Day off</div>}
                  {forDay(d).map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="time" className="input !w-32"
                        value={toHHmm(w.startMinutes)}
                        onChange={(e) => update((ws) => ws.map((x) => (x === w ? { ...x, startMinutes: toMinutes(e.target.value) } : x)))}
                      />
                      <span className="text-plum-soft text-sm">to</span>
                      <input
                        type="time" className="input !w-32"
                        value={toHHmm(w.endMinutes)}
                        onChange={(e) => update((ws) => ws.map((x) => (x === w ? { ...x, endMinutes: toMinutes(e.target.value) } : x)))}
                      />
                      <button className="text-plum-soft hover:text-plum text-lg px-1" onClick={() => update((ws) => ws.filter((x) => x !== w))} aria-label="Remove window">×</button>
                    </div>
                  ))}
                </div>
                <button
                  className="btn-ghost !py-1 text-xs mt-1.5"
                  onClick={() => update((ws) => [...ws, { weekday: d, startMinutes: 9 * 60, endMinutes: 17 * 60 }])}
                >
                  + Window
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          {/* Booking settings */}
          <section className="card">
            <h2 className="font-semibold mb-3">Booking settings</h2>
            {profile && (
              <div className="space-y-4 text-sm">
                <div>
                  <label className="label">Buffer between appointments</label>
                  <select className="input" value={profile.bufferMinutes} onChange={(e) => saveSettings.mutate({ bufferMinutes: Number(e.target.value) })}>
                    {[0, 10, 15, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Slot interval (start-time granularity)</label>
                  <select className="input" value={profile.slotIntervalMinutes} onChange={(e) => saveSettings.mutate({ slotIntervalMinutes: Number(e.target.value) })}>
                    {[15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>Every {m} minutes</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-teal" checked={profile.autoApprove} onChange={(e) => saveSettings.mutate({ autoApprove: e.target.checked })} />
                  Auto-approve new bookings
                </label>
              </div>
            )}
          </section>

          {/* Blocked time / vacations */}
          <section className="card">
            <h2 className="font-semibold mb-3">Vacations & blocked time</h2>
            <div className="space-y-2">
              <input type="datetime-local" className="input" value={blocked.startAt} onChange={(e) => setBlocked((b) => ({ ...b, startAt: e.target.value }))} />
              <input type="datetime-local" className="input" value={blocked.endAt} onChange={(e) => setBlocked((b) => ({ ...b, endAt: e.target.value }))} />
              <input className="input" placeholder="Reason (optional)" value={blocked.reason} onChange={(e) => setBlocked((b) => ({ ...b, reason: e.target.value }))} />
              <button className="btn-secondary w-full !py-2" disabled={!blocked.startAt || !blocked.endAt || addBlocked.isPending} onClick={() => addBlocked.mutate()}>
                Block this time
              </button>
              {addBlocked.error instanceof Error && <p className="text-xs">{addBlocked.error.message}</p>}
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {data?.blockedTimes.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 rounded-xl bg-lilac/15 px-3 py-2">
                  <span className="text-xs">
                    {dateTimeLabel(b.startAt)} → {dateTimeLabel(b.endAt)}
                    {b.reason && <span className="text-plum-soft"> · {b.reason}</span>}
                  </span>
                  <button className="text-plum-soft hover:text-plum" onClick={() => removeBlocked.mutate(b.id)} aria-label="Remove">×</button>
                </li>
              ))}
            </ul>
          </section>

          {/* Preview */}
          <section className="card text-xs text-plum-soft">
            Preview: clients see start times every <b>{profile?.slotIntervalMinutes ?? 30} min</b> inside your windows, e.g. a window {minutesLabel(9 * 60)}–{minutesLabel(18 * 60)} with a 90-minute service offers {minutesLabel(9 * 60)}, {minutesLabel(10 * 60 + 30)}, {minutesLabel(12 * 60)}…
          </section>
        </div>
      </div>
    </div>
  );
}
