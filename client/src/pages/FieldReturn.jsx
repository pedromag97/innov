import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { STATES, PENDENTE_MOTIVOS } from '../states.js';
import StateBadge from '../components/StateBadge.jsx';
import CountryFlag from '../components/CountryFlag.jsx';

export default function FieldReturn() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [work, setWork] = useState(null);
  const [estado, setEstado] = useState('');
  const [motivo, setMotivo] = useState('');
  const [rdv, setRdv] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [files, setFiles] = useState([]);
  const [gps, setGps] = useState(null);     // {lat, lng}
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle|locating|ok|error
  const [example, setExample] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getWork(id)
      .then((d) => { setWork(d.work); setEstado(d.work.estado); setMotivo(d.work.pendente_motivo || ''); setRdv(d.work.rdv_data || ''); })
      .catch((e) => setError(e.message));
  }, [id]);

  // Exemplo de retorno do tipo de trabalho (para a equipa ver o que enviar).
  useEffect(() => {
    if (!work?.department_id || !work?.tipo_trabalho) return;
    api.listWorkTypes(work.department_id).then((d) => {
      const wt = (d.items || []).find((x) => x.name === work.tipo_trabalho);
      setExample(wt?.example_return || '');
    }).catch(() => {});
  }, [work?.department_id, work?.tipo_trabalho]);

  // Captura GPS automaticamente ao abrir o retorno.
  useEffect(() => {
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('ok'); },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  function onPickFiles(e) {
    setFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
    e.target.value = ''; // permite voltar a escolher o mesmo ficheiro
  }
  const removeFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (estado === 'RDV_AGENDADO' && !rdv) { setError('Indique a data do RDV.'); return; }
    setSubmitting(true);
    const fd = new FormData();
    fd.append('new_estado', estado);
    fd.append('pendente_motivo', estado === 'PENDENTE' ? (motivo || '') : '');
    fd.append('rdv_data', estado === 'RDV_AGENDADO' ? (rdv || '') : '');
    fd.append('observacoes', observacoes);
    if (gps) { fd.append('gps_lat', gps.lat); fd.append('gps_lng', gps.lng); }
    files.forEach((f) => fd.append('photos', f));
    try {
      await api.submitReturn(id, fd);
      setDone(true);
      setTimeout(() => navigate('/terreno'), 1400);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !work) return <p className="p-4 text-red-600">{error}</p>;
  if (!work) return <p className="p-4 text-slate-500">A carregar…</p>;

  if (done) return (
    <div className="p-8 text-center">
      <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-green-100 flex items-center justify-center text-3xl">✓</div>
      <p className="font-semibold text-slate-800">Retorno submetido!</p>
      <p className="text-sm text-slate-500">O backoffice foi notificado.</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-lg p-4 space-y-4">
      {/* Detalhes do trabalho */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-slate-800">{work.id_ordem}</h1>
          <span className="flex items-center gap-2"><CountryFlag country={work.country} /><StateBadge code={work.estado} motivo={work.pendente_motivo} /></span>
        </div>
        <p className="text-slate-700">{work.denominacao}</p>
        {work.descricao && <p className="mt-1 text-sm text-slate-500">{work.descricao}</p>}
        {work.tarefas && <p className="mt-1 text-sm text-slate-600"><span className="font-medium">Tarefas:</span> {work.tarefas}</p>}
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-500">
          {work.pm && <><dt className="font-medium">PM</dt><dd>{work.pm}</dd></>}
          {work.commune && <><dt className="font-medium">Commune</dt><dd>{work.commune}</dd></>}
          {work.tipo_trabalho && <><dt className="font-medium">Tipo</dt><dd>{work.tipo_trabalho}</dd></>}
          {work.cdt && <><dt className="font-medium">CDT</dt><dd>{work.cdt}</dd></>}
          {work.zona && <><dt className="font-medium">Zona</dt><dd>{work.zona}</dd></>}
          {work.morada && <><dt className="font-medium">Morada</dt><dd>{work.morada}</dd></>}
          {work.lat != null && <><dt className="font-medium">Coords</dt><dd>{work.lat?.toFixed?.(5)}, {work.lng?.toFixed?.(5)}</dd></>}
        </dl>
      </div>

      {/* Exemplo de retorno do tipo de trabalho */}
      {example && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-semibold text-amber-800 mb-1">📋 Exemplo de retorno ({work.tipo_trabalho})</div>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{example}</p>
        </div>
      )}

      {/* Formulário de retorno */}
      <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <h2 className="font-semibold text-slate-700">Retorno do trabalho</h2>

        <label className="block">
          <span className="block text-xs font-medium text-slate-500 mb-1">Novo estado</span>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {STATES.filter((s) => s.code !== 'ENTREGUE').map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
          </select>
        </label>

        {estado === 'PENDENTE' && (
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1">Motivo</span>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">— sem motivo —</option>
              {PENDENTE_MOTIVOS.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
            </select>
          </label>
        )}
        {estado === 'RDV_AGENDADO' && (
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1">Data do RDV *</span>
            <input type="date" required value={rdv} onChange={(e) => setRdv(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
        )}

        <label className="block">
          <span className="block text-xs font-medium text-slate-500 mb-1">Observações</span>
          <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Notas do terreno…" />
        </label>

        {/* Fotos: câmara ou galeria, múltiplas */}
        <div>
          <span className="block text-xs font-medium text-slate-500 mb-1">Fotos</span>
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-center hover:bg-slate-50">
              📷 Câmara
              <input type="file" accept="image/*" capture="environment" multiple onChange={onPickFiles} className="hidden" />
            </label>
            <label className="flex-1 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-center hover:bg-slate-50">
              🖼️ Galeria
              <input type="file" accept="image/*" multiple onChange={onPickFiles} className="hidden" />
            </label>
          </div>
          {files.length > 0 && (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative">
                  <img src={URL.createObjectURL(f)} alt="" className="h-16 w-full object-cover rounded-lg" />
                  <button type="button" onClick={() => removeFile(i)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-600 text-white text-xs leading-5">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GPS automático */}
        <div className="text-xs">
          <span className="font-medium text-slate-500">GPS: </span>
          {gpsStatus === 'locating' && <span className="text-slate-400">a localizar…</span>}
          {gpsStatus === 'ok' && <span className="text-green-600">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</span>}
          {gpsStatus === 'error' && <span className="text-amber-600">indisponível (continua a submeter sem GPS)</span>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={submitting}
          className="w-full rounded-lg bg-brand text-white py-2.5 font-medium hover:bg-brand-dark disabled:opacity-50">
          {submitting ? 'A submeter…' : 'Submeter retorno'}
        </button>
      </form>
    </div>
  );
}
