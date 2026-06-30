import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { ROLE_LABELS } from '../roles.js';
import { api } from '../api.js';

export default function Layout() {
  const { user, logout, canManage, isAdmin } = useAuth();
  const isManager = user && (user.role === 'ADMIN' || user.role === 'GERENTE');
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(0);

  // Contador de entregas pendentes (atualiza ao mudar de página ou ao entregar).
  useEffect(() => {
    if (!user || !canManage) return;
    const refresh = () => api.listDeliveries().then((d) => setPending(d.deliveries.length)).catch(() => {});
    refresh();
    window.addEventListener('fc-deliveries-changed', refresh);
    return () => window.removeEventListener('fc-deliveries-changed', refresh);
  }, [user, canManage, location.pathname]);

  if (!user) return <Outlet />;

  return (
    <div className="min-h-full flex flex-col bg-slate-50">
      <header className="bg-brand text-white shadow">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg tracking-tight">Innov</Link>
          <nav className="flex items-center gap-4 text-sm">
            {canManage && <Link to="/dashboard" className="hover:underline">Dashboard</Link>}
            {canManage && (
              <Link to="/entregas" className="hover:underline inline-flex items-center gap-1">
                Entregas
                {pending > 0 && <span className="rounded-full bg-amber-400 text-amber-900 text-xs px-1.5 leading-5 min-w-5 text-center">{pending}</span>}
              </Link>
            )}
            {isManager && <Link to="/faturacao" className="hover:underline">Faturação</Link>}
            <Link to="/terreno" className="hover:underline">Terreno</Link>
            {isAdmin && <Link to="/admin" className="hover:underline">Admin</Link>}
            <span className="hidden sm:inline opacity-80">
              {user.email} · {ROLE_LABELS[user.role]}
            </span>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="rounded bg-white/15 hover:bg-white/25 px-3 py-1"
            >
              Sair
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
    </div>
  );
}
