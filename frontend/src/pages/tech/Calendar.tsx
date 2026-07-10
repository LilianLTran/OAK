import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { timeLabel } from '../../lib/format';
import { Appointment, Paginated } from '../../types';
import TechNav from '../../components/TechNav';
import { Spinner, StatusBadge } from '../../components/ui';

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay()); // Sunday
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function TechCalendar() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

  const { data, isLoading } = useQuery({
    queryKey: ['techAppointments', 'week', weekStart.toISOString()],
    queryFn: () => api.get<Paginated<Appointment>>(`/appointments/technician?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}&pageSize=100`),
  });

  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000));
  const byDay = (d: Date) =>
    (data?.items ?? []).filter((a) => {
      const s = new Date(a.startAt);
      return s.toDateString() === d.toDateString();
    });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Calendar</h1>
      <TechNav />

      <div className="flex items-center justify-between mb-4">
        <button className="btn-ghost !py-1.5" onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))}>← Prev week</button>
        <div className="font-semibold">
          {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(weekEnd.getTime() - 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <button className="btn-ghost !py-1.5" onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))}>Next week →</button>
      </div>

      {isLoading && <Spinner />}

      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {days.map((d) => {
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div key={d.toISOString()} className={`rounded-2xl p-2 min-h-[10rem] ${isToday ? 'bg-aqua/10 border border-aqua/50' : 'bg-white shadow-soft'}`}>
              <div className="text-center text-xs font-bold mb-2">
                {d.toLocaleDateString('en-US', { weekday: 'short' })}<br />
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${isToday ? 'bg-teal text-white' : ''}`}>{d.getDate()}</span>
              </div>
              <div className="space-y-1.5">
                {byDay(d).map((a) => (
                  <div key={a.id} className="rounded-lg bg-lilac/20 p-1.5 text-[11px] leading-tight">
                    <div className="font-bold text-teal">{timeLabel(a.startAt)}</div>
                    <div className="truncate">{a.services.map((s) => s.name).join(', ')}</div>
                    <div className="text-plum-soft truncate">{a.customer?.firstName}</div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
