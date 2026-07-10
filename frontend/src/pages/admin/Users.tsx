import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Paginated, Role, User } from '../../types';
import AdminNav from '../../components/AdminNav';
import { Pager, Spinner, Stars } from '../../components/ui';

type AdminUser = User & {
  technicianProfile?: { id: string; salonName?: string | null; city?: string; isPublished?: boolean; avgRating?: number } | null;
};

export default function AdminUsers() {
  const qc = useQueryClient();
  const [role, setRole] = useState<'' | Role>('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page) });
  if (role) params.set('role', role);
  if (q) params.set('q', q);

  const { data, isLoading } = useQuery({
    queryKey: ['adminUsers', params.toString()],
    queryFn: () => api.get<Paginated<AdminUser>>(`/admin/users?${params.toString()}`),
  });

  const suspend = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) => api.post(`/admin/users/${id}/suspend`, { suspended }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminUsers'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminUsers'] }),
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Users & technicians</h1>
      <AdminNav />

      <div className="flex flex-wrap gap-3 mb-6">
        <input className="input max-w-xs" placeholder="Search name or email…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input max-w-40" value={role} onChange={(e) => { setRole(e.target.value as '' | Role); setPage(1); }}>
          <option value="">All roles</option>
          <option value="CUSTOMER">Customers</option>
          <option value="TECHNICIAN">Technicians</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>

      {isLoading && <Spinner />}

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-plum-soft border-b border-lilac/30">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((u) => (
              <tr key={u.id} className="border-b border-lilac/20 hover:bg-cream/60">
                <td className="px-4 py-3 font-medium">{u.firstName} {u.lastName}</td>
                <td className="px-4 py-3 text-plum-soft">{u.email}</td>
                <td className="px-4 py-3"><span className="chip bg-lilac/25">{u.role}</span></td>
                <td className="px-4 py-3 text-xs text-plum-soft">
                  {u.technicianProfile ? (
                    <>
                      {u.technicianProfile.salonName ?? '—'} · {u.technicianProfile.city}
                      {typeof u.technicianProfile.avgRating === 'number' && <> · <Stars rating={u.technicianProfile.avgRating} /></>}
                      {u.technicianProfile.isPublished === false && ' · unpublished'}
                    </>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  {u.isSuspended ? <span className="chip bg-blossom/40">Suspended</span> : <span className="chip bg-aqua/15 text-teal">Active</span>}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {u.role !== 'ADMIN' && (
                    <>
                      <button
                        className="btn-ghost !py-1 !px-3 text-xs mr-2"
                        onClick={() => suspend.mutate({ id: u.id, suspended: !u.isSuspended })}
                      >
                        {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                      <button
                        className="btn-ghost !py-1 !px-3 text-xs !border-blossom hover:!bg-blossom/20"
                        onClick={() => { if (confirm(`Permanently remove ${u.email}? This deletes all their data.`)) remove.mutate(u.id); }}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
    </div>
  );
}
