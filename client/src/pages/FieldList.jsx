import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { STATES } from '../states.js';
import MapView from '../components/MapView.jsx';
import StateBadge from '../components/StateBadge.jsx';

// Vista da equipa de terreno: mapa read-only + lista dos trabalhos atribuídos.
export default function FieldList() {
  const navigate = useNavigate();
  const [works, setWorks] = useState([]);
  const [estado, setEstado] = useState('');
  const [view, setView] = useState('mapa'); // 'mapa' | 'lista'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.listWorks(estado ? { estado } : {})
      .then((d) => { setWorks(d.works); setError(''); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [estado]);

  const points = useMemo(
    () => works.map((w) => ({
      id: w.id, lat: w.lat, lng: w.lng, estado: w.estado,
      title: `${w.id_ordem} — ${w.denominacao}`,
      subtitle: w.zona,
    })),
    [works]
  );

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Barra de controlo */}
      <div className="flex items-center gap-2 p-2 bg-white border-b border-slate-200">
        <select value={estado} onChange={(e) => setEstado(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm flex-1">
          <option value="">Todos os meus trabalhos</option>
          {STATES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
        </select>
        <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
          <button onClick={() => setView('mapa')} className={`px-3 py-1.5 ${view === 'mapa' ? 'bg-brand text-white' : 'bg-white'}`}>Mapa</button>
          <button onClick={() => setView('lista')} className={`px-3 py-1.5 ${view === 'lista' ? 'bg-brand text-white' : 'bg-white'}`}>Lista</button>
        </div>
      </div>

      {error && <p className="p-3 text-sm text-red-600">{error}</p>}

      {view === 'mapa' ? (
        <div className="flex-1 min-h-0">
          <MapView points={points} onPointClick={(p) => navigate(`/terreno/${p.id}`)} />
        </div>
      ) : (
        <div className="flex-1 overflow-auto divide-y divide-slate-100 bg-white">
          {loading ? <p className="p-4 text-sm text-slate-500">A carregar…</p>
            : works.length === 0 ? <p className="p-4 text-sm text-slate-500">Sem trabalhos atribuídos.</p>
            : works.map((w) => (
              <button key={w.id} onClick={() => navigate(`/terreno/${w.id}`)}
                className="w-full text-left p-4 hover:bg-slate-50 flex items-center justify-between gap-2">
                <span>
                  <span className="font-medium text-slate-800">{w.id_ordem}</span>
                  <span className="block text-sm text-slate-500">{w.denominacao}</span>
                  <span className="block text-xs text-slate-400">{w.zona}</span>
                </span>
                <StateBadge code={w.estado} />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
