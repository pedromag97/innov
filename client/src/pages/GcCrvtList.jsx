import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import StateBadge from '../components/StateBadge.jsx';
import CountryFlag from '../components/CountryFlag.jsx';

// Trabalhos Pendentes com motivo "GC - CRVT Enviado" (aguardam resposta),
// fora do dashboard. Recuperar limpa o motivo e volta ao fluxo.
export default function GcCrvtList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  async function reload() {
    setLoading(true);
    try { const d = await api.listWorks({ estado: 'PENDENTE', pendente_motivo: 'GC_CRVT_ENVIADO' }); setItems(d.works); setError(''); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  async function recuperar(w) {
    if (!confirm(`Recuperar "${w.pm || w.id_ordem}"? Sai desta lista e volta ao dashboard (Pendente, sem motivo).`)) return;
    setBusy(w.id);
    try {
      await api.updateWork(w.id, { pendente_motivo: null });
      setItems((xs) => xs.filter((x) => x.id !== w.id));
      window.dispatchEvent(new Event('fc-gccrvt-changed'));
    } catch (e) { setError(e.message); } finally { setBusy(null); }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/dashboard')} className="rounded-lg border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50">← Dashboard</button>
        <h1 className="text-lg font-bold text-slate-800">GC · CRVT Enviado</h1>
        <span className="rounded-full bg-sky-100 text-sky-700 text-sm px-2 py-0.5">{items.length}</span>
        <button onClick={reload} className="ml-auto text-sm text-brand underline">atualizar</button>
      </div>
      <p className="text-xs text-slate-500">Trabalhos pendentes com o CRVT já enviado — a aguardar resposta. Fora do dashboard. Recupera quando houver retorno.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Nada a aguardar GC/CRVT. 🎉</p>
      ) : items.map((w) => (
        <div key={w.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <button onClick={() => navigate(`/trabalhos/${w.id}/editar`)} className="min-w-0 text-left hover:underline">
              <div className="font-medium text-slate-800">{w.pm || w.id_ordem} — {w.denominacao}</div>
              <div className="text-xs text-slate-400">{[w.department_name || w.zona, w.commune, w.tipo_trabalho].filter(Boolean).join(' · ')}</div>
              <div className="text-xs text-slate-400">{[w.team_name, w.cdt && `CDT: ${w.cdt}`].filter(Boolean).join(' · ')}</div>
              {w.tarefas && <div className="text-xs text-slate-500 mt-0.5">🛠️ {w.tarefas}</div>}
            </button>
            <span className="flex flex-col items-end gap-1.5 shrink-0">
              <StateBadge code={w.estado} motivo={w.pendente_motivo} />
              <span className="flex items-center gap-1 text-[10px] text-slate-400">{w.zona}<CountryFlag country={w.country} /></span>
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => recuperar(w)} disabled={busy === w.id}
              className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {busy === w.id ? '…' : '↩ Recuperar (→ Pendente)'}
            </button>
            <button onClick={() => navigate(`/trabalhos/${w.id}/editar`)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Abrir</button>
          </div>
        </div>
      ))}
    </div>
  );
}
