// Mini-bandeira do país (CSS, não emoji — o Windows não renderiza emoji de bandeira).
const LABEL = { PT: 'Portugal', FR: 'França' };

export default function CountryFlag({ country, className = '' }) {
  if (!country) return null;
  const base = `inline-flex h-3.5 w-5 shrink-0 rounded-[2px] overflow-hidden border border-black/10 shadow-sm ${className}`;
  if (country === 'FR') {
    return (
      <span title={LABEL.FR} className={base}>
        <span className="flex-1" style={{ background: '#0055A4' }} />
        <span className="flex-1 bg-white" />
        <span className="flex-1" style={{ background: '#EF4135' }} />
      </span>
    );
  }
  if (country === 'PT') {
    return (
      <span title={LABEL.PT} className={base}>
        <span style={{ width: '40%', background: '#046A38' }} />
        <span className="flex-1" style={{ background: '#DA291C' }} />
      </span>
    );
  }
  // País sem bandeira desenhada: mostra o código num pequeno crachá.
  return (
    <span title={country}
      className={`inline-flex items-center justify-center h-3.5 min-w-5 px-0.5 rounded-[2px] bg-slate-400 text-white text-[8px] font-bold leading-none shrink-0 ${className}`}>
      {country}
    </span>
  );
}
