/** Small shared UI atoms. */
import { ReactNode } from 'react';
import { AppointmentStatus } from '../types';
import { t } from '../i18n';

export function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-lilac border-t-teal" />
    </div>
  );
}

export function ErrorNote({ message }: { message?: string }) {
  return <div className="rounded-xl bg-blossom/30 border border-blossom px-4 py-3 text-sm">{message ?? t().common.error}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="card text-center text-plum-soft py-10">{children}</div>;
}

export function Stars({ rating, size = 'text-sm' }: { rating: number; size?: string }) {
  return (
    <span className={`${size} tracking-tight`} aria-label={`${rating} stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(rating) ? 'text-trust' : 'text-lilac/50'}>★</span>
      ))}
    </span>
  );
}

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  PENDING: 'bg-lime/60 text-plum',
  CONFIRMED: 'bg-aqua/20 text-teal',
  CANCELLED: 'bg-blossom/40 text-plum',
  COMPLETED: 'bg-teal/10 text-teal',
  NO_SHOW: 'bg-plum/10 text-plum-soft',
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={`chip ${STATUS_STYLES[status]}`}>{t().status[status]}</span>;
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 mt-6 text-sm">
      <button className="btn-ghost !py-1.5" disabled={page <= 1} onClick={() => onPage(page - 1)}>{t().common.prev}</button>
      <span>{t().common.page} {page} {t().common.of} {totalPages}</span>
      <button className="btn-ghost !py-1.5" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>{t().common.next}</button>
    </div>
  );
}
