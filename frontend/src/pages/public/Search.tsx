import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { money } from '../../lib/format';
import { Paginated, Technician } from '../../types';
import { EmptyState, Pager, Spinner, Stars, ErrorNote } from '../../components/ui';
import { t } from '../../i18n';

function TechCard({ tech, date }: { tech: Technician; date?: string }) {
  const name = tech.salonName || `${tech.user.firstName} ${tech.user.lastName}`;
  const minPrice = tech.services.length ? Math.min(...tech.services.map((s) => s.priceCents)) : null;
  return (
    <div className="card !p-0 overflow-hidden flex flex-col">
      <Link to={`/technicians/${tech.id}`}>
        <img src={tech.coverImageUrl ?? tech.portfolioImages[0]?.url ?? 'https://picsum.photos/seed/nb/600/300'} alt="" className="h-36 w-full object-cover" />
      </Link>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-3">
          <img src={tech.profilePhotoUrl ?? 'https://picsum.photos/seed/p/80'} alt="" className="h-12 w-12 rounded-full object-cover border-2 border-blossom" />
          <div className="min-w-0">
            <Link to={`/technicians/${tech.id}`} className="font-semibold hover:text-teal block truncate">{name}</Link>
            <div className="text-xs text-plum-soft">{tech.city}, {tech.state} · <span className="chip bg-lilac/30 !px-2">{tech.locationType === 'MOBILE' ? t().search.mobile : t().search.salon}</span></div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <Stars rating={tech.avgRating} />
          <span className="text-plum-soft text-xs">{tech.avgRating.toFixed(1)} · {tech.reviewCount} {t().search.reviews}</span>
        </div>
        <p className="mt-2 text-sm text-plum-soft line-clamp-2">{tech.bio}</p>
        {tech.availableSlots && tech.availableSlots.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-semibold text-teal mb-1">{t().search.nextAvailable}</div>
            <div className="flex flex-wrap gap-1.5">
              {tech.availableSlots.slice(0, 4).map((s) => (
                <Link
                  key={s.startAt}
                  to={`/book/${tech.id}?date=${date}&startAt=${encodeURIComponent(s.startAt)}`}
                  className="chip bg-aqua/15 text-teal hover:bg-aqua/30"
                >
                  {s.localLabel}
                </Link>
              ))}
            </div>
          </div>
        )}
        <div className="mt-auto pt-4 flex items-center justify-between">
          {minPrice !== null && <span className="text-sm text-plum-soft">{t().search.from} <b className="text-plum">{money(minPrice)}</b></span>}
          <Link to={`/book/${tech.id}${date ? `?date=${date}` : ''}`} className="btn-secondary !py-1.5">Book</Link>
        </div>
      </div>
    </div>
  );
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState({
    date: params.get('date') ?? '',
    time: params.get('time') ?? '',
    city: params.get('city') ?? '',
    state: params.get('state') ?? '',
    service: params.get('service') ?? '',
    priceMin: params.get('priceMin') ?? '',
    priceMax: params.get('priceMax') ?? '',
    minRating: params.get('minRating') ?? '',
    name: params.get('name') ?? '',
  });
  const page = parseInt(params.get('page') ?? '1', 10);

  const queryString = params.toString();
  const { data, isLoading, error } = useQuery({
    queryKey: ['search', queryString],
    queryFn: () => api.get<Paginated<Technician>>(`/technicians/search?${queryString}`),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams();
    Object.entries(form).forEach(([k, v]) => v && q.set(k, v));
    setParams(q);
  };

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{t().search.title}</h1>

      <form onSubmit={onSubmit} className="card !p-4 grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <div><label className="label">{t().search.date}</label><input type="date" className="input" value={form.date} onChange={set('date')} /></div>
        <div><label className="label">{t().search.time}</label><input type="time" className="input" value={form.time} onChange={set('time')} /></div>
        <div><label className="label">{t().search.city}</label><input className="input" value={form.city} onChange={set('city')} /></div>
        <div><label className="label">{t().search.state}</label><input className="input" placeholder="CA" value={form.state} onChange={set('state')} /></div>
        <div><label className="label">{t().search.service}</label><input className="input" value={form.service} onChange={set('service')} /></div>
        <div><label className="label">{t().search.priceMin}</label><input type="number" min="0" className="input" value={form.priceMin} onChange={set('priceMin')} /></div>
        <div><label className="label">{t().search.priceMax}</label><input type="number" min="0" className="input" value={form.priceMax} onChange={set('priceMax')} /></div>
        <div>
          <label className="label">{t().search.minRating}</label>
          <select className="input" value={form.minRating} onChange={set('minRating')}>
            <option value="">Any</option>
            {[3, 4, 4.5].map((r) => <option key={r} value={r}>{r}+ ★</option>)}
          </select>
        </div>
        <div><label className="label">{t().search.name}</label><input className="input" value={form.name} onChange={set('name')} /></div>
        <div className="flex items-end"><button className="btn-primary w-full">{t().search.submit}</button></div>
      </form>

      {isLoading && <Spinner />}
      {error instanceof Error && <ErrorNote message={error.message} />}
      {data && data.items.length === 0 && <EmptyState>{t().search.noResults}</EmptyState>}

      {data && data.items.length > 0 && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.items.map((tech) => <TechCard key={tech.id} tech={tech} date={form.date || undefined} />)}
          </div>
          <Pager
            page={page}
            totalPages={data.totalPages}
            onPage={(p) => { const q = new URLSearchParams(params); q.set('page', String(p)); setParams(q); }}
          />
        </>
      )}
    </div>
  );
}
