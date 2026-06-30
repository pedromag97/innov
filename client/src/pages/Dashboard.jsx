import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { STATES, stateColor } from '../states.js';
import MapView from '../components/MapView.jsx';
import StateBadge from '../components/StateBadge.jsx';
import CountryFlag from '../components/CountryFlag.jsx';
import { fmtDate } from '../format.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [works, setWorks] = useState([]);
  const [allWorks, setAllWorks] = useState([]); // sem filtros, p/ construir as listas de opções
  const [teams, setTeams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ estado: '', team_id: '', country: '', department_id: '', zona: '', cdt: '', tipo_trabalho: '', q: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');

  useEffect(() => { api.listTeams().then((d) => setTeams(d.teams)).catch(() => {}); }, []);
  useEffect(() => { api.listDepartments().then((d) => setDepartments(d.departments)).catch(() => {}); }, []);
  useEffect(() => { api.listWorks({ active: 1 }).then((d) => setAllWorks(d.works)).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    api.listWorks({ ...filters, active: 1 })
      .then((d) => { setWorks(d.works); setError(''); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  const points = useMemo(
    () => works.map((w) => ({
      id: w.id, lat: w.lat, lng: w.lng, estado: w.estado,
      title: `${w.id_ordem} — ${w.denominacao}`,
      subtitle: [w.commune || w.zona, w.tipo_trabalho].filter(Boolean).join(' · '),
    })),
    [works]
  );

  const distinct = (key) => [...new Set(allWorks.map((w) => w[key]).filter(Boolean))].sort();
  const zonas = useMemo(() => distinct('zona'), [allWorks]);
  const cdts = useMemo(() => distinct('cdt'), [allWorks]);
  const tipos = useMemo(() => distinct('tipo_trabalho'), [allWorks]);

  // Agrupa os trabalhos por país + zona/departamento (cada zona/país numa tabela).
  const grouped = useMemo(() => {
    const g = new Map();
    for (const w of works) {
      const zonaLabel = w.department_name ? `${w.department_name}${w.zona ? ` · ${w.zona}` : ''}` : (w.zona || 'Sem zona');
      const key = `${w.country || ''}|${zonaLabel}`;
      if (!g.has(key)) g.set(key, { country: w.country, label: zonaLabel, items: [] });
      g.get(key).items.push(w);
    }
    return [...g.values()].sort((a, b) => (a.country || '').localeCompare(b.country || '') || a.label.localeCompare(b.label));
  }, [works]);

  async function doExport(fmt) {
    setExporting(fmt);
    try {
      await api.downloadExport(fmt, filters);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting('');
    }
  }

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="mx-auto max-w-7xl p-4 grid gap-4 lg:grid-cols-[1fr_360px]">
      {/* Mapa — coluna lateral mais pequena e fixa (secundário) */}
      <section className="order-2">
        <div className="lg:sticky lg:top-4">
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm h-[38vh] lg:h-[56vh] bg-white">
            <MapView points={points} onPointClick={(p) => navigate(`/trabalhos/${p.id}/editar`)} />
          </div>
          <Legend />
        </div>
      </section>

      {/* Listagem — coluna principal (mais espaço) */}
      <aside className="order-1 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-800">Trabalhos ({works.length})</h1>
          <button
            onClick={() => navigate('/trabalhos/novo')}
            className="rounded-lg bg-brand text-white px-3 py-1.5 text-sm font-medium hover:bg-brand-dark"
          >
            + Novo
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Procurar…" value={filters.q} onChange={set('q')}
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          <select value={filters.estado} onChange={set('estado')} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Todos os estados</option>
            {STATES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
          </select>
          <select value={filters.team_id} onChange={set('team_id')} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Todas as equipas</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={filters.country} onChange={set('country')} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">PT + FR</option>
            <option value="PT">Portugal</option>
            <option value="FR">França</option>
          </select>
          <select value={filters.department_id} onChange={set('department_id')} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Todos os departamentos</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.country})</option>)}
          </select>
          <select value={filters.zona} onChange={set('zona')} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Todas as zonas</option>
            {zonas.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <select value={filters.tipo_trabalho} onChange={set('tipo_trabalho')} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Todos os tipos</option>
            {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filters.cdt} onChange={set('cdt')} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Todos os CDT</option>
            {cdts.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Export */}
        <div className="flex gap-2">
          <button onClick={() => doExport('kml')} disabled={!!exporting}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50">
            {exporting === 'kml' ? 'A exportar…' : 'Exportar KML'}
          </button>
          <button onClick={() => doExport('kmz')} disabled={!!exporting}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50">
            {exporting === 'kmz' ? 'A exportar…' : 'Exportar KMZ'}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Lista agrupada por departamento (subtotais + Entregues destacados) */}
        <div className="rounded-xl border border-slate-200 bg-white max-h-[72vh] overflow-auto">
          {loading ? (
            <p className="p-4 text-sm text-slate-500">A carregar…</p>
          ) : works.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Sem trabalhos para estes filtros.</p>
          ) : grouped.map(({ country, label, items }) => (
              <div key={`${country}|${label}`}>
                <div className="sticky top-0 z-[1] flex items-center gap-2 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <CountryFlag country={country} />
                  <span>{label}</span>
                  <span className="text-slate-400">({items.length})</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map((w) => (
                    <button key={w.id} onClick={() => navigate(`/trabalhos/${w.id}/editar`)}
                      className="w-full text-left p-3 hover:bg-slate-50 flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-800">{w.pm || w.id_ordem}</span>
                          {w.tipo_trabalho && (
                            <span className="rounded bg-slate-800 text-white text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5">
                              {w.tipo_trabalho}
                            </span>
                          )}
                          {w.estado === 'RDV_AGENDADO' && w.rdv_data && (
                            <span className="rounded bg-purple-600 text-white text-[11px] font-bold px-2 py-0.5">
                              📅 RDV {fmtDate(w.rdv_data)}
                            </span>
                          )}
                        </span>
                        <span className="block text-sm text-slate-500 truncate">{w.denominacao}</span>
                        <span className="block text-xs text-slate-400">
                          {[w.commune || w.zona, w.team_name, w.cdt && `CDT: ${w.cdt}`].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1.5 shrink-0">
                        <StateBadge code={w.estado} motivo={w.pendente_motivo} />
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          {w.zona}<CountryFlag country={w.country} />
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </aside>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
      {STATES.map((s) => (
        <span key={s.code} className="inline-flex items-center gap-1 text-xs text-slate-600">
          <span className="h-3 w-3 rounded-full" style={{ background: stateColor(s.code) }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}
