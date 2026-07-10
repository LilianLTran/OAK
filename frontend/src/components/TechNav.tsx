import { NavLink } from 'react-router-dom';

const LINKS = [
  ['/tech', 'Dashboard'],
  ['/tech/calendar', 'Calendar'],
  ['/tech/appointments', 'Appointments'],
  ['/tech/services', 'Services'],
  ['/tech/availability', 'Availability'],
  ['/tech/portfolio', 'Portfolio'],
  ['/tech/profile', 'Profile'],
] as const;

export default function TechNav() {
  return (
    <nav className="flex flex-wrap gap-1 mb-8 rounded-2xl bg-lilac/15 p-1.5">
      {LINKS.map(([to, label]) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/tech'}
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
