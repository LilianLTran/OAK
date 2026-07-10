import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { money, dateLabel } from '../../lib/format';
import { Technician } from '../../types';
import { ErrorNote, Spinner, Stars } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export default function TechnicianProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: tech, isLoading, error } = useQuery({
    queryKey: ['technician', id],
    queryFn: () => api.get<Technician>(`/technicians/${id}`),
  });

  const { data: favorites } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get<Technician[]>('/users/me/favorites'),
    enabled: user?.role === 'CUSTOMER',
  });
  const isFav = favorites?.some((f) => f.id === id) ?? false;

  const favMutation = useMutation({
    mutationFn: () => (isFav ? api.delete(`/users/me/favorites/${id}`) : api.post(`/users/me/favorites/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  if (isLoading) return <Spinner />;
  if (error instanceof Error) return <ErrorNote message={error.message} />;
  if (!tech) return null;

  const name = tech.salonName || `${tech.user.firstName} ${tech.user.lastName}`;

  return (
    <div>
      {/* Cover */}
      <div className="relative rounded-3xl overflow-hidden">
        <img src={tech.coverImageUrl ?? 'https://picsum.photos/seed/cover/1200/300'} alt="" className="h-52 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-plum/60 to-transparent" />
        <div className="absolute bottom-4 left-6 flex items-end gap-4">
          <img src={tech.profilePhotoUrl ?? 'https://picsum.photos/seed/p/120'} alt="" className="h-20 w-20 rounded-2xl object-cover border-4 border-cream" />
          <div className="text-white pb-1">
            <h1 className="text-2xl font-bold drop-shadow">{name}</h1>
            <div className="text-sm text-white/90">
              {tech.user.firstName} {tech.user.lastName} · {tech.city}, {tech.state} · {tech.yearsExperience} yrs experience
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* About */}
          <section className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stars rating={tech.avgRating} size="text-lg" />
                <span className="text-sm text-plum-soft">{tech.avgRating.toFixed(1)} · {tech.reviewCount} reviews</span>
              </div>
              {user?.role === 'CUSTOMER' && (
                <button onClick={() => favMutation.mutate()} className={isFav ? 'btn-secondary !py-1.5' : 'btn-ghost !py-1.5'}>
                  {isFav ? '♥ Saved' : '♡ Save'}
                </button>
              )}
            </div>
            <p className="mt-4 text-sm leading-relaxed">{tech.bio}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip bg-aqua/15 text-teal">{tech.locationType === 'MOBILE' ? 'Mobile service' : tech.locationType === 'BOTH' ? 'Salon & mobile' : 'In salon'}</span>
              {tech.certifications.map((c) => <span key={c} className="chip bg-lilac/30">{c}</span>)}
            </div>
            {tech.locationType !== 'MOBILE' && <p className="mt-3 text-xs text-plum-soft">📍 {tech.address}, {tech.city}, {tech.state} {tech.zipCode}</p>}
          </section>

          {/* Portfolio */}
          {tech.portfolioImages.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Portfolio</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {tech.portfolioImages.map((img) => (
                  <figure key={img.id} className="rounded-2xl overflow-hidden shadow-soft">
                    <img src={img.url} alt={img.caption ?? ''} className="h-36 w-full object-cover hover:scale-105 transition" />
                  </figure>
                ))}
              </div>
            </section>
          )}

          {/* Reviews */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Reviews</h2>
            {(tech.reviews ?? []).length === 0 && <p className="text-sm text-plum-soft">No reviews yet.</p>}
            <div className="space-y-4">
              {(tech.reviews ?? []).map((r) => (
                <div key={r.id} className="card !p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{r.customer?.firstName} {r.customer?.lastName?.[0]}.</span>
                    <span className="text-xs text-plum-soft">{dateLabel(r.createdAt)}</span>
                  </div>
                  <Stars rating={r.rating} />
                  <p className="mt-1 text-sm">{r.comment}</p>
                  {r.photoUrls.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {r.photoUrls.map((u) => <img key={u} src={u} className="h-16 w-16 rounded-lg object-cover" alt="review" />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Services sidebar */}
        <aside>
          <div className="card sticky top-20">
            <h2 className="text-lg font-semibold mb-3">Services</h2>
            <ul className="divide-y divide-lilac/30">
              {tech.services.map((s) => (
                <li key={s.id} className="py-3">
                  <div className="flex justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{s.name}</div>
                      <div className="text-xs text-plum-soft">{s.category} · {s.durationMinutes} min</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{money(s.priceCents)}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <Link to={`/book/${tech.id}`} className="btn-primary w-full mt-4">Book an appointment</Link>
            {!tech.autoApprove && <p className="mt-2 text-xs text-plum-soft text-center">This artist approves bookings manually.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
