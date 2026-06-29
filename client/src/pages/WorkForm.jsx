import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { STATES } from '../states.js';
import MapView from '../components/MapView.jsx';
import StateBadge from '../components/StateBadge.jsx';

const EMPTY = {
  id_ordem: '', denominacao: '', descricao: '',
  lat: null, lng: null, morada: '',
  estado: 'PENDENTE', country: 'PT', zona: '', team_id: '',
};

export default function WorkForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [teams, setTeams] = useState([]);
  const [history, setHistory] = useState([]);
  const [returns, setReturns] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.listTeams().then((d) => setTeams(d.teams)).catch(() => {}); }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.getWork(id).then((d) => setForm({
      ...EMPTY, ...d.work, team_id: d.work.team_id || '',
    })).catch((e) => setError(e.message));
    api.getWorkHistory(id).then((d) => setHistory(d.history)).catch(() => {});
    api.getWorkReturns(id).then((d) => setReturns(d.returns)).catch(() => {});
  }, [id, isEdit]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const onDragEnd = useCallback(({ lat, lng }) => setForm((f) => ({ ...f, lat, lng })), []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      ...form,
      lat: form.lat === '' ? null : form.lat,
      lng: form.lng === '' ? null : form.lng,
      team_id: form.team_id || null,
    };
    try {
      if (isEdit) await api.updateWork(id, payload);
      else await api.createWork(payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm('Apagar este trabalho? Esta ação não pode ser revertida.')) return;
    try { await api.deleteWork(id); navigate('/dashboard'); }
    catch (err) { setError(err.message); }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 grid gap-4 lg:grid-cols-2">
      {/* Formulário */}
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-800">{isEdit ? 'Editar trabalho' : 'Novo trabalho'}</h1>
          {isEdit && <StateBadge code={form.estado} size="md" />}
        </div>

        <Field label="ID Ordem *"><input required value={form.id_ordem} onChange={set('id_ordem')} className="inp" /></Field>
        <Field label="Denominação *"><input required value={form.denominacao} onChange={set('denominacao')} className="inp" /></Field>
        <Field label="Descrição"><textarea value={form.descricao || ''} onChange={set('descricao')} rows={2} className="inp" /></Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Estado">
            <select value={form.estado} onChange={set('estado')} className="inp">
              {STATES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Equipa">
            <select value={form.team_id} onChange={set('team_id')} className="inp">
              <option value="">— sem equipa —</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="País">
            <select value={form.country} onChange={set('country')} className="inp">
              <option value="PT">Portugal</option>
              <option value="FR">França</option>
            </select>
          </Field>
          <Field label="Zona"><input value={form.zona || ''} onChange={set('zona')} className="inp" /></Field>
        </div>

        <Field label="Morada (alternativa às coordenadas)">
          <input value={form.morada || ''} onChange={set('morada')} className="inp" placeholder="Rua, nº, localidade" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude"><input value={form.lat ?? ''} onChange={set('lat')} className="inp" placeholder="38.7223" /></Field>
          <Field label="Longitude"><input value={form.lng ?? ''} onChange={set('lng')} className="inp" placeholder="-9.1393" /></Field>
        </div>
        <p className="text-xs text-slate-400">Arrasta o pin no mapa (ou clica) para definir as coordenadas.</p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving}
            className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
          <button type="button" onClick={() => navigate('/dashboard')}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancelar</button>
          {isEdit && (
            <button type="button" onClick={onDelete}
              className="ml-auto rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm hover:bg-red-50">Apagar</button>
          )}
        </div>
      </form>

      {/* Mapa + histórico */}
      <div className="space-y-4">
        <div className="rounded-xl overflow-hidden border border-slate-200 h-[42vh] bg-white">
          <MapView
            editable
            draggablePoint={form.lat != null && form.lat !== '' ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) } : null}
            onDragEnd={onDragEnd}
          />
        </div>

        {isEdit && returns.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-700 mb-2 text-sm">Retornos das equipas</h2>
            <ul className="space-y-2">
              {returns.map((r) => (
                <li key={r.id} className="text-sm border-l-2 border-brand pl-3">
                  <div className="flex items-center gap-2">
                    <StateBadge code={r.new_estado} />
                    <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString('pt-PT')}</span>
                  </div>
                  {r.observacoes && <p className="text-slate-600">{r.observacoes}</p>}
                  {r.photos?.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {r.photos.map((p) => (
                        <a key={p.id} href={p.url} target="_blank" rel="noreferrer"
                          className="text-xs text-brand underline">foto</a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isEdit && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-700 mb-2 text-sm">Histórico</h2>
            {history.length === 0 ? <p className="text-sm text-slate-400">Sem alterações.</p> : (
              <ul className="space-y-1 text-xs text-slate-500 max-h-48 overflow-auto">
                {history.map((h) => (
                  <li key={h.id}>
                    <span className="text-slate-400">{new Date(h.created_at).toLocaleString('pt-PT')}</span>{' '}
                    <span className="font-medium text-slate-600">{h.action}</span>
                    {h.field && <> · {h.field}: <em>{h.old_value || '∅'}</em> → <em>{h.new_value || '∅'}</em></>}
                    {h.user_email && <span className="text-slate-400"> · {h.user_email}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <style>{`.inp{width:100%;border:1px solid #cbd5e1;border-radius:.5rem;padding:.4rem .6rem;font-size:.875rem}
        .inp:focus{outline:2px solid #1d4ed8;outline-offset:-1px}`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
