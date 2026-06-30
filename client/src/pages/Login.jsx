import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Login() {
  const { user, login, loginDemo } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  function enterDemo(role) {
    loginDemo(role);
    navigate(role === 'TERRENO' ? '/terreno' : '/dashboard', { replace: true });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Falha no login');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-brand flex items-center justify-center text-white text-2xl font-bold">
            I
          </div>
          <h1 className="text-xl font-bold text-slate-800">Innov</h1>
          <p className="mt-1 text-sm text-slate-500">Gestão de trabalhos de campo · FTTH</p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="username" placeholder="nome@empresa.pt"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1">Palavra-passe</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password" placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting}
            className="w-full rounded-lg bg-brand text-white py-2.5 font-medium hover:bg-brand-dark disabled:opacity-50">
            {submitting ? 'A entrar…' : 'Entrar'}
          </button>
        </form>

        {/* Modo demonstração — só em dev ou com VITE_ALLOW_DEMO=1 (escondido em produção). */}
        {(import.meta.env.DEV || import.meta.env.VITE_ALLOW_DEMO === '1') && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-400 mb-2">Ver demonstração — entrar como:</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => enterDemo('GERENTE')}
              className="rounded-lg bg-brand text-white px-3 py-2 text-sm font-medium hover:bg-brand-dark">
              Gerente
            </button>
            <button onClick={() => enterDemo('BACKOFFICE')}
              className="rounded-lg border border-brand text-brand px-3 py-2 text-sm font-medium hover:bg-blue-50">
              Backoffice (FR)
            </button>
            <button onClick={() => enterDemo('CDT')}
              className="rounded-lg border border-brand text-brand px-3 py-2 text-sm font-medium hover:bg-blue-50">
              CDT (ERT 45)
            </button>
            <button onClick={() => enterDemo('TERRENO')}
              className="rounded-lg border border-brand text-brand px-3 py-2 text-sm font-medium hover:bg-blue-50">
              Terreno
            </button>
            <button onClick={() => enterDemo('ADMIN')}
              className="col-span-2 rounded-lg border border-slate-300 text-slate-600 px-3 py-2 text-sm font-medium hover:bg-slate-50">
              Admin (gestão de contas/departamentos)
            </button>
          </div>
        </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Acesso restrito. A tua conta é criada pelo administrador.
        </p>
      </div>
    </div>
  );
}
