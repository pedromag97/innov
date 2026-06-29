import { stateColor, stateLabel } from '../states.js';

// Etiqueta colorida de um estado.
export default function StateBadge({ code, size = 'sm' }) {
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium text-white ${pad}`}
      style={{ backgroundColor: stateColor(code) }}
    >
      {stateLabel(code)}
    </span>
  );
}
