import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { STATES, PENDENTE_MOTIVOS } from '../states.js';
import MapView from '../components/MapView.jsx';
import StateBadge from '../components/StateBadge.jsx';
import CountryFlag from '../components/CountryFlag.jsx';
import Countdown from '../components/Countdown.jsx';
import Attachments from '../components/Attachments.jsx';
import { useCountries } from '../hooks/useCountries.js';

const EMPTY = {
  id_ordem: '', denominacao: '', descricao: '',
  pm: '', commune: '', sro_bpi: '', tipo_trabalho: '', cdt: '', tarefas: '', ticket_ref: '', valor: '',
  lat: null, lng: null, morada: '',
  estado: 'PENDENTE', pendente_motivo: '', rdv_data: '', data_entrega: '', data_limite: '',
  visivel_terreno: true, country: 'PT', zona: '', department_id: '', team_id: '',
};

// Garante que o valor atual (ex.: importado, fora do catálogo) aparece na lista.
function withCurrent(list, current) {
  const a = [...list];
  if (current && !a.includes(current)) a.unshift(current);
  return a;
}

export default function WorkForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [teams, setTeams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);
  const [cdts, setCdts] = useState([]);
  const [pms, setPms] = useState([]);   // catálogo PM->commune->SRO-BPI do departamento
  const countries = useCountries();
  const [history, setHistory] = useState([]);
  const [returns, setReturns] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.listDepartments().then((d) => setDepartments(d.departments)).catch(() => {}); }, []);

  // Catálogos do departamento escolhido: tipos, CDTs, equipas + zona auto.
  useEffect(() => {
    const dep = form.department_id;
    api.listTeams(dep || undefined).then((d) => setTeams(d.teams)).catch(() => {});
    if (!dep) { setWorkTypes([]); setCdts([]); setPms([]); return; }
    api.listWorkTypes(dep).then((d) => setWorkTypes(d.items.map((x) => x.name))).catch(() => {});
    api.listCdts(dep).then((d) => setCdts(d.items.map((x) => x.name))).catch(() => {});
    api.listPms(dep).then((d) => setPms(d.items || [])).catch(() => setPms([]));
    const d = departments.find((x) => String(x.id) === String(dep));
    if (d && d.zona) setForm((f) => (f.zona === d.zona ? f : { ...f, zona: d.zona }));
  }, [form.department_id, departments]);

  useEffect(() => {
    if (!isEdit) return;
    api.getWork(id).then((d) => setForm({
      ...EMPTY, ...d.work, team_id: d.work.team_id || '', department_id: d.work.department_id || '',
      rdv_data: d.work.rdv_data || '', data_entrega: d.work.data_entrega || '', data_limite: d.work.data_limite || '',
    })).catch((e) => setError(e.message));
    api.getWorkHistory(id).then((d) => setHistory(d.history)).catch(() => {});
    api.getWorkReturns(id).then((d) => setReturns(d.returns)).catch(() => {});
  }, [id, isEdit]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const onDragEnd = useCallback(({ lat, lng }) => setForm((f) => ({ ...f, lat, lng })), []);

  const [geoStatus, setGeoStatus] = useState(''); // ''|locating|ok|fail
  const hasCoords = form.lat !== '' && form.lat != null && form.lng !== '' && form.lng != null;
  // Georreferencia uma morada/commune e coloca o pin no mapa.
  async function doGeocode(query) {
    const q = (query || '').trim();
    if (!q) return;
    setGeoStatus('locating');
    try {
      const r = await api.geocode(q, form.country);
      if (r && r.found) { setForm((f) => ({ ...f, lat: r.lat, lng: r.lng })); setGeoStatus('ok'); }
      else setGeoStatus('fail');
    } catch { setGeoStatus('fail'); }
  }
  // Ao sair do campo morada: geocodifica automaticamente se ainda não há coordenadas.
  const onMoradaBlur = () => { if (form.morada && !hasCoords) doGeocode(form.morada); };

  // País: ao mudar, larga o departamento se já não pertencer a esse país.
  const onCountry = (e) => {
    const country = e.target.value;
    setForm((f) => {
      const dep = departments.find((d) => String(d.id) === String(f.department_id));
      return { ...f, country, department_id: dep && dep.country === country ? f.department_id : '' };
    });
  };

  // PM em texto livre: ao bater certo com o catálogo, preenche commune + SRO-BPI.
  const onPm = (e) => {
    const pm = e.target.value;
    const match = pms.find((p) => p.pm.toLowerCase() === pm.trim().toLowerCase());
    setForm((f) => (match
      ? { ...f, pm, commune: match.commune || f.commune, sro_bpi: match.sro_bpi || f.sro_bpi }
      : { ...f, pm }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      ...form,
      lat: form.lat === '' ? null : form.lat,
      lng: form.lng === '' ? null : form.lng,
      team_id: form.team_id || null,
      department_id: form.department_id || null,
      pendente_motivo: form.estado === 'PENDENTE' ? (form.pendente_motivo || null) : null,
      rdv_data: form.estado === 'RDV_AGENDADO' ? (form.rdv_data || null) : null,
      data_entrega: form.data_entrega || null,
      data_limite: form.data_limite || null,
      valor: form.valor === '' || form.valor == null ? null : Number(form.valor),
    };
    if (form.estado === 'RDV_AGENDADO' && !form.rdv_data) {
      setError('Indique a data do RDV (obrigatória quando RDV Agendado).');
      setSaving(false);
      return;
    }
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
          {isEdit && <span className="flex items-center gap-2"><CountryFlag country={form.country} /><StateBadge code={form.estado} motivo={form.pendente_motivo} size="md" /></span>}
        </div>

        <Field label="ID Ordem / Dossier *"><input required value={form.id_ordem} onChange={set('id_ordem')} className="inp" /></Field>
        <Field label="Denominação *"><input required value={form.denominacao} onChange={set('denominacao')} className="inp" /></Field>
        <Field label="País *">
          <select value={form.country} onChange={onCountry} className="inp">
            {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Departamento *">
          <select value={form.department_id || ''} onChange={set('department_id')} className="inp">
            <option value="">— escolher departamento —</option>
            {departments.filter((d) => d.country === form.country).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="PM">
            <input value={form.pm || ''} onChange={onPm} className="inp" placeholder="PM008" list="pm-list"
              autoComplete="off" disabled={!form.department_id} />
            <datalist id="pm-list">
              {pms.map((p) => <option key={p.id} value={p.pm}>{p.commune}{p.sro_bpi ? ` · ${p.sro_bpi}` : ''}</option>)}
            </datalist>
          </Field>
          <Field label="Commune"><input value={form.commune || ''} onChange={set('commune')} className="inp" placeholder="SARAN" /></Field>
          <Field label="SRO-BPI"><input value={form.sro_bpi || ''} onChange={set('sro_bpi')} className="inp" placeholder="SRO-BPI-11452216" /></Field>
          <Field label="Tipo de trabalho">
            <select value={form.tipo_trabalho || ''} onChange={set('tipo_trabalho')} className="inp" disabled={!form.department_id}>
              <option value="">{form.department_id ? '— escolher —' : '— escolhe o departamento —'}</option>
              {withCurrent(workTypes, form.tipo_trabalho).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="CDT (condutor)">
            <select value={form.cdt || ''} onChange={set('cdt')} className="inp" disabled={!form.department_id}>
              <option value="">{form.department_id ? '— escolher —' : '— escolhe o departamento —'}</option>
              {withCurrent(cdts, form.cdt).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tarefas"><input value={form.tarefas || ''} onChange={set('tarefas')} className="inp" placeholder="420m 12FO, 1 PBO" /></Field>
          <Field label="Valor (€)"><input type="number" step="0.01" min="0" value={form.valor ?? ''} onChange={set('valor')} className="inp" placeholder="0.00" /></Field>
        </div>
        <Field label="Descrição / Observações"><textarea value={form.descricao || ''} onChange={set('descricao')} rows={2} className="inp" /></Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data de entrega"><input type="date" value={form.data_entrega || ''} onChange={set('data_entrega')} className="inp" /></Field>
          <Field label="Data limite (fecho)">
            <input type="date" value={form.data_limite || ''} onChange={set('data_limite')} className="inp" />
            {form.data_limite && <div className="mt-1"><Countdown date={form.data_limite} /></div>}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Estado">
            <select value={form.estado} onChange={set('estado')} className="inp">
              {STATES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          </Field>
          {form.estado === 'PENDENTE' ? (
            <Field label="Motivo (pendente)">
              <select value={form.pendente_motivo || ''} onChange={set('pendente_motivo')} className="inp">
                <option value="">— sem motivo —</option>
                {PENDENTE_MOTIVOS.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
              </select>
            </Field>
          ) : form.estado === 'RDV_AGENDADO' ? (
            <Field label="Data do RDV *">
              <input type="date" required value={form.rdv_data || ''} onChange={set('rdv_data')} className="inp" />
            </Field>
          ) : <div />}
          <Field label="Equipa">
            <select value={form.team_id} onChange={set('team_id')} className="inp">
              <option value="">— sem equipa —</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label={form.department_id ? 'Zona (do departamento)' : 'Zona'}>
            <input value={form.zona || ''} onChange={set('zona')} className="inp" disabled={!!form.department_id}
              placeholder="Orleans, Grenoble…" />
          </Field>
          <Field label="Ticket ref"><input value={form.ticket_ref || ''} onChange={set('ticket_ref')} className="inp" placeholder="C35…, SRO-BPI…" /></Field>
        </div>

        {form.estado === 'PENDENTE' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={form.visivel_terreno !== false}
                onChange={(e) => setForm((f) => ({ ...f, visivel_terreno: e.target.checked }))} className="mt-0.5" />
              <span className="text-sm">
                <span className="font-medium text-amber-900">Mostrar no mapa e à equipa de terreno</span>
                <span className="block text-xs text-amber-700">
                  Trabalho pendente — se ainda não vale a pena enviar ao terreno (ex.: à espera de GC/CRVT/neve),
                  desmarca para o esconder do mapa e da equipa de terreno.
                </span>
              </span>
            </label>
          </div>
        )}

        <Field label="Morada (georreferenciada automaticamente)">
          <div className="flex gap-2">
            <input value={form.morada || ''} onChange={set('morada')} onBlur={onMoradaBlur} className="inp" placeholder="Rua, nº, localidade" />
            <button type="button" onClick={() => doGeocode(form.morada || form.commune)}
              disabled={geoStatus === 'locating' || (!form.morada && !form.commune)}
              className="shrink-0 rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-50 disabled:opacity-50" title="Localizar pela morada ou commune">
              📍 Localizar
            </button>
          </div>
          <span className="block text-xs mt-1">
            {geoStatus === 'locating' && <span className="text-slate-400">a localizar…</span>}
            {geoStatus === 'ok' && <span className="text-green-600">✓ coordenadas obtidas</span>}
            {geoStatus === 'fail' && <span className="text-amber-600">não encontrado — ajusta a morada ou arrasta o pin</span>}
            {!geoStatus && <span className="text-slate-400">Escreve a morada (ou usa a commune) — as coordenadas são obtidas automaticamente.</span>}
          </span>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude"><input value={form.lat ?? ''} onChange={set('lat')} className="inp" placeholder="38.7223" /></Field>
          <Field label="Longitude"><input value={form.lng ?? ''} onChange={set('lng')} className="inp" placeholder="-9.1393" /></Field>
        </div>
        <p className="text-xs text-slate-400">Arrasta o pin no mapa (ou clica) para ajustar as coordenadas.</p>

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

        {isEdit && <Attachments workId={id} canEdit />}

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
