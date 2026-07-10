import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { money } from '../../lib/format';
import { Technician } from '../../types';
import { EmptyState, Spinner, Stars } from '../../components/ui';

export default function Favorites() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get<Technician[]>('/users/me/favorites'),
  });

  const remove = useMutation({
    mutationFn: (technicianId: string) => api.delete(`/users/me/favorites/${technicianId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Favorite technicians</h1>
      {data && data.length === 0 && <EmptyState>No favorites yet. Tap ♡ on a technician profile to save them.</EmptyState>}
      <div className="grid sm:grid-cols-2 gap-4">
        {data?.map((tech) => {
          const name = tech.salonName || `${tech.user.firstName} ${tech.user.lastName}`;
          return (
            <div key={tech.id} className="card !p-4 flex items-center gap-4">
              <img src={tech.profilePhotoUrl ?? 'https://picsum.photos/seed/f/80'} className="h-14 w-14 rounded-2xl object-cover" alt="" />
              <div className="flex-1 min-w-0">
                <Link to={`/technicians/${tech.id}`} className="font-semibold hover:text-teal block truncate">{name}</Link>
                <div className="text-xs text-plum-soft">{tech.city}, {tech.state}</div>
                <div className="flex items-center gap-2 text-xs"><Stars rating={tech.avgRating} /> {tech.avgRating.toFixed(1)}</div>
                {tech.services[0] && <div className="text-xs text-plum-soft">from {money(tech.services[0].priceCents)}</div>}
              </div>
              <div className="flex flex-col gap-2">
                <Link to={`/book/${tech.id}`} className="btn-primary !py-1.5 text-xs">Book</Link>
                <button onClick={() => remove.mutate(tech.id)} className="btn-ghost !py-1.5 text-xs">Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
