import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import { Wordmark } from './Logo';

function roleHome(role?: string) {
  if (role === 'TECHNICIAN') return '/tech';
  if (role === 'ADMIN') return '/admin';
  return '/account';
}

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-[3px] bg-gold-line" />
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur border-b border-plum/10">
        <div className="mx-auto max-w-6xl px-4 h-20 flex items-center justify-between">
          <Link to="/" className="transition hover:opacity-80">
            <Wordmark className="h-9 w-9" textClassName="text-2xl" />
          </Link>
          <nav className="flex items-center gap-3 sm:gap-6 text-sm">
            <NavLink to="/search" className="hover:text-teal font-medium px-2 py-1 tracking-wide">{t().nav.search}</NavLink>
            {user ? (
              <>
                <NavLink to={roleHome(user.role)} className="hover:text-teal font-medium px-2 py-1 tracking-wide">{t().nav.dashboard}</NavLink>
                <span className="hidden sm:inline text-plum-soft">{user.firstName}</span>
                <button onClick={logout} className="btn-ghost !py-1.5">{t().nav.logout}</button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="hover:text-teal font-medium px-2 py-1 tracking-wide">{t().nav.login}</NavLink>
                <NavLink to="/register" className="btn-primary !py-1.5">{t().nav.register}</NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-plum/10 bg-white/40">
        <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col items-center gap-3 text-center">
          <Wordmark className="h-7 w-7" textClassName="text-lg" />
          <p className="text-xs tracking-wide2 uppercase text-plum-soft">{t().tagline}</p>
          <div className="h-px w-16 bg-gold/50" />
          <p className="text-[11px] text-plum-soft/70">&copy; {new Date().getFullYear()} {t().appName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
