import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { LocationType, Technician } from '../../types';
import TechNav from '../../components/TechNav';
import { ErrorNote, Spinner } from '../../components/ui';

export default function TechProfileSettings() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['myTechProfile'],
    queryFn: () => api.get<Technician>('/technicians/me'),
  });

  const [form, setForm] = useState({
    bio: '', salonName: '', locationType: 'SALON' as LocationType,
    address: '', city: '', state: '', zipCode: '',
    yearsExperience: 0, certifications: '', profilePhotoUrl: '', coverImageUrl: '',
    isPublished: true,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (profile && !loaded) {
      setForm({
        bio: profile.bio, salonName: profile.salonName ?? '', locationType: profile.locationType,
        address: profile.address, city: profile.city, state: profile.state, zipCode: profile.zipCode,
        yearsExperience: profile.yearsExperience, certifications: profile.certifications.join(', '),
        profilePhotoUrl: profile.profilePhotoUrl ?? '', coverImageUrl: profile.coverImageUrl ?? '',
        isPublished: profile.isPublished,
      });
      setLoaded(true);
    }
  }, [profile, loaded]);

  const save = useMutation({
    mutationFn: () =>
      api.patch<Technician>('/technicians/me', {
        bio: form.bio,
        salonName: form.salonName || null,
        locationType: form.locationType,
        address: form.address, city: form.city, state: form.state, zipCode: form.zipCode,
        yearsExperience: Number(form.yearsExperience),
        certifications: form.certifications.split(',').map((c) => c.trim()).filter(Boolean),
        profilePhotoUrl: form.profilePhotoUrl || null,
        coverImageUrl: form.coverImageUrl || null,
        isPublished: form.isPublished,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myTechProfile'] }),
  });

  if (isLoading) return <div><h1 className="text-3xl font-bold mb-6">Profile settings</h1><TechNav /><Spinner /></div>;

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const onSubmit = (e: FormEvent) => { e.preventDefault(); save.mutate(); };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Profile settings</h1>
      <TechNav />

      <form onSubmit={onSubmit} className="card max-w-2xl grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
            <input type="checkbox" className="accent-teal" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} />
            Profile is published (visible in search)
          </label>
        </div>
        <div className="sm:col-span-2"><label className="label">Biography</label><textarea className="input" rows={4} value={form.bio} onChange={set('bio')} /></div>
        <div><label className="label">Salon name (optional)</label><input className="input" value={form.salonName} onChange={set('salonName')} /></div>
        <div>
          <label className="label">Service type</label>
          <select className="input" value={form.locationType} onChange={set('locationType')}>
            <option value="SALON">In salon</option>
            <option value="MOBILE">Mobile (I travel to clients)</option>
            <option value="BOTH">Both</option>
          </select>
        </div>
        <div className="sm:col-span-2"><label className="label">Address</label><input className="input" value={form.address} onChange={set('address')} /></div>
        <div><label className="label">City</label><input className="input" value={form.city} onChange={set('city')} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">State</label><input className="input" value={form.state} onChange={set('state')} /></div>
          <div><label className="label">ZIP</label><input className="input" value={form.zipCode} onChange={set('zipCode')} /></div>
        </div>
        <div><label className="label">Years of experience</label><input type="number" min={0} className="input" value={form.yearsExperience} onChange={set('yearsExperience')} /></div>
        <div><label className="label">Certifications (comma-separated)</label><input className="input" value={form.certifications} onChange={set('certifications')} /></div>
        <div><label className="label">Profile photo URL</label><input className="input" value={form.profilePhotoUrl} onChange={set('profilePhotoUrl')} /></div>
        <div><label className="label">Cover image URL</label><input className="input" value={form.coverImageUrl} onChange={set('coverImageUrl')} /></div>

        {save.error instanceof Error && <div className="sm:col-span-2"><ErrorNote message={save.error.message} /></div>}
        <div className="sm:col-span-2">
          <button className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : save.isSuccess ? 'Saved ✓' : 'Save profile'}</button>
        </div>
      </form>
    </div>
  );
}
