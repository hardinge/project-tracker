import { useState, useEffect, useMemo } from 'react';
import { getType, TYPE_BADGE_COLOR, INDENT_PX } from './storage.js';

const PANEL_TYPES = ['Area', 'Goal', 'Project'];

const TYPE_TOGGLE_COLORS = {
  Area:    { active: '#1a1a22', border: '#a1a1aa' },
  Goal:    { active: '#2d1b6e', border: '#7c3aed' },
  Project: { active: '#1a2a5e', border: '#2563eb' },
};

export default function LeftPanel({
  rows,
  selectedIds,
  onSelectionChange,
  onMoveToTable,
  panelRef,
}) {
  const [focusIdx, setFocusIdx]     = useState(0);
  const [typeFilter, setTypeFilter] = useState(new Set());
  const [panelFocused, setPanelFocused] = useState(false);

  // All Area/Goal/Project rows, optionally filtered by type
  const panelRows = useMemo(() => {
    const base = rows
      .map((row, globalIdx) => ({ row, globalIdx }))
      .filter(({ row }) => PANEL_TYPES.includes(getType(row.depth)));
    if (typeFilter.size === 0) return base;
    return base.filter(({ row }) => typeFilter.has(getType(row.depth)));
  }, [rows, typeFilter]);

  // Clamp focusIdx when the list shrinks
  useEffect(() => {
    if (panelRows.length > 0 && focusIdx >= panelRows.length) {
      setFocusIdx(panelRows.length - 1);
    }
  }, [panelRows.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll focused item into view
  useEffect(() => {
    document.getElementById(`lp-row-${focusIdx}`)?.scrollIntoView({ block: 'nearest' });
  }, [focusIdx, panelFocused]);

  function toggleType(type) {
    setTypeFilter(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  }

  function toggleSelection(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange(next);
  }

  function handleKeyDown(e) {
    if (panelRows.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx(i => Math.min(i + 1, panelRows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onMoveToTable();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = panelRows[focusIdx];
      if (item) toggleSelection(item.row.id);
    }
  }

  return (
    <div style={{
      width: 260, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid #2d3149',
      background: '#0f1117',
    }}>
      {/* ── Filter bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '5px 10px', background: '#141724',
        borderBottom: '1px solid #2d3149', flexShrink: 0,
        height: 31, boxSizing: 'border-box',
      }}>
        <span style={{
          color: '#475569', fontSize: 12, letterSpacing: '0.6px',
          textTransform: 'uppercase', flexShrink: 0, marginRight: 2,
        }}>
          Type
        </span>
        {PANEL_TYPES.map(type => (
          <button
            key={type}
            tabIndex={-1}
            onClick={() => toggleType(type)}
            style={{
              background: typeFilter.has(type) ? TYPE_TOGGLE_COLORS[type].active : '#12151f',
              border: `1px solid ${typeFilter.has(type) ? TYPE_TOGGLE_COLORS[type].border : '#2d3149'}`,
              borderRadius: 3,
              color: typeFilter.has(type) ? '#e2e8f0' : '#475569',
              padding: '2px 7px', fontSize: 13, cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700, lineHeight: '16px',
              transition: 'all 0.1s',
            }}
          >
            {type[0]}
          </button>
        ))}
      </div>

      {/* ── Scrollable list ── */}
      <div
        ref={panelRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => setPanelFocused(true)}
        onBlur={() => setPanelFocused(false)}
        style={{ flex: 1, overflowY: 'auto', outline: 'none' }}
      >
        {panelRows.map(({ row }, i) => {
          const type       = getType(row.depth);
          const isSelected = selectedIds.has(row.id);
          const isCursor   = panelFocused && i === focusIdx;

          return (
            <div
              id={`lp-row-${i}`}
              key={row.id}
              onMouseDown={() => {
                setFocusIdx(i);
                panelRef.current?.focus();
                toggleSelection(row.id);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: `4px 8px 4px ${8 + row.depth * INDENT_PX}px`,
                background: isSelected ? '#1e3a5f' : 'transparent',
                outline: isCursor ? '2px solid #3b82f6' : 'none',
                outlineOffset: -2,
                cursor: 'default',
                fontSize: 14,
                color: isSelected ? '#e2e8f0' : '#94a3b8',
                fontWeight: type === 'Area' || type === 'Goal' ? 700 : 400,
                userSelect: 'none',
              }}
            >
              <span style={{
                flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                background: TYPE_BADGE_COLOR[type], color: '#fff',
                borderRadius: 2, padding: '2px 5px', textTransform: 'uppercase',
              }}>
                {type[0]}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.values[0] || '(unnamed)'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
