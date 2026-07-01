import { useEffect, useState } from 'react';

const ICON = { image: '🖼️', pdf: '📄', email: '✉️', archive: '🗜️', other: '📎' };
const fmtSize = (n) => (!n ? '' : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);

function kindOf(file) {
  const m = (file.type || '').toLowerCase();
  const n = (file.name || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (n.endsWith('.eml') || n.endsWith('.msg')) return 'email';
  if (/\.(zip|rar|7z)$/.test(n)) return 'archive';
  return 'other';
}

// Anexos escolhidos ANTES de o trabalho existir (criação). Ficam em staging e são
// enviados após guardar. Fotos mostram pré-visualização imediata.
export default function PendingAttachments({ files, onChange }) {
  const [previews, setPreviews] = useState([]); // objectURLs (imagens), por índice

  useEffect(() => {
    const urls = files.map((f) => ((f.type || '').startsWith('image/') ? URL.createObjectURL(f) : null));
    setPreviews(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);

  function onPick(e) {
    const picked = [...(e.target.files || [])]; e.target.value = '';
    if (picked.length) onChange([...files, ...picked]);
  }
  function removeAt(i) { onChange(files.filter((_, j) => j !== i)); }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-slate-700 text-sm">Anexos {files.length > 0 && <span className="text-slate-400">({files.length})</span>}</h2>
        <label className="cursor-pointer rounded-lg bg-brand text-white px-3 py-1 text-xs font-medium hover:bg-brand-dark">
          + Anexar
          <input type="file" multiple onChange={onPick} className="hidden"
            accept="image/*,application/pdf,.eml,.msg,.zip,.rar,.doc,.docx,.xls,.xlsx" />
        </label>
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-slate-400">Sem anexos. Carrega fotos, PDF, mails ou .zip/.rar — sobem ao guardar o trabalho.</p>
      ) : (
        <>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {files.map((f, i) => {
              const kind = kindOf(f);
              return (
                <li key={i} className="relative group rounded-lg border border-slate-200 overflow-hidden">
                  {kind === 'image' && previews[i] ? (
                    <img src={previews[i]} alt={f.name} className="h-20 w-full object-cover" />
                  ) : (
                    <div className="h-20 flex items-center justify-center text-3xl bg-slate-50">{ICON[kind]}</div>
                  )}
                  <div className="px-2 py-1">
                    <div className="text-xs text-slate-700 truncate" title={f.name}>{f.name}</div>
                    <div className="text-[10px] text-slate-400">{fmtSize(f.size)}</div>
                  </div>
                  <button type="button" onClick={() => removeAt(i)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-600 text-white text-xs leading-5 opacity-0 group-hover:opacity-100">×</button>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-slate-400 mt-2">Estes ficheiros só são guardados quando carregares em “Guardar”.</p>
        </>
      )}
    </div>
  );
}
