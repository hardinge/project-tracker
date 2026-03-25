import { useState, useEffect, useRef } from 'react';
import { IU_OPTIONS } from './storage.js';

const DATE_OPTIONS = [
  { value: '',          label: 'All Dates' },
  { value: 'overdue',   label: 'Overdue' },
  { value: 'today',     label: 'Today' },
  { value: 'tomorrow',  label: 'Tomorrow' },
  { value: 'thisWeek',  label: 'This Week' },
  { value: 'nextWeek',  label: 'Next Week' },
  { value: 'thisMonth', label: 'This Month' },
];

// Navigation order for filter controls
const CTRL_ORDER = ['area', 'type', 'show', 'priority', 'importance', 'date', 'search'];
const TYPE_LABELS = ['Area', 'Goal', 'Project', 'Step', 'Action'];
const PRIORITY_LABELS = ['X', '0', '1', '2', '3', '4', '5'];

function getMaxSubIdx(ctrl) {
  if (ctrl === 'type')     return TYPE_LABELS.length - 1;
  if (ctrl === 'priority') return PRIORITY_LABELS.length - 1;
  return 0;
}

function moveFocusRight({ ctrl, subIdx = 0 }) {
  if ((ctrl === 'type' || ctrl === 'priority') && subIdx < getMaxSubIdx(ctrl)) {
    return { ctrl, subIdx: subIdx + 1 };
  }
  const i = CTRL_ORDER.indexOf(ctrl);
  if (i >= CTRL_ORDER.length - 1) return null;
  return { ctrl: CTRL_ORDER[i + 1], subIdx: 0 };
}

function moveFocusLeft({ ctrl, subIdx = 0 }) {
  if ((ctrl === 'type' || ctrl === 'priority') && subIdx > 0) {
    return { ctrl, subIdx: subIdx - 1 };
  }
  const i = CTRL_ORDER.indexOf(ctrl);
  if (i <= 0) return null;
  const prev = CTRL_ORDER[i - 1];
  return { ctrl: prev, subIdx: getMaxSubIdx(prev) };
}

const BASE_DROPDOWN_STYLE = {
  background: '#1a1d2e', border: '1px solid #2d3149', borderRadius: 4,
  color: '#94a3b8', padding: '3px 6px', fontSize: 13,
  fontFamily: 'inherit', cursor: 'pointer', userSelect: 'none',
  display: 'inline-flex', alignItems: 'center', gap: 4,
};

