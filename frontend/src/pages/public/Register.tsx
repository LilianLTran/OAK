import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { t } from '../../i18n';
import { LogoMark } from '../../components/Logo';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState<'CUSTOMER' | 'TECHNICIAN'>(params.get('role') === 'tech' ? 'TECHNICIAN' : 'CUSTOMER');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register({ ...form, phone: form.phone || undefined, role });
      navigate(role === 'TECHNICIAN' ? '/tech/profile' : '/search', { replace: true });
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
        <h1 className="mt-4 text-2xl font-bold text-center">{t().auth.registerTitle}</h1>
        <div className="divider-gold mx-auto mt-3" />

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-lilac/20 p-1">
          {(['CUSTOMER', 'TECHNICIAN'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-lg py-2 text-xs font-semibold transition ${role === r ? 'bg-white shadow-soft text-teal' : 'text-plum-soft'}`}
            >
              {r === 'CUSTOMER' ? t().auth.iAmCustomer : t().auth.iAmTech}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          {error && <div className="rounded-xl bg-blossom/30 border border-blossom px-4 py-2.5 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">{t().auth.firstName}</label><input required className="input" value={form.firstName} onChange={set('firstName')} /></div>
            <div><label className="label">{t().auth.lastName}</label><input required className="input" value={form.lastName} onChange={set('lastName')} /></div>
          </div>
          <div><label className="label">{t().auth.email}</label><input type="email" required className="input" value={form.email} onChange={set('email')} /></div>
          <div><label className="label">{t().auth.phone}</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
          <div><label className="label">{t().auth.password}</label><input type="password" required minLength={8} className="input" value={form.password} onChange={set('password')} /></div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? t().common.loading : t().nav.register}</button>
        </form>
        <p className="mt-4 text-center text-sm text-plum-soft">
          {t().auth.haveAccount} <Link to="/login" className="text-teal font-semibold hover:underline">{t().nav.login}</Link>
        </p>
      </div>
    </div>
  );
}
