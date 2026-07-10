import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { dateLabel } from '../../lib/format';
import { Paginated, Review } from '../../types';
import AdminNav from '../../components/AdminNav';
import { Pager, Spinner, Stars } from '../../components/ui';

export default function AdminReviews() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['adminReviews', page],
    queryFn: () => api.get<Paginated<Review>>(`/admin/reviews?page=${page}`),
  });

  const hide = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) => api.post(`/admin/reviews/${id}/hide`, { hidden }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminReviews'] }),
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Review moderation</h1>
      <AdminNav />

      {isLoading && <Spinner />}

      <div className="space-y-3">
        {data?.items.map((r) => (
          <div key={r.id} className={`card !p-4 ${r.isHidden ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                <b>{r.customer?.firstName} {r.customer?.lastName}</b>
                <span className="text-plum-soft"> reviewed </span>
                <b>{r.technician?.salonName ?? `${r.technician?.user.firstName} ${r.technician?.user.lastName}`}</b>
                <span className="text-plum-soft"> · {dateLabel(r.createdAt)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Stars rating={r.rating} />
                {r.isHidden && <span className="chip bg-blossom/40">Hidden</span>}
                <button
                  className="btn-ghost !py-1 !px-3 text-xs"
                  onClick={() => hide.mutate({ id: r.id, hidden: !r.isHidden })}
                >
                  {r.isHidden ? 'Unhide' : 'Hide (moderate)'}
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm">{r.comment}</p>
          </div>
        ))}
      </div>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
    </div>
  );
}
