import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Technician } from '../../types';
import TechNav from '../../components/TechNav';
import { EmptyState, Spinner } from '../../components/ui';

export default function TechPortfolio() {
  const qc = useQueryClient();
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['myTechProfile'],
    queryFn: () => api.get<Technician>('/technicians/me'),
  });

  const add = useMutation({
    mutationFn: () => api.post('/technicians/me/portfolio', { url, caption: caption || undefined, sortOrder: profile?.portfolioImages.length ?? 0 }),
    onSuccess: () => { setUrl(''); setCaption(''); void qc.invalidateQueries({ queryKey: ['myTechProfile'] }); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/technicians/me/portfolio/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myTechProfile'] }),
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Portfolio</h1>
      <TechNav />

      <div className="card mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-56">
          <label className="label">Image URL</label>
          <input className="input" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
          <p className="mt-1 text-[11px] text-plum-soft">MVP uses image URLs; production would upload to S3/Cloudinary.</p>
        </div>
        <div className="flex-1 min-w-40">
          <label className="label">Caption</label>
          <input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>
        <button className="btn-primary" disabled={!url || add.isPending} onClick={() => add.mutate()}>Add image</button>
        {add.error instanceof Error && <p className="w-full text-xs">{add.error.message}</p>}
      </div>

      {isLoading && <Spinner />}
      {profile && profile.portfolioImages.length === 0 && <EmptyState>No portfolio images yet — show off your best sets!</EmptyState>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {profile?.portfolioImages.map((img) => (
          <figure key={img.id} className="relative rounded-2xl overflow-hidden shadow-soft group">
            <img src={img.url} alt={img.caption ?? ''} className="h-40 w-full object-cover" />
            <button
              onClick={() => remove.mutate(img.id)}
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-plum/70 text-white opacity-0 group-hover:opacity-100 transition"
              aria-label="Delete image"
            >
              ×
            </button>
            {img.caption && <figcaption className="absolute bottom-0 inset-x-0 bg-plum/60 text-white text-[11px] px-2 py-1">{img.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </div>
  );
}
