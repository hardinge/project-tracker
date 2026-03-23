import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  COL_DEFS, COL_HEADERS, COL_ORDER, COL_WIDTHS, INDENT_PX, NUM_COLS, TYPE_BADGE_COLOR,
  getType, makeRow, recomputeStructure, subtreeRange,
  computeAvailability, computePriority, computeVisible,
  getCurrentWeek, loadRows, saveRows, SEED_ROWS,
} from './storage.js';
import FilterBar from './FilterBar.jsx';

// ─── Cell display renderer ────────────────────────────────────────────────────

const IMP_COLOR = { '1': '#10b981', '2': '#3b82f6', '3': '#eab308', '4': '#ef4444', '5': '#111827' };

const STATUS_LABEL = {
  Potential: 'P',
  Active:    'A',
  Deferred:  'S',
  Completed: 'D',
  Cancelled: 'C',
};

const STATUS_STYLE = {
  Potential: { background: '#713f12', color: '#fef08a' },
  Active:    { background: '#052e16', color: '#4ade80' },
  Deferred:  { background: '#431407', color: '#fb923c' },
  Completed: { background: '#0c1a3a', color: '#60a5fa' },
  Cancelled: { background: '#1c0a0a', color: '#f87171' },
};

function CellDisplay({ val, def }) {
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
    return <span style={{ fontFamily: 'monospace', color: '#7dd3fc' }}>{val}</span>;
  }

  if (def.type === 'priority') {
    const y = parseInt(val.split('.')[1], 10);
    const bg = y === 0 ? '#10b981'
             : y === 1 ? '#3b82f6'
             : y === 2 ? '#eab308'
             : y === 3 ? '#f97316'
             : y === 4 ? '#ef4444'
             :            '#111827';
    return (
      <span style={{ background: bg, color: '#fff', borderRadius: 3, padding: '1px 7px', fontWeight: 700 }}>
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
    if (val === 'Yes') return <span style={{ color: '#4ade80', fontWeight: 700 }}>Available</span>;
    if (val === 'No')  return <span style={{ color: '#3a4060' }}>not a</span>;
    return null;
  }

  if (def.type === 'dropdown') {
    if (IMP_COLOR[val]) {
      return (
        <span style={{
          background: IMP_COLOR[val], color: '#fff',
          borderRadius: 3, padding: '1px 7px', fontWeight: 700,
        }}>{val}</span>
      );
    }
    if (val === 'routine')    return <span style={{ background: '#312e81', color: '#a5b4fc', borderRadius: 3, padding: '1px 7px' }}>routine</span>;
    if (val === 'not r')      return <span>{val}</span>;
    if (val === 'event')      return <span style={{ background: '#164e63', color: '#67e8f9', borderRadius: 3, padding: '1px 7px' }}>event</span>;
    if (val === 'not e')      return <span>{val}</span>;
    if (val === 'parallel')   return <span style={{ background: '#1e3a5f', color: '#93c5fd', borderRadius: 3, padding: '1px 7px' }}>parallel</span>;
    if (val === 'sequential') return <span>{val}</span>;
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

// ─── Week column format validation ────────────────────────────────────────────

/** Validates ww-yy format (e.g. "27-26"). Week must be 1–53, year 2 digits. */
function isValidWeek(val) {
  if (!val) return true;
  const m = val.match(/^(\d{1,2})-(\d{2})$/);
  if (!m) return false;
  const week = parseInt(m[1], 10);
  return week >= 1 && week <= 53;
}

// ─── Week number helper ───────────────────────────────────────────────────────

function getCurrentWeekNumber() { return getCurrentWeek().week; }

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProjectTracker() {
  const [rows, setRows]       = useState(null);
  const [dataReady, setDataReady] = useState(false);
  const [sel, setSel]         = useState({ r: 0, c: 0 });
  const [editing, setEditing] = useState(false);
  const [filters, setFilters] = useState(() => ({
    area:       '',
    types:      new Set(['Goal','Project','Step','Action']),
    nextAction: 'all',
    priority:   new Set(['X','0','1','2','3','4','5']),
    iu:         '',
    date:       '',
    search:     '',
  }));

  const inputRef     = useRef(null);
  const containerRef = useRef(null);

  // Ref to the latest rows so the unmount cleanup can save them without stale closure
  const pendingRowsRef = useRef(null);
  const hasPendingSave = useRef(false);

  // Load rows from server on mount
  useEffect(() => {
    let cancelled = false;
    async function load(attempt = 0) {
      try {
        const data = await loadRows();
        if (!cancelled) {
          setRows(data ?? SEED_ROWS);
          setDataReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          if (attempt < 3) {
            setTimeout(() => load(attempt + 1), 1000 * (attempt + 1));
          } else {
            console.error('[tracker] failed to load rows after retries:', err);
            setRows(SEED_ROWS);
            setDataReady(true);
          }
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist on every rows change (debounced 800ms, skips initial load).
  // Also tracks the latest rows so the unmount handler can flush them.
  useEffect(() => {
    if (!dataReady || rows === null) return;
    pendingRowsRef.current = rows;
    hasPendingSave.current = true;
    const t = setTimeout(() => {
      saveRows(rows);
      hasPendingSave.current = false;
    }, 800);
    return () => clearTimeout(t);
  }, [rows, dataReady]);

  // Flush any unsaved changes immediately when the component unmounts.
  // This covers HMR hot-reloads, which cancel the debounced save above.
  useEffect(() => {
    return () => {
      if (hasPendingSave.current && pendingRowsRef.current) {
        saveRows(pendingRowsRef.current);
      }
    };
  }, []);

  // ── Computed Available ────────────────────────────────────────────────────
  const computedAvailable = useMemo(() => computeAvailability(rows ?? []), [rows]);

  // ── Computed Priority ─────────────────────────────────────────────────────
  const computedPriority = useMemo(() => computePriority(rows ?? []), [rows]);

  // Focus input when editing starts
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.select) inputRef.current.select();
    }
  }, [editing, sel]);

  // ── Visible rows (filtered) ──────────────────────────────────────────────
  const visible = useMemo(
    () => computeVisible(rows ?? [], computedAvailable, computedPriority, filters),
    [rows, computedAvailable, computedPriority, filters],
  );

  // ── Visible index set (for $ sum) ─────────────────────────────────────────
  const visibleSet = useMemo(
    () => new Set(visible.map(v => v.globalIdx)),
    [visible],
  );

  // ── Computed $ sums — only count visible Action descendants ───────────────
  const computedSums = useMemo(() => {
    const sums = {};
    (rows ?? []).forEach((row, i) => {
      const type = getType(row.depth);
      if (type === 'Goal' || type === 'Project' || type === 'Step') {
        const [start, end] = subtreeRange(rows, i);
        let total = 0;
        for (let j = start + 1; j < end; j++) {
          if (getType(rows[j].depth) === 'Action' && visibleSet.has(j)) {
            const n = parseFloat(rows[j].values[3]);
            if (!isNaN(n)) total += n;
          }
        }
        sums[row.id] = total;
      }
    });
    return sums;
  }, [rows, visibleSet]);

  // Clamp sel.r when visible shrinks
  useEffect(() => {
    if (visible.length > 0 && sel.r >= visible.length) {
      setSel(s => ({ ...s, r: visible.length - 1 }));
    }
  }, [visible.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll selected row into view
  useEffect(() => {
    document.getElementById(`row-${sel.r}`)?.scrollIntoView({ block: 'nearest' });
  }, [sel.r]);

  // ── Cell update ──────────────────────────────────────────────────────────
  const updateCell = useCallback((id, col, val) => {
    setRows(prev =>
      prev.map(r => r.id === id
        ? { ...r, values: r.values.map((v, i) => i === col ? val : v) }
        : r
      )
    );
  }, []);

  // ── Keyboard ─────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    const numRows = visible.length;
    if (numRows === 0) return;

    if (editing) {
      // Only plain Enter exits edit mode; everything else (incl. Shift+Arrow) is left
      // to the browser so text selection works normally.
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setEditing(false);
        containerRef.current?.focus();
      }
      return;
    }

    const { r, c } = sel;
    const isCtrl  = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    // ── Plain arrow navigation (no modifier) ────────────────────────────────
    if (!isCtrl && !isShift) {
      if      (e.key === 'ArrowDown')  { e.preventDefault(); setSel({ r: Math.min(r + 1, numRows - 1), c }); }
      else if (e.key === 'ArrowUp')    { e.preventDefault(); setSel({ r: Math.max(r - 1, 0), c }); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setSel({ r, c: Math.min(c + 1, COL_ORDER.length - 1) }); }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); setSel({ r, c: Math.max(c - 1, 0) }); }
      else if (e.key === 'Enter')      { e.preventDefault(); setEditing(true); }
      return;
    }

    // ── Shift+Arrow — move rows ──────────────────────────────────────────────
    if (isShift && !isCtrl && e.key.startsWith('Arrow')) {
      e.preventDefault();
      const { globalIdx, row } = visible[r];

      if (e.key === 'ArrowUp') {
        // Move subtree above sibling immediately above
        let sibIdx = -1;
        for (let i = globalIdx - 1; i >= 0; i--) {
          if (rows[i].depth === row.depth) { sibIdx = i; break; }
          if (rows[i].depth < row.depth) break;
        }
        if (sibIdx === -1) return;
        const [ourStart, ourEnd] = subtreeRange(rows, globalIdx);
        const [sibStart, sibEnd] = subtreeRange(rows, sibIdx);
        setRows(prev => recomputeStructure([
          ...prev.slice(0, sibStart),
          ...prev.slice(ourStart, ourEnd),
          ...prev.slice(sibStart, sibEnd),
          ...prev.slice(ourEnd),
        ]));
        const sibVisCount = visible.filter(v => v.globalIdx >= sibStart && v.globalIdx < sibEnd).length;
        setSel(s => ({ ...s, r: s.r - sibVisCount }));

      } else if (e.key === 'ArrowDown') {
        // Move subtree below sibling immediately below
        const [ourStart, ourEnd] = subtreeRange(rows, globalIdx);
        if (ourEnd >= rows.length || rows[ourEnd].depth !== row.depth) return;
        const [sibStart, sibEnd] = subtreeRange(rows, ourEnd);
        setRows(prev => recomputeStructure([
          ...prev.slice(0, ourStart),
          ...prev.slice(sibStart, sibEnd),
          ...prev.slice(ourStart, ourEnd),
          ...prev.slice(sibEnd),
        ]));
        const sibVisCount = visible.filter(v => v.globalIdx >= sibStart && v.globalIdx < sibEnd).length;
        setSel(s => ({ ...s, r: s.r + sibVisCount }));

      } else if (e.key === 'ArrowRight') {
        // Indent: subtree becomes children of sibling immediately above
        if (row.depth >= 4) return;
        let sibIdx = -1;
        for (let i = globalIdx - 1; i >= 0; i--) {
          if (rows[i].depth === row.depth) { sibIdx = i; break; }
          if (rows[i].depth < row.depth) break;
        }
        if (sibIdx === -1) return;
        const [start, end] = subtreeRange(rows, globalIdx);
        setRows(prev => recomputeStructure(
          prev.map((rr, i) => i >= start && i < end ? { ...rr, depth: rr.depth + 1 } : rr)
        ));

      } else if (e.key === 'ArrowLeft') {
        // Outdent: subtree becomes siblings of current parent
        if (row.depth === 0) return;
        const [start, end] = subtreeRange(rows, globalIdx);
        setRows(prev => recomputeStructure(
          prev.map((rr, i) => i >= start && i < end ? { ...rr, depth: rr.depth - 1 } : rr)
        ));
      }
      return;
    }

    // ── Ctrl+Arrow — insert new rows ─────────────────────────────────────────
    if (isCtrl && !isShift && e.key.startsWith('Arrow')) {
      e.preventDefault();
      const { row, globalIdx } = visible[r];
      const [, ourEnd] = subtreeRange(rows, globalIdx);
      const visInSubtree = visible.filter(v => v.globalIdx >= globalIdx && v.globalIdx < ourEnd).length;

      if (e.key === 'ArrowRight') {
        // New child as last child (depth+1)
        if (row.depth >= 4) return;
        const newRow = makeRow(row.depth + 1, row.id, 0);
        setRows(prev => { const next = [...prev]; next.splice(ourEnd, 0, newRow); return recomputeStructure(next); });
        setTimeout(() => { setSel({ r: r + visInSubtree, c: 0 }); setEditing(true); }, 0);

      } else if (e.key === 'ArrowDown') {
        // New sibling below entire subtree (same depth)
        const newRow = makeRow(row.depth, row.parent_id, row.position + 1);
        setRows(prev => { const next = [...prev]; next.splice(ourEnd, 0, newRow); return recomputeStructure(next); });
        setTimeout(() => { setSel({ r: r + visInSubtree, c: 0 }); setEditing(true); }, 0);

      } else if (e.key === 'ArrowUp') {
        // New sibling immediately above (same depth)
        const newRow = makeRow(row.depth, row.parent_id, row.position);
        setRows(prev => { const next = [...prev]; next.splice(globalIdx, 0, newRow); return recomputeStructure(next); });
        setTimeout(() => { setSel({ r, c: 0 }); setEditing(true); }, 0);

      } else if (e.key === 'ArrowLeft') {
        // New row after subtree, outdented one level (depth-1)
        if (row.depth === 0) return;
        const newRow = makeRow(row.depth - 1, row.parent_id, 0);
        setRows(prev => { const next = [...prev]; next.splice(ourEnd, 0, newRow); return recomputeStructure(next); });
        setTimeout(() => { setSel({ r: r + visInSubtree, c: 0 }); setEditing(true); }, 0);
      }
      return;
    }

    // ── Ctrl+Delete — delete row and subtree ─────────────────────────────────
    if (isCtrl && e.key === 'Delete') {
      e.preventDefault();
      const { globalIdx } = visible[r];
      const [delStart, delEnd] = subtreeRange(rows, globalIdx);
      const confirmed = window.confirm('Delete this row and all its children? This cannot be undone.');
      if (!confirmed) return;
      setRows(prev => recomputeStructure([...prev.slice(0, delStart), ...prev.slice(delEnd)]));
      setSel(s => ({ ...s, r: Math.max(0, s.r - 1) }));
      return;
    }
  }, [editing, sel, visible, rows]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const selRow  = visible[sel.r];
  const selType = selRow ? getType(selRow.row.depth) : 'Area';

  if (!dataReady) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0f1117', fontFamily: "'DM Mono','Fira Code',monospace",
        color: '#475569', fontSize: 15,
      }}>
        Loading…
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      tabIndex={0}
      style={{
        fontFamily: "'DM Mono','Fira Code',monospace",
        height: '100vh', display: 'flex', flexDirection: 'column',
        background: '#0f1117', outline: 'none', userSelect: 'none',
      }}
    >
      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '10px 20px', background: '#1a1d2e',
        borderBottom: '1px solid #2d3149', flexShrink: 0,
      }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', letterSpacing: 1 }}>
          ◈ PROJECT TRACKER
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20, fontSize: 13, color: '#475569' }}>
          <span style={{
            background: '#1e2235', borderRadius: 4, padding: '2px 8px',
            color: '#64748b', fontWeight: 700, letterSpacing: 1, fontSize: 12,
          }}>
            W{getCurrentWeekNumber()}
          </span>
          {[
            ['↑↓←→',       'navigate'],
            ['Enter',       'edit'],
            ['Shift+↑↓←→', 'move/indent'],
            ['Ctrl+↑↓←→',  'insert'],
            ['Ctrl+Del',    'delete'],
          ].map(([key, label]) => (
            <span key={key}>
              <kbd style={{ background: '#1e2235', padding: '2px 5px', borderRadius: 3, color: '#94a3b8' }}>
                {key}
              </kbd>{' '}{label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <FilterBar filters={filters} onChange={setFilters} rows={rows} />

      {/* ── Column headers — permanent ── */}
      <div style={{ display: 'flex', background: '#1a1d2e', borderBottom: '2px solid #2d3149', flexShrink: 0 }}>
        {COL_WIDTHS.map((w, i) => (
          <div key={i} style={{
            width: w, minWidth: w, padding: '6px 10px',
            fontSize: 12, fontWeight: 700, color: '#64748b',
            textTransform: 'uppercase', letterSpacing: '0.8px',
            borderRight: '1px solid #2d3149', boxSizing: 'border-box', overflow: 'hidden',
          }}>
            {COL_HEADERS[i]}
          </div>
        ))}
      </div>

      {/* ── Rows ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        <div style={{ minWidth: COL_WIDTHS.reduce((a, b) => a + b, 0) }}>
          {visible.map(({ row, globalIdx }, rowIdx) => {
            const type     = getType(row.depth);
            const defs     = COL_DEFS[type];
            const isSelRow = sel.r === rowIdx;

            const rowBg = isSelRow ? '#1e3a5f'
              : type === 'Area'    ? '#12151f'
              : type === 'Goal'    ? '#161b2e'
              : type === 'Project' ? '#1a2035'
              : type === 'Step'    ? '#1d2133'
              :                      '#1e2238';

            return (
              <div
                id={`row-${rowIdx}`}
                key={row.id}
                style={{
                  display: 'flex',
                  borderBottom: `1px solid ${isSelRow ? '#2d4a6e' : '#1e2235'}`,
                  background: rowBg, transition: 'background 0.1s',
                }}
                onMouseDown={() => {
                  setSel({ r: rowIdx, c: sel.c });
                  setEditing(false);
                  containerRef.current?.focus();
                }}
              >
                {COL_WIDTHS.map((w, colIdx) => {
                  const def = defs[colIdx];

                  // Resolve display value — computed fields override stored
                  const dataIdx = COL_ORDER[colIdx];
                  const displayVal =
                    def.type === 'currency_sum' ? (computedSums[row.id] ?? 0)
                    : def.type === 'available'  ? (computedAvailable[row.id] ?? '')
                    : def.type === 'priority'   ? (computedPriority[row.id] ?? '')
                    : def.type === 'id'         ? row.id
                    : row.values[dataIdx];

                  const isSelCell  = isSelRow && sel.c === colIdx;
                  const isEditCell = isSelCell && editing && !def.readonly && def.type !== 'empty';

                  return (
                    <div
                      key={colIdx}
                      onMouseDown={e => {
                        e.stopPropagation();
                        setSel({ r: rowIdx, c: colIdx });
                        setEditing(false);
                        containerRef.current?.focus();
                      }}
                      onDoubleClick={e => {
                        e.stopPropagation();
                        if (!def.readonly) { setSel({ r: rowIdx, c: colIdx }); setEditing(true); }
                      }}
                      style={{
                        width: w, minWidth: w, boxSizing: 'border-box',
                        padding: colIdx === 0
                          ? `5px 8px 5px ${8 + row.depth * INDENT_PX}px`
                          : '5px 10px',
                        borderRight: '1px solid #1e2235',
                        fontSize: 15, color: '#cbd5e1',
                        outline: isSelCell
                          ? `2px solid ${isEditCell ? '#60a5fa' : '#3b82f6'}`
                          : 'none',
                        outlineOffset: -2,
                        background: isEditCell ? '#0d1117' : 'transparent',
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        display: 'flex', alignItems: 'center', gap: 6, cursor: 'default',
                      }}
                    >
                      {/* Type badge — col1 only */}
                      {colIdx === 0 && (
                        <span style={{
                          flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                          background: TYPE_BADGE_COLOR[type], color: '#fff',
                          borderRadius: 2, padding: '2px 5px', textTransform: 'uppercase',
                        }}>
                          {type[0]}
                        </span>
                      )}

                      {/* Edit mode */}
                      {isEditCell ? (
                        def.type === 'dropdown' || def.type === 'status' ? (
                          <select
                            ref={inputRef}
                            value={row.values[dataIdx]}
                            onChange={e => updateCell(row.id, dataIdx, e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); setEditing(false); containerRef.current?.focus(); }
                              e.stopPropagation();
                            }}
                            style={{
                              flex: 1, background: '#0d1117', border: 'none',
                              outline: 'none', color: '#e2e8f0', fontSize: 15,
                              fontFamily: 'inherit', cursor: 'pointer',
                            }}
                          >
                            {def.options.map(o => (
                              <option key={o} value={o}>{o || '(none)'}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            ref={inputRef}
                            type={def.type === 'date' ? 'date' : 'text'}
                            placeholder={
                              def.type === 'time' ? 'HH:MM'
                              : def.type === 'week' ? 'WW-YY'
                              : undefined
                            }
                            value={row.values[dataIdx]}
                            onChange={e => updateCell(row.id, dataIdx, e.target.value)}
                            onBlur={e => {
                              if (def.type === 'week' && !isValidWeek(e.target.value)) {
                                updateCell(row.id, dataIdx, '');
                              }
                            }}
                            onKeyDown={e => {
                              e.stopPropagation();
                              if (e.key === 'Enter') {
                                if (def.type === 'week' && !isValidWeek(row.values[dataIdx])) {
                                  updateCell(row.id, dataIdx, '');
                                }
                                e.preventDefault();
                                setEditing(false);
                                containerRef.current?.focus();
                              }
                            }}
                            style={{
                              flex: 1, background: 'transparent', border: 'none',
                              outline: 'none', color: '#e2e8f0', fontSize: 15,
                              fontFamily: 'inherit', minWidth: 0,
                            }}
                          />
                        )
                      ) : (
                        /* Display mode */
                        <span style={{
                          overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                          fontWeight: colIdx === 0 && (type === 'Area' || type === 'Goal') ? 700 : 400,
                          color: colIdx === 0 && (type === 'Area' || type === 'Goal') ? '#94a3b8'
                               : colIdx === 0 ? '#e2e8f0'
                               : '#94a3b8',
                        }}>
                          <CellDisplay val={displayVal} def={def} />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div style={{ padding: '10px 20px', color: '#2d3149', fontSize: 12 }}>
            <span style={{ fontSize: 14 }}>Ctrl+↓ new sibling · Ctrl+→ new child</span>
          </div>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div style={{
        display: 'flex', gap: 24, padding: '5px 20px',
        background: '#12151f', borderTop: '1px solid #1e2235',
        fontSize: 13, color: '#475569', flexShrink: 0,
      }}>
        <span>Row <span style={{ color: '#94a3b8' }}>{sel.r + 1}</span> / {visible.length}</span>
        <span>Type: <span style={{ color: TYPE_BADGE_COLOR[selType], fontWeight: 700 }}>{selType}</span></span>
        {visible.length < rows.length && (
          <span>Filtered: <span style={{ color: '#60a5fa' }}>{visible.length}</span> of {rows.length}</span>
        )}
        <span style={{ marginLeft: 'auto', color: editing ? '#60a5fa' : '#475569' }}>
          {editing ? '✏ EDIT' : '⌨ NAV'}
        </span>
      </div>
    </div>
  );
}
