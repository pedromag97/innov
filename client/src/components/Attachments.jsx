import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const ICON = { image: '🖼️', pdf: '📄', email: '✉️', archive: '🗜️', other: '📎' };
const fmtSize = (n) => (!n ? '' : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);

// Anexos de um trabalho: PDF / imagens / mails.
// canEdit = pode carregar/apagar (backoffice); senão só ver/descarregar (terreno).
export default function Attachments({ workId, canEdit = false }) {
  const [items, setItems] = useState([]);
  const [previews, setPreviews] = useState({}); // id -> objectURL (thumbnails de imagem)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!workId) return;
    api.listAttachments(workId).then((d) => setItems(d.attachments || [])).catch((e) => setError(e.message));
  }, [workId]);
  useEffect(() => { load(); }, [load]);

  // Miniaturas das imagens (descarrega o blob com autenticação).
  useEffect(() => {
    let active = true; const urls = [];
    (async () => {
      for (const a of items) {
        if (a.kind === 'image' && !previews[a.id]) {
          try {
            const blob = await api.downloadAttachment(workId, a.id);
            if (!active) return;
            const url = URL.createObjectURL(blob); urls.push(url);
            setPreviews((p) => ({ ...p, [a.id]: url }));
          } catch { /* ignora */ }
        }
      }
    })();
    return () => { active = false; urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onPick(e) {
    const files = [...(e.target.files || [])]; e.target.value = '';
    if (!files.length) return;
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      await api.uploadAttachments(workId, fd);
      load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function open(a) {
    try {
      const blob = await api.downloadAttachment(workId, a.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { setError(err.message); }
  }

  async function remove(a) {
    if (!confirm(`Apagar o anexo "${a.filename}"?`)) return;
    try { await api.deleteAttachment(workId, a.id); load(); } catch (err) { setError(err.message); }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-slate-700 text-sm">Anexos {items.length > 0 && <span className="text-slate-400">({items.length})</span>}</h2>
        {canEdit && (
          <label className="cursor-pointer rounded-lg bg-brand text-white px-3 py-1 text-xs font-medium hover:bg-brand-dark">
            {busy ? 'A carregar…' : '+ Anexar'}
            <input type="file" multiple onChange={onPick} className="hidden"
              accept="image/*,application/pdf,.eml,.msg,.zip,.rar,.doc,.docx,.xls,.xlsx" disabled={busy} />
          </label>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Sem anexos.{canEdit ? ' Carrega PDF, imagens ou mails.' : ''}</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((a) => (
            <li key={a.id} className="relative group rounded-lg border border-slate-200 overflow-hidden">
              <button type="button" onClick={() => open(a)} className="block w-full text-left hover:bg-slate-50" title={a.filename}>
                {a.kind === 'image' && previews[a.id] ? (
                  <img src={previews[a.id]} alt={a.filename} className="h-20 w-full object-cover" />
                ) : (
                  <div className="h-20 flex items-center justify-center text-3xl bg-slate-50">{ICON[a.kind] || ICON.other}</div>
                )}
                <div className="px-2 py-1">
                  <div className="text-xs text-slate-700 truncate">{a.filename}</div>
                  <div className="text-[10px] text-slate-400">{fmtSize(a.size)}</div>
                </div>
              </button>
              {canEdit && (
                <button type="button" onClick={() => remove(a)}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-600 text-white text-xs leading-5 opacity-0 group-hover:opacity-100">×</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
