import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import StateBadge from '../components/StateBadge.jsx';

// Fila "A entregar": trabalhos com retorno do terreno, à espera de serem
// entregues ao cliente/operador. O backoffice revê e marca como Entregue.
export default function Deliveries() {
  const { user } = useAuth();
  // Devolver ao dashboard: poder de backoffice/gerente/admin (não CDT).
  const canReturn = ['ADMIN', 'GERENTE', 'BACKOFFICE'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  async function reload() {
    setLoading(true);
    try { const d = await api.listDeliveries(); setItems(d.deliveries); setError(''); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  const notifyChanged = () => window.dispatchEvent(new Event('fc-deliveries-changed'));
  async function deliver(id) {
    setBusy(id);
    try { await api.deliverWork(id); setItems((xs) => xs.filter((x) => x.id !== id)); notifyChanged(); }
    catch (e) { setError(e.message); } finally { setBusy(null); }
  }
  async function dismiss(id) {
    if (!confirm('Devolver ao dashboard? O trabalho sai da fila de entrega e volta para gestão (mantém o estado atual).')) return;
    setBusy(id);
    try { await api.dismissDelivery(id); setItems((xs) => xs.filter((x) => x.id !== id)); notifyChanged(); }
    catch (e) { setError(e.message); } finally { setBusy(null); }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-slate-800">A entregar</h1>
        <span className="rounded-full bg-amber-100 text-amber-700 text-sm px-2 py-0.5">{items.length}</span>
        <button onClick={reload} className="ml-auto text-sm text-brand underline">atualizar</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Sem retornos por entregar. 🎉
        </p>
      ) : items.map((w) => (
        <div key={w.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium text-slate-800">{w.pm || w.id_ordem} — {w.denominacao}</div>
              <div className="text-xs text-slate-400">
                {[w.department_name || w.zona, w.commune, w.tipo_trabalho].filter(Boolean).join(' · ')}
              </div>
              <div className="text-xs text-slate-400">
                {[w.team_name, w.cdt && `CDT: ${w.cdt}`].filter(Boolean).join(' · ')}
              </div>
            </div>
            <StateBadge code={w.return_estado || w.estado} />
          </div>

          {/* Retorno submetido pelo terreno */}
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium">Retorno</span>
              {w.return_user && <span>· {w.return_user}</span>}
              {w.return_at && <span>· {new Date(w.return_at).toLocaleString('pt-PT')}</span>}
              {w.gps_lat != null && <span>· GPS {Number(w.gps_lat).toFixed(4)}, {Number(w.gps_lng).toFixed(4)}</span>}
            </div>
            {w.return_obs && <p className="mt-1 text-slate-700">{w.return_obs}</p>}
            {Array.isArray(w.photos) && w.photos.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {w.photos.map((p) => (
                  <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                    <img src={p.thumb_url || p.url} alt="" className="h-16 w-16 object-cover rounded-lg border border-slate-200" />
                  </a>
                ))}
              </div>
            )}
            {(!w.photos || w.photos.length === 0) && <p className="mt-1 text-xs text-slate-400">Sem fotos.</p>}
          </div>

          <div className="mt-3 flex gap-2">
            <button onClick={() => deliver(w.id)} disabled={busy === w.id}
              className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {busy === w.id ? '…' : 'Marcar como entregue'}
            </button>
            {canReturn && (
              <button onClick={() => dismiss(w.id)} disabled={busy === w.id}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">
                Devolver ao dashboard
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
