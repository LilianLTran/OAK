import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { t } from '../../i18n';
import { todayISO } from '../../lib/format';
import { LogoMark } from '../../components/Logo';

const CATEGORIES = ['Gel Manicure', 'Acrylic Full Set', 'Gel X', 'Nail Art', 'Pedicure'];

export default function Landing() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('');
  const [city, setCity] = useState('');
  const [service, setService] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (date) q.set('date', date);
    if (time) q.set('time', time);
    if (city) q.set('city', city);
    if (service) q.set('service', service);
    navigate(`/search?${q.toString()}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-plum via-[#3a1f45] to-teal px-6 py-20 sm:px-14 sm:py-24 text-center shadow-luxe">
        <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,rgba(255,174,186,0.35),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(0,198,227,0.3),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(198,161,91,0.25),transparent_50%)]" />

        <div className="relative">
          <LogoMark className="h-14 w-14 mx-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.25)]" />
          <p className="eyebrow mt-5 justify-center text-gold-soft">
            <span className="divider-gold w-6" /> Curated nail artistry <span className="divider-gold w-6" />
          </p>
          <h1 className="mt-4 text-4xl sm:text-6xl font-display font-bold leading-tight text-white">
            Exquisite nails,<br />booked in seconds.
          </h1>
          <p className="mt-5 text-white/75 max-w-xl mx-auto text-base sm:text-lg">
            Discover independent nail artists near you, see their real availability, and reserve the exact moment you want.
          </p>

          {/* Search bar */}
          <form onSubmit={onSubmit} className="mt-10 mx-auto max-w-3xl bg-white/95 backdrop-blur rounded-2xl shadow-luxe ring-1 ring-gold/30 p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-left">
            <div>
              <label className="label">{t().search.date}</label>
              <input type="date" className="input" value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">{t().search.time}</label>
              <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div>
              <label className="label">{t().search.city}</label>
              <input className="input" placeholder="San Jose" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className="label">{t().search.service}</label>
              <input className="input" placeholder="Gel manicure" value={service} onChange={(e) => setService(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full">{t().search.submit}</button>
            </div>
          </form>

          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((c) => (
              <Link key={c} to={`/search?service=${encodeURIComponent(c)}`} className="chip bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/20 backdrop-blur transition">
                {c}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mt-20">
        <div className="text-center">
          <p className="eyebrow justify-center"><span className="divider-gold w-6" /> The experience <span className="divider-gold w-6" /></p>
          <h2 className="mt-3 text-3xl font-display font-bold">Effortless, from search to bloom</h2>
        </div>
        <div className="mt-10 grid sm:grid-cols-3 gap-6">
          {[
            ['🔍', 'Search real availability', 'Only technicians who can actually take your time slot appear in results.'],
            ['📅', 'Book instantly', 'Pick a service and an open time — confirmation is immediate or same-day approved.'],
            ['💅', 'Bloom', 'Enjoy your appointment, then review your artist and rebook your favorites.'],
          ].map(([icon, title, body]) => (
            <div key={title} className="card text-center transition hover:shadow-luxe hover:-translate-y-0.5">
              <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-blossom/30 via-lilac/30 to-aqua/20 flex items-center justify-center text-2xl ring-1 ring-gold/30">
                {icon}
              </div>
              <h3 className="mt-4 font-display font-semibold text-lg">{title}</h3>
              <p className="mt-2 text-sm text-plum-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech CTA */}
      <section className="mt-20 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-teal to-[#013b47] text-white px-8 py-14 text-center shadow-luxe">
        <div className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_85%_20%,rgba(198,161,91,0.4),transparent_45%)]" />
        <div className="relative">
          <p className="eyebrow justify-center text-gold-soft"><span className="divider-gold w-6" /> For technicians <span className="divider-gold w-6" /></p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-display font-bold">Are you a nail artist?</h2>
          <p className="mt-3 text-white/75 max-w-lg mx-auto">Set your own hours, prices and services. Get discovered by clients who want exactly what you offer.</p>
          <Link to="/register?role=tech" className="btn mt-7 bg-gradient-to-r from-gold-soft to-gold text-plum font-semibold shadow-[0_10px_30px_-10px_rgba(198,161,91,0.7)] hover:brightness-105">
            Join as a technician
          </Link>
        </div>
      </section>
    </div>
  );
}
