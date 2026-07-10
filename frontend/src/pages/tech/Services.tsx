import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { money } from '../../lib/format';
import { Service } from '../../types';
import TechNav from '../../components/TechNav';
import { EmptyState, ErrorNote, Spinner } from '../../components/ui';

const CATEGORIES = ['Manicure', 'Pedicure', 'Extensions', 'Nail Art', 'Other'];
const EMPTY = { name: '', description: '', durationMinutes: 60, priceDollars: 50, category: 'Manicure' };

export default function TechServices() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const { data: services, isLoading } = useQuery({
    queryKey: ['myServices'],
    queryFn: () => api.get<Service[]>('/services/me'),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        description: form.description,
        durationMinutes: Number(form.durationMinutes),
        priceCents: Math.round(Number(form.priceDollars) * 100),
        category: form.category,
      };
      return editing ? api.patch<Service>(`/services/${editing.id}`, body) : api.post<Service>('/services', { ...body, addOns: [] });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['myServices'] });
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (s: Service) => api.patch<Service>(`/services/${s.id}`, { isActive: !s.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myServices'] }),
  });

  const startEdit = (s: Service) => {
    setEditing(s);
    setForm({ name: s.name, description: s.description, durationMinutes: s.durationMinutes, priceDollars: s.priceCents / 100, category: s.category });
    setShowForm(true);
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); saveMutation.mutate(); };
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Services</h1>
      <TechNav />

      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(!showForm); }}>
          {showForm ? 'Close' : '+ New service'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card mb-6 grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="label">Name</label><input required className="input" value={form.name} onChange={set('name')} /></div>
          <div className="sm:col-span-2"><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={set('description')} /></div>
          <div><label className="label">Duration (minutes)</label><input type="number" min={15} max={480} step={15} required className="input" value={form.durationMinutes} onChange={set('durationMinutes')} /></div>
          <div><label className="label">Price ($)</label><input type="number" min={0} step="0.01" required className="input" value={form.priceDollars} onChange={set('priceDollars')} /></div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" disabled={saveMutation.isPending}>{editing ? 'Save changes' : 'Create service'}</button>
          </div>
          {saveMutation.error instanceof Error && <div className="sm:col-span-2"><ErrorNote message={saveMutation.error.message} /></div>}
        </form>
      )}

      {isLoading && <Spinner />}
      {services && services.length === 0 && <EmptyState>No services yet — add your first one so clients can book you.</EmptyState>}

      <div className="grid sm:grid-cols-2 gap-4">
        {services?.map((s) => (
          <div key={s.id} className={`card !p-4 ${!s.isActive ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-plum-soft">{s.category} · {s.durationMinutes} min</div>
              </div>
              <b>{money(s.priceCents)}</b>
            </div>
            <p className="mt-2 text-sm text-plum-soft line-clamp-2">{s.description}</p>
            {s.addOns.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.addOns.map((a) => <span key={a.id} className="chip bg-lilac/25">{a.name} +{money(a.priceCents)}</span>)}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button className="btn-ghost !py-1 text-xs" onClick={() => startEdit(s)}>Edit</button>
              <button className="btn-ghost !py-1 text-xs" onClick={() => toggleMutation.mutate(s)}>
                {s.isActive ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
