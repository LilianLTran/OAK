import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { t } from '../../i18n';
import { LogoMark } from '../../components/Logo';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(email, password);
      const fallback = user.role === 'TECHNICIAN' ? '/tech' : user.role === 'ADMIN' ? '/admin' : '/account';
      navigate(location.state?.from ?? fallback, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t().common.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-6">
      <div className="card-luxe">
        <LogoMark className="h-12 w-12 mx-auto" />
        <h1 className="mt-4 text-2xl font-bold text-center">{t().auth.loginTitle}</h1>
        <div className="divider-gold mx-auto mt-3" />
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && <div className="rounded-xl bg-blossom/30 border border-blossom px-4 py-2.5 text-sm">{error}</div>}
          <div>
            <label className="label">{t().auth.email}</label>
            <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label className="label">{t().auth.password}</label>
            <input type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? t().common.loading : t().nav.login}</button>
        </form>
        <p className="mt-4 text-center text-sm text-plum-soft">
          {t().auth.noAccount} <Link to="/register" className="text-teal font-semibold hover:underline">{t().nav.register}</Link>
        </p>
        <div className="mt-4 rounded-xl bg-lime/30 px-4 py-3 text-xs text-plum-soft">
          <b>Demo accounts</b> (password <code>Password123!</code>): lilian@example.com (customer), vy@oak.app (tech), admin@oak.app (admin)
        </div>
      </div>
    </div>
  );
}
