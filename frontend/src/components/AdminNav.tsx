import { NavLink } from 'react-router-dom';

const LINKS = [
  ['/admin', 'Overview'],
  ['/admin/users', 'Users & Technicians'],
  ['/admin/appointments', 'Appointments'],
  ['/admin/reviews', 'Reviews'],
] as const;

export default function AdminNav() {
  return (
    <nav className="flex flex-wrap gap-1 mb-8 rounded-2xl bg-lilac/15 p-1.5">
      {LINKS.map(([to, label]) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/admin'}
          className={({ isActive }) =>
            `rounded-xl px-4 py-2 text-sm font-semibold transition ${isActive ? 'bg-white shadow-soft text-teal' : 'text-plum-soft hover:text-plum'}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
