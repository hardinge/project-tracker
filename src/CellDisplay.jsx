import { getCurrentWeek } from './storage.js';

// ─── Colour maps ──────────────────────────────────────────────────────────────

const IMP_COLOR = { '1': '#10b981', '2': '#3b82f6', '3': '#eab308', '4': '#ef4444', '5': '#111827' };

const STATUS_LABEL = {
  Potential: 'P',
  Active:    'A',
  Someday:   'S',
  Done:      'D',
  Cancelled: 'C',
};

const STATUS_STYLE = {
  Potential: { background: '#713f12', color: '#fef08a' },
  Active:    { background: '#052e16', color: '#4ade80' },
  Someday:   { background: '#431407', color: '#fb923c' },
  Done:      { background: '#0c1a3a', color: '#60a5fa' },
  Cancelled: { background: '#1c0a0a', color: '#f87171' },
};

// ─── Week validation ──────────────────────────────────────────────────────────

/** Validates ww-yy format (e.g. "27-26"). Week must be 1–53, year 2 digits. */
export function isValidWeek(val) {
  if (!val) return true;
  const m = val.match(/^(\d{1,2})-(\d{2})$/);
  if (!m) return false;
  const week = parseInt(m[1], 10);
  return week >= 1 && week <= 53;
}

// ─── Cell display renderer ────────────────────────────────────────────────────

export default function CellDisplay({ val, def, inherited }) {
  if (def.type === 'empty') return null;
  if (val === '' || val == null) {
    return def.readonly ? null : <span style={{ color: '#3a4060' }}>—</span>;
  }

  if (def.type === 'currency_sum') {
    const n = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(n) || n === 0) return null;
    return (
      <span style={{
        color: n > 0 ? '#10b981' : '#ef4444',
        fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace',
      }}>
        {n > 0 ? '+' : '−'}${Math.abs(n).toLocaleString()}
      </span>
    );
  }

  if (def.type === 'time') {
    return <span style={{ fontFamily: 'monospace' }}>{val}</span>;
  }

  if (def.type === 'week') {
    const m = val.match(/^(\d{1,2})-(\d{2})$/);
    if (m) {
      const { week: currentWeek, year: currentYear } = getCurrentWeek();
      const targetWeek = parseInt(m[1], 10);
      const targetYear = 2000 + parseInt(m[2], 10);
      const diff = (targetYear - currentYear) * 52 + (targetWeek - currentWeek);
      const bg = diff <= 0 ? '#10b981'
               : diff === 1 ? '#3b82f6'
               : diff === 2 ? '#eab308'
               : diff === 3 ? '#f97316'
               : diff === 4 ? '#ef4444'
               :               '#111827';
      return (
        <span style={{ background: bg, color: '#fff', borderRadius: 3, padding: '1px 7px', fontWeight: 700, fontFamily: 'monospace' }}>
          {val}
        </span>
      );
    }
    return <span style={{ fontFamily: 'monospace', color: '#7dd3fc' }}>{val}</span>;
  }

  if (def.type === 'priority') {
    const x = parseInt(val.split('.')[0], 10);
    const bg = x === 0 ? '#10b981'
             : x === 1 ? '#3b82f6'
             : x === 2 ? '#eab308'
             : x === 3 ? '#f97316'
             :            '#ef4444';
    return (
      <span style={{ background: bg, color: '#fff', borderRadius: inherited ? 10 : 3, padding: '1px 7px', fontWeight: 700 }}>
        {val}
      </span>
    );
  }

  if (def.type === 'date') {
    const d = new Date(val + 'T00:00:00');
    if (isNaN(d)) return <span>{val}</span>;
    const day = d.toLocaleDateString('en-GB', { weekday: 'short' });
    return <span>{day} {d.getDate()}-{d.getMonth() + 1}-{d.getFullYear()}</span>;
  }

  if (def.type === 'id') {
    return <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{val}</span>;
  }

  if (def.type === 'status') {
    const s = STATUS_STYLE[val];
    if (!s) return <span>{val}</span>;
    return (
      <span style={{ ...s, borderRadius: 3, padding: '1px 7px', fontWeight: 700, fontFamily: 'monospace' }}>
        {STATUS_LABEL[val] ?? val}
      </span>
    );
  }

  if (def.type === 'available') {
    if (val === 'Yes') return (
      <span style={{
        display: 'inline-block', width: '0.75em', height: '0.75em',
        borderRadius: '50%', background: '#4ade80', verticalAlign: 'middle',
      }} />
    );
    if (val === 'Potential') return (
      <span style={{
        display: 'inline-block', width: '0.75em', height: '0.75em',
        borderRadius: '50%', background: '#f97316', verticalAlign: 'middle',
      }} />
    );
    if (val === 'No') return (
      <span style={{
        display: 'inline-block', width: '0.75em', height: '0.75em',
        borderRadius: '50%', background: '#475569', verticalAlign: 'middle',
      }} />
    );
    return null;
  }

  if (def.type === 'dropdown') {
    if (IMP_COLOR[val]) {
      return (
        <span style={{
          background: IMP_COLOR[val], color: '#fff',
          borderRadius: inherited ? 10 : 3, padding: '1px 7px', fontWeight: 700,
        }}>{val}</span>
      );
    }
    if (val === 'routine')    return <span style={{ background: '#312e81', color: '#a5b4fc', borderRadius: 3, padding: '1px 7px' }}>routine</span>;
    if (val === 'not r')      return <span>{val}</span>;
    if (val === 'event')      return <span style={{ background: '#164e63', color: '#67e8f9', borderRadius: 3, padding: '1px 7px' }}>event</span>;
    if (val === 'not e')      return <span>{val}</span>;
    if (val === 'parallel')   return <span>{'||'}</span>;
    if (val === 'sequential') return <span>{'>>'}</span>;
    return <span>{val}</span>;
  }

  if (def.type === 'currency') {
    const n = parseFloat(val);
    if (isNaN(n)) return <span>{val}</span>;
    return (
      <span style={{
        color: n >= 0 ? '#10b981' : '#ef4444',
        fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace',
      }}>
        {n >= 0 ? '+' : '−'}${Math.abs(n).toLocaleString()}
      </span>
    );
  }

  if (def.type === 'url') {
    return (
      <a
        href={val} target="_blank" rel="noopener noreferrer"
        style={{ color: '#3b82f6', textDecoration: 'none' }}
        onClick={e => e.stopPropagation()}
      >
        🔗 link
      </a>
    );
  }

  return <span>{val}</span>;
}
