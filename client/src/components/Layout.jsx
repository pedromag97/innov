import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const ROLE_LABEL = { ADMIN: 'Administrador', BACKOFFICE: 'Backoffice', FIELD: 'Equipa Terreno' };

export default function Layout() {
  const { user, logout, isBackoffice } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Outlet />;

  return (
    <div className="min-h-full flex flex-col bg-slate-50">
      <header className="bg-brand text-white shadow">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg tracking-tight">FibraCampo</Link>
          <nav className="flex items-center gap-4 text-sm">
            {isBackoffice && <Link to="/dashboard" className="hover:underline">Dashboard</Link>}
            <Link to="/terreno" className="hover:underline">Terreno</Link>
            <span className="hidden sm:inline opacity-80">
              {user.email} · {ROLE_LABEL[user.role]}
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
