import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const { user, loginWithGoogle, loginDemo } = useAuth();
  const navigate = useNavigate();

  function enterDemo(role) {
    loginDemo(role);
    navigate(role === 'FIELD' ? '/terreno' : '/dashboard', { replace: true });
  }
  const btnRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (user) return;
    // Espera o script GIS carregar (carregado em index.html).
    const interval = setInterval(() => {
      if (window.google?.accounts?.id && btnRef.current) {
        clearInterval(interval);
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async (response) => {
            try {
              await loginWithGoogle(response.credential);
              navigate('/', { replace: true });
            } catch (err) {
              setError(err.message || 'Falha no login');
            }
          },
        });
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'filled_blue', size: 'large', text: 'signin_with', locale: 'pt-PT', width: 280,
        });
      }
    }, 200);
    return () => clearInterval(interval);
  }, [user, loginWithGoogle, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-brand flex items-center justify-center text-white text-2xl font-bold">
          F
        </div>
        <h1 className="text-xl font-bold text-slate-800">FibraCampo</h1>
        <p className="mt-1 text-sm text-slate-500">Gestão de trabalhos de campo · FTTH</p>

        <div className="mt-6 flex justify-center">
          {CLIENT_ID ? (
            <div ref={btnRef} />
          ) : (
            <p className="text-sm text-red-600">
              VITE_GOOGLE_CLIENT_ID não configurado. Define-o em <code>client/.env</code>.
            </p>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {/* Modo demonstração — só em dev ou com VITE_ALLOW_DEMO=1 (escondido em produção). */}
        {(import.meta.env.DEV || import.meta.env.VITE_ALLOW_DEMO === '1') && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-400 mb-2">Ver demonstração (dados de exemplo)</p>
          <div className="flex gap-2">
            <button onClick={() => enterDemo('ADMIN')}
              className="flex-1 rounded-lg bg-brand text-white px-3 py-2 text-sm font-medium hover:bg-brand-dark">
              Backoffice
            </button>
            <button onClick={() => enterDemo('FIELD')}
              className="flex-1 rounded-lg border border-brand text-brand px-3 py-2 text-sm font-medium hover:bg-blue-50">
              Equipa Terreno
            </button>
          </div>
        </div>
        )}

        <p className="mt-6 text-xs text-slate-400">
          Acesso restrito. A tua conta tem de ser autorizada pelo backoffice.
        </p>
      </div>
    </div>
  );
}
