import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { money } from '../../lib/format';
import { AdminStats } from '../../types';
import AdminNav from '../../components/AdminNav';
import { Spinner } from '../../components/ui';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => api.get<AdminStats>('/admin/stats'),
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Platform overview</h1>
      <AdminNav />
      {isLoading && <Spinner />}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Total users', stats.users],
            ['Customers', stats.customers],
            ['Technicians', stats.technicians],
            ['Reviews', stats.reviews],
            ['All appointments', stats.appointments],
            ['Completed', stats.completedAppointments],
            ['Upcoming', stats.upcomingAppointments],
            ['Gross revenue', money(stats.grossRevenueCents)],
          ].map(([label, value]) => (
            <div key={String(label)} className="card !p-5">
              <div className="text-xs text-plum-soft">{label}</div>
              <div className="mt-1 text-3xl font-bold font-display">{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
