import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { STATES } from '../states.js';
import StateBadge from '../components/StateBadge.jsx';

export default function FieldReturn() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [work, setWork] = useState(null);
  const [estado, setEstado] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [files, setFiles] = useState([]);
  const [gps, setGps] = useState(null);     // {lat, lng}
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle|locating|ok|error
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getWork(id)
      .then((d) => { setWork(d.work); setEstado(d.work.estado); })
      .catch((e) => setError(e.message));
  }, [id]);

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
    setSubmitting(true);
    const fd = new FormData();
    fd.append('new_estado', estado);
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
          <StateBadge code={work.estado} />
        </div>
        <p className="text-slate-700">{work.denominacao}</p>
        {work.descricao && <p className="mt-1 text-sm text-slate-500">{work.descricao}</p>}
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-500">
          {work.zona && <><dt className="font-medium">Zona</dt><dd>{work.zona}</dd></>}
          {work.morada && <><dt className="font-medium">Morada</dt><dd>{work.morada}</dd></>}
          {work.lat != null && <><dt className="font-medium">Coords</dt><dd>{work.lat?.toFixed?.(5)}, {work.lng?.toFixed?.(5)}</dd></>}
        </dl>
      </div>

      {/* Formulário de retorno */}
      <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <h2 className="font-semibold text-slate-700">Retorno do trabalho</h2>

        <label className="block">
          <span className="block text-xs font-medium text-slate-500 mb-1">Novo estado</span>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {STATES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
          </select>
        </label>

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
