import { IU_OPTIONS } from './storage.js';

const DATE_OPTIONS = [
  { value: '',           label: 'All Dates' },
  { value: 'overdue',    label: 'Overdue' },
  { value: 'today',      label: 'Today' },
  { value: 'tomorrow',   label: 'Tomorrow' },
  { value: 'thisWeek',   label: 'This Week' },
  { value: 'nextWeek',   label: 'Next Week' },
  { value: 'thisMonth',  label: 'This Month' },
];

const stopProp = e => e.stopPropagation();

const SEL_STYLE = {
  background: '#1a1d2e', border: '1px solid #2d3149', borderRadius: 4,
  color: '#94a3b8', padding: '3px 6px', fontSize: 13,
  fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
};

function Sel({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} onKeyDown={stopProp} style={SEL_STYLE}>
      {options.map(({ value: v, label: l }) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

const TYPE_COLORS = {
  Goal:    { active: '#2d1b6e', border: '#7c3aed' },
  Project: { active: '#1a2a5e', border: '#2563eb' },
  Step:    { active: '#063a2a', border: '#059669' },
  Action:  { active: '#3a2800', border: '#d97706' },
};
const REQ_COLORS = {
  Must: { active: '#3a0a0a', border: '#ef4444' },
  Need: { active: '#3a2600', border: '#f59e0b' },
  Want: { active: '#0a1a3a', border: '#3b82f6' },
};

function ToggleBtn({ active, onClick, color, border, children }) {
  return (
    <button
      onClick={onClick}
      onKeyDown={stopProp}
      style={{
        background: active ? color : '#12151f',
        border: `1px solid ${active ? border : '#2d3149'}`,
        borderRadius: 3, color: active ? '#e2e8f0' : '#475569',
        padding: '2px 7px', fontSize: 13, cursor: 'pointer',
        fontFamily: 'inherit', fontWeight: 700, transition: 'all 0.1s',
        lineHeight: '16px',
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 16, background: '#2d3149', flexShrink: 0 }} />;
}

function Label({ children }) {
  return (
    <span style={{
      color: '#475569', fontSize: 12, letterSpacing: '0.6px',
      textTransform: 'uppercase', flexShrink: 0,
    }}>
      {children}
    </span>
  );
}

export default function FilterBar({ filters, onChange, rows }) {
  const areas = rows.filter(r => r.depth === 0);

  function update(key, val) { onChange({ ...filters, [key]: val }); }

  function toggleType(type) {
    const next = new Set(filters.types);
    if (next.has(type)) next.delete(type); else next.add(type);
    update('types', next);
  }

  function toggleReq(r) {
    const next = new Set(filters.req);
    if (next.has(r)) next.delete(r); else next.add(r);
    update('req', next);
  }

  return (
    <div
      onKeyDown={stopProp}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '5px 20px', background: '#141724',
        borderBottom: '1px solid #2d3149', flexShrink: 0,
        overflowX: 'auto',
      }}
    >
      {/* Area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Label>Area</Label>
        <Sel
          value={filters.area}
          onChange={v => update('area', v)}
          options={[
            { value: '', label: 'All' },
            ...areas.map(a => ({ value: a.id, label: a.values[0] || '(unnamed)' })),
          ]}
        />
      </div>

      <Divider />

      {/* Type toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Label>Type</Label>
        {['Goal','Project','Step','Action'].map(type => (
          <ToggleBtn
            key={type}
            active={filters.types.has(type)}
            onClick={() => toggleType(type)}
            color={TYPE_COLORS[type].active}
            border={TYPE_COLORS[type].border}
          >
            {type[0]}
          </ToggleBtn>
        ))}
      </div>

      <Divider />

      {/* Next Action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Label>Show</Label>
        <Sel
          value={filters.nextAction}
          onChange={v => update('nextAction', v)}
          options={[
            { value: 'all',         label: 'All' },
            { value: 'nextActions', label: 'Next Actions' },
          ]}
        />
      </div>

      <Divider />

      {/* Requirement toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Label>Req</Label>
        {['Must','Need','Want'].map(r => (
          <ToggleBtn
            key={r}
            active={filters.req.has(r)}
            onClick={() => toggleReq(r)}
            color={REQ_COLORS[r].active}
            border={REQ_COLORS[r].border}
          >
            {r[0]}
          </ToggleBtn>
        ))}
      </div>

      <Divider />

      {/* Imp/Urg */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Label>I/U</Label>
        <Sel
          value={filters.iu}
          onChange={v => update('iu', v)}
          options={[
            { value: '', label: 'All' },
            ...IU_OPTIONS.map(o => ({ value: o, label: o })),
          ]}
        />
      </div>

      <Divider />

      {/* Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Label>Date</Label>
        <Sel
          value={filters.date}
          onChange={v => update('date', v)}
          options={DATE_OPTIONS}
        />
      </div>

      <Divider />

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
        <input
          type="text"
          placeholder="search…"
          value={filters.search}
          onChange={e => update('search', e.target.value)}
          onKeyDown={stopProp}
          style={{
            background: '#0f1117', border: '1px solid #2d3149', borderRadius: 4,
            color: '#e2e8f0', padding: '3px 8px', fontSize: 13, width: 160,
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        {filters.search && (
          <button
            onClick={() => update('search', '')}
            onKeyDown={stopProp}
            style={{
              background: 'none', border: 'none', color: '#64748b',
              cursor: 'pointer', fontSize: 14, padding: 0,
            }}
          >✕</button>
        )}
      </div>
    </div>
  );
}
