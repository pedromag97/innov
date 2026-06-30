import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useCountries } from '../hooks/useCountries.js';

const eur = (n) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);

// Faturação: tickets entregues, com valor produzido e estado do attachement.
// Acesso: Gerente/Admin. Tabela agrupada por departamento + totais.
export default function Billing() {
  const [works, setWorks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const countries = useCountries();
  const [filters, setFilters] = useState({ department_id: '', country: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { api.listDepartments().then((d) => setDepartments(d.departments)).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true);
    api.getBilling(filters)
      .then((d) => { setWorks(d.works); setError(''); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  // Atualiza um campo localmente + persiste.
  function patch(id, body) {
    setWorks((ws) => ws.map((w) => (w.id === id ? { ...w, ...body } : w)));
    api.updateWork(id, body).catch((e) => setError(e.message));
  }

  // Agrupa por departamento + subtotais.
  const groups = useMemo(() => {
    const g = new Map();
    for (const w of works) {
      const key = w.department_name || (w.country === 'PT' ? 'Portugal' : 'Sem departamento');
      if (!g.has(key)) g.set(key, []);
      g.get(key).push(w);
    }
    return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [works]);

  const grand = useMemo(() => works.reduce((s, w) => s + (Number(w.valor) || 0), 0), [works]);
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold text-slate-800">Faturação — Entregues</h1>
        <span className="rounded-full bg-emerald-100 text-emerald-800 text-sm px-3 py-0.5 font-semibold">
          Total: {eur(grand)} · {works.length} trabalho{works.length !== 1 ? 's' : ''}
        </span>
        <div className="ml-auto flex gap-2">
          <select value={filters.department_id} onChange={set('department_id')} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Todos os departamentos</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filters.country} onChange={set('country')} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Todos os países</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">A carregar…</p>
      ) : works.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Sem trabalhos entregues.</p>
      ) : groups.map(([dept, list]) => {
        const sub = list.reduce((a, w) => ({
          valor: a.valor + (Number(w.valor) || 0),
          feito: a.feito + (w.attachement_feito ? 1 : 0),
          enviado: a.enviado + (w.attachement_enviado ? 1 : 0),
        }), { valor: 0, feito: 0, enviado: 0 });
        return (
          <div key={dept} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-slate-100 px-3 py-2 text-sm border-b border-slate-200">
              <span className="font-semibold text-slate-700">{dept}</span>
              <span className="text-slate-500">{list.length} trabalhos</span>
              <span className="font-semibold text-emerald-700">{eur(sub.valor)}</span>
              <span className="ml-auto text-xs text-slate-500">
                Attachement feito {sub.feito}/{list.length} · enviado {sub.enviado}/{list.length}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs bg-slate-50">
                <tr>
                  <th className="text-left p-2">Trabalho</th>
                  <th className="text-left p-2 hidden sm:table-cell">Equipa</th>
                  <th className="text-right p-2">Valor (€)</th>
                  <th className="text-center p-2">Att. feito</th>
                  <th className="text-center p-2">Enviada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50">
                    <td className="p-2">
                      <div className="font-medium text-slate-700">{w.pm || w.id_ordem}{w.tipo_trabalho ? ` · ${w.tipo_trabalho}` : ''}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[26ch] sm:max-w-none">{w.denominacao}</div>
                    </td>
                    <td className="p-2 hidden sm:table-cell text-slate-500">{w.team_name || '—'}</td>
                    <td className="p-2 text-right">
                      <input type="number" step="0.01" min="0" defaultValue={w.valor ?? ''}
                        onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== (w.valor ?? null)) patch(w.id, { valor: v }); }}
                        className="w-24 text-right rounded border border-slate-300 px-2 py-1 text-sm" placeholder="0.00" />
                    </td>
                    <td className="p-2 text-center">
                      <input type="checkbox" checked={!!w.attachement_feito}
                        onChange={(e) => patch(w.id, { attachement_feito: e.target.checked, ...(e.target.checked ? {} : { attachement_enviado: false }) })}
                        className="h-4 w-4 accent-emerald-600" />
                    </td>
                    <td className="p-2 text-center">
                      <input type="checkbox" checked={!!w.attachement_enviado} disabled={!w.attachement_feito}
                        onChange={(e) => patch(w.id, { attachement_enviado: e.target.checked })}
                        className="h-4 w-4 accent-emerald-600 disabled:opacity-40" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