// Custom dropdown — replaces native <select> so we control open/close state
function FilterDropdown({ value, onChange, options, isFocused, onNavKey, dropdownRef }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tentIdx, setTentIdx] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, minWidth: 0 });

  // Close when this control loses logical focus
  useEffect(() => {
    if (!isFocused) setIsOpen(false);
  }, [isFocused]);

  function openDropdown() {
    const idx = options.findIndex(o => o.value === value);
    setTentIdx(idx >= 0 ? idx : 0);
    // Calculate fixed position from button rect so the menu floats above the page
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 2, left: rect.left, minWidth: rect.width });
    }
    setIsOpen(true);
  }

  function confirmSelection() {
    onChange(options[tentIdx].value);
    setIsOpen(false);
  }

  function handleKeyDown(e) {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen) confirmSelection();
      else openDropdown();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) setTentIdx(i => Math.max(0, i - 1));
      // ArrowUp when closed: no-op (ArrowUp from filter → table is not specified)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (isOpen) setTentIdx(i => Math.min(options.length - 1, i + 1));
      else onNavKey(e); // closed + ArrowDown = return to table
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (!isOpen) { e.preventDefault(); onNavKey(e); }
    }
  }

  const currentLabel = options.find(o => o.value === value)?.label ?? value;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        ref={dropdownRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
        style={{
          ...BASE_DROPDOWN_STYLE,
          outline: isFocused ? '2px solid #3b82f6' : 'none',
          outlineOffset: -1,
        }}
      >
        <span>{currentLabel}</span>
        <span style={{ color: '#475569', fontSize: 9 }}>▼</span>
      </div>
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: menuPos.top,
          left: menuPos.left,
          minWidth: menuPos.minWidth,
          zIndex: 9999,
          background: '#1a1d2e', border: '1px solid #3b82f6', borderRadius: 4,
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          {options.map((opt, i) => (
            <div
              key={opt.value}
              onMouseDown={e => { e.preventDefault(); onChange(opt.value); setIsOpen(false); }}
              style={{
                padding: '4px 10px',
                paddingLeft: opt.depth === 1 ? 22 : 10,
                fontSize: opt.depth === 1 ? 12 : 13,
                cursor: 'pointer',
                background: i === tentIdx ? '#1e3a5f' : 'transparent',
                color: i === tentIdx ? '#e2e8f0' : (opt.depth === 1 ? '#7c6fad' : '#94a3b8'),
                borderLeft: `2px solid ${i === tentIdx ? '#3b82f6' : 'transparent'}`,
              }}
            >
              {opt.depth === 1 && (
                <span style={{ marginRight: 4, opacity: 0.6 }}>↳</span>
              )}
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TYPE_COLORS = {
  Area:    { active: '#1a1a22', border: '#a1a1aa' },
  Goal:    { active: '#2d1b6e', border: '#7c3aed' },
  Project: { active: '#1a2a5e', border: '#2563eb' },
  Step:    { active: '#063a2a', border: '#059669' },
  Action:  { active: '#3a2800', border: '#d97706' },
};
const PRIORITY_COLORS = {
  X: { active: '#1a1a2e', border: '#64748b' },
  0: { active: '#052e16', border: '#10b981' },
  1: { active: '#0c1a3a', border: '#3b82f6' },
  2: { active: '#1c1a00', border: '#eab308' },
  3: { active: '#2a1500', border: '#f97316' },
  4: { active: '#3a0a0a', border: '#ef4444' },
  5: { active: '#1a0a1a', border: '#a855f7' },
};

function ToggleBtn({ active, onClick, color, border, children, isFocused, onNavKey, btnRef }) {
  return (
    <button
      ref={btnRef}
      tabIndex={-1}
      onClick={onClick}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          onClick();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          onNavKey(e);
        }
      }}
      style={{
        background: active ? color : '#12151f',
        border: `1px solid ${active ? border : '#2d3149'}`,
        outline: isFocused ? '2px solid #3b82f6' : 'none',
        outlineOffset: -1,
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

export default function FilterBar({
  filters, onChange, rows,
  filterFocus, onFilterFocusChange, onReturnToTable, navMode,
}) {
  function update(key, val) { onChange({ ...filters, [key]: val }); }

  function toggleType(type) {
    const next = new Set(filters.types);
    if (next.has(type)) next.delete(type); else next.add(type);
    update('types', next);
  }

  function togglePriority(p) {
    const next = new Set(filters.priority);
    if (next.has(p)) next.delete(p); else next.add(p);
    update('priority', next);
  }

  // Refs for each focusable control
  const areaRef       = useRef(null);
  const typeRefs      = useRef([]);
  const showRef       = useRef(null);
  const priorityRefs  = useRef([]);
  const importanceRef = useRef(null);
  const dateRef       = useRef(null);
  const searchRef     = useRef(null);

  // Move DOM focus to the correct element when filterFocus changes
  useEffect(() => {
    if (!filterFocus || !navMode) return;
    const { ctrl, subIdx = 0 } = filterFocus;
    const focusMap = {
      area:       () => areaRef.current?.focus(),
      type:       () => typeRefs.current[subIdx]?.focus(),
      show:       () => showRef.current?.focus(),
      priority:   () => priorityRefs.current[subIdx]?.focus(),
      importance: () => importanceRef.current?.focus(),
      date:       () => dateRef.current?.focus(),
      search:     () => searchRef.current?.focus(),
    };
    focusMap[ctrl]?.();
  }, [filterFocus, navMode]);

  // Centralised handler for arrow-key navigation between controls
  function handleNavKey(e, currentFocus) {
    if (!navMode) return;
    if (e.key === 'ArrowLeft') {
      const next = moveFocusLeft(currentFocus);
      if (next) onFilterFocusChange(next);
    } else if (e.key === 'ArrowRight') {
      const next = moveFocusRight(currentFocus);
      if (next) onFilterFocusChange(next);
    } else if (e.key === 'ArrowDown') {
      onReturnToTable();
    }
  }

  const areaOptions = [{ value: '', label: 'All' }];
  for (const row of rows) {
    if (row.depth === 0) {
      areaOptions.push({ value: row.id, label: row.values[0] || '(unnamed)', depth: 0 });
    } else if (row.depth === 1) {
      areaOptions.push({ value: row.id, label: row.values[0] || '(unnamed)', depth: 1 });
    }
  }

  const importanceOptions = [
    { value: '', label: 'All' },
    ...IU_OPTIONS.map(o => ({ value: o, label: o })),
  ];

  return (
    <div
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
        <FilterDropdown
          value={filters.area}
          onChange={v => update('area', v)}
          options={areaOptions}
          isFocused={filterFocus?.ctrl === 'area'}
          onNavKey={e => handleNavKey(e, { ctrl: 'area', subIdx: 0 })}
          dropdownRef={areaRef}
        />
      </div>

      <Divider />

      {/* Type toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Label>Type</Label>
        {TYPE_LABELS.map((type, i) => (
          <ToggleBtn
            key={type}
            btnRef={el => { typeRefs.current[i] = el; }}
            active={filters.types.has(type)}
            onClick={() => toggleType(type)}
            color={TYPE_COLORS[type].active}
            border={TYPE_COLORS[type].border}
            isFocused={filterFocus?.ctrl === 'type' && filterFocus?.subIdx === i}
            onNavKey={e => handleNavKey(e, { ctrl: 'type', subIdx: i })}
          >
            {type[0]}
          </ToggleBtn>
        ))}
      </div>

      <Divider />

      {/* Show */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Label>Show</Label>
        <FilterDropdown
          value={filters.nextAction}
          onChange={v => update('nextAction', v)}
          options={[
            { value: 'all',         label: 'All' },
            { value: 'nextActions', label: 'Next Actions' },
          ]}
          isFocused={filterFocus?.ctrl === 'show'}
          onNavKey={e => handleNavKey(e, { ctrl: 'show', subIdx: 0 })}
          dropdownRef={showRef}
        />
      </div>

      <Divider />

      {/* Priority toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Label>Pri</Label>
        {PRIORITY_LABELS.map((p, i) => (
          <ToggleBtn
            key={p}
            btnRef={el => { priorityRefs.current[i] = el; }}
            active={filters.priority.has(p)}
            onClick={() => togglePriority(p)}
            color={PRIORITY_COLORS[p].active}
            border={PRIORITY_COLORS[p].border}
            isFocused={filterFocus?.ctrl === 'priority' && filterFocus?.subIdx === i}
            onNavKey={e => handleNavKey(e, { ctrl: 'priority', subIdx: i })}
          >
            {p}
          </ToggleBtn>
        ))}
      </div>

      <Divider />

      {/* Importance */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Label>Imp</Label>
        <FilterDropdown
          value={filters.iu}
          onChange={v => update('iu', v)}
          options={importanceOptions}
          isFocused={filterFocus?.ctrl === 'importance'}
          onNavKey={e => handleNavKey(e, { ctrl: 'importance', subIdx: 0 })}
          dropdownRef={importanceRef}
        />
      </div>

      <Divider />

      {/* Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Label>Date</Label>
        <FilterDropdown
          value={filters.date}
          onChange={v => update('date', v)}
          options={DATE_OPTIONS}
          isFocused={filterFocus?.ctrl === 'date'}
          onNavKey={e => handleNavKey(e, { ctrl: 'date', subIdx: 0 })}
          dropdownRef={dateRef}
        />
      </div>

      <Divider />

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
        <input
          ref={searchRef}
          tabIndex={-1}
          type="text"
          placeholder="search…"
          value={filters.search}
          onChange={e => update('search', e.target.value)}
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === 'Escape') {
              e.preventDefault();
              update('search', '');
              // Return focus to previous control (date)
              const next = moveFocusLeft({ ctrl: 'search', subIdx: 0 });
              if (next) onFilterFocusChange(next);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              onReturnToTable();
            }
            // ArrowLeft/Right: let cursor move within text naturally
          }}
          style={{
            background: '#0f1117', border: '1px solid #2d3149', borderRadius: 4,
            color: '#e2e8f0', padding: '3px 8px', fontSize: 13, width: 160,
            outline: filterFocus?.ctrl === 'search' ? '2px solid #3b82f6' : 'none',
            outlineOffset: -1,
            fontFamily: 'inherit',
          }}
        />
        {filters.search && (
          <button
            tabIndex={-1}
            onClick={() => update('search', '')}
            onKeyDown={e => e.stopPropagation()}
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
