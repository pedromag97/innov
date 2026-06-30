import { useEffect, useState } from 'react';

// Relógio de contagem decrescente até `date` (data_limite, 'YYYY-MM-DD').
// Conta até ao fim do dia limite. Atualiza a cada minuto. Cor por urgência.
function parts(target) {
  const ms = new Date(`${target}T23:59:59`).getTime() - Date.now();
  const overdue = ms < 0;
  const a = Math.abs(ms);
  return {
    overdue,
    days: Math.floor(a / 86400000),
    hours: Math.floor((a % 86400000) / 3600000),
    mins: Math.floor((a % 3600000) / 60000),
  };
}

export default function Countdown({ date, className = '' }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);
  if (!date) return null;
  const { overdue, days, hours, mins } = parts(date);
  const txt = days > 0 ? `${days}d ${hours}h` : `${hours}h ${mins}m`;
  const color = overdue ? 'bg-red-600' : days <= 1 ? 'bg-amber-500' : days <= 3 ? 'bg-amber-400' : 'bg-emerald-600';
  return (
    <span title={`Prazo de fecho: ${date}`}
      className={`inline-flex items-center gap-1 rounded text-white text-[11px] font-bold px-2 py-0.5 ${color} ${className}`}>
      ⏳ {overdue ? `atrasado ${txt}` : `faltam ${txt}`}
    </span>
  );
}
