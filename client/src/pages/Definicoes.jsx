import { useEffect, useState } from 'react';
import { api } from '../api.js';
import CountryFlag from '../components/CountryFlag.jsx';

// Definições da app (gerente/admin). Por agora: gestão de países.
export default function Definicoes() {
  const [countries, setCountries] = useState([]);
  const [form, setForm] = useState({ code: '', name: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function reload() {
    try { const d = await api.listCountries(1); setCountries(d.countries); setError(''); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { reload(); }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.createCountry({ code: form.code, name: form.name });
      setForm({ code: '', name: '' }); reload();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function patch(code, b) { try { await api.updateCountry(code, b); reload(); } catch (e) { setError(e.message); } }

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-800">Definições</h1>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-700 text-sm">Países</h2>
        <p className="text-xs text-slate-500">Os países usados nos trabalhos, filtros e âmbitos. Acrescenta novos conforme a operação cresce.</p>

        <form onSubmit={save} className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap gap-2 items-end">
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1">Código *</span>
            <input required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              maxLength={3} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase" placeholder="ES" />
          </label>
          <label className="block flex-1 min-w-[160px]">
            <span className="block text-xs font-medium text-slate-500 mb-1">Nome *</span>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Espanha" />
          </label>
          <button disabled={saving} className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
            {saving ? 'A guardar…' : '+ Adicionar país'}
          </button>
        </form>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {countries.map((c) => (
            <div key={c.code} className={`flex items-center gap-3 p-3 ${c.active ? '' : 'opacity-50'}`}>
              <CountryFlag country={c.code} />
              <span className="font-medium text-slate-700">{c.name}</span>
              <span className="text-xs rounded bg-slate-100 px-2 py-0.5 text-slate-500">{c.code}</span>
              <button onClick={() => patch(c.code, { active: !c.active })}
                className={`ml-auto rounded px-2 py-1 text-xs ${c.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                {c.active ? 'Ativo' : 'Inativo'}
              </button>
            </div>
          ))}
          {countries.length === 0 && <p className="p-3 text-sm text-slate-400">Sem países.</p>}
        </div>
      </section>
    </div>
  );
}
