import { stateColor, stateLabel, motivoLabel } from '../states.js';

// Etiqueta colorida de um estado. Se PENDENTE e houver motivo, mostra "· motivo".
export default function StateBadge({ code, motivo, size = 'sm' }) {
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  const showMotivo = code === 'PENDENTE' && motivo;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium text-white ${pad}`}
      style={{ backgroundColor: stateColor(code) }}
    >
      {stateLabel(code)}{showMotivo ? ` · ${motivoLabel(motivo)}` : ''}
    </span>
  );
}
