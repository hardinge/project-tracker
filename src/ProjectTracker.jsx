import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  COL_ORDER, TYPE_BADGE_COLOR,
  getType, makeRow, recomputeStructure, subtreeRange,
  computeAvailability, computePriority, computeInheritedImportance, computeUpwardInheritedPriority, computeVisible,
  getCurrentWeek, loadRows, saveRows, SEED_ROWS,
} from './storage.js';
import FilterBar from './FilterBar.jsx';
import MainTable from './MainTable.jsx';
import LeftPanel from './LeftPanel.jsx';

function getCurrentWeekNumber() { return getCurrentWeek().week; }

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProjectTracker() {
  const [rows, setRows]           = useState(null);
  const [dataReady, setDataReady] = useState(false);
  const [serverOk, setServerOk]   = useState(false);
  const [sel, setSel]             = useState({ r: 0, c: 0 });
  const [editing, setEditing]     = useState(false);
  const [filterFocus, setFilterFocus] = useState(null);
  const [filters, setFilters]     = useState(() => ({
    area:       '',
    types:      new Set(),
    nextAction: 'all',
    priority:   new Set(),
    iu:         '',
    date:       '',
    search:     '',
  }));

  // Left panel state
  const [lpSelection, setLpSelection] = useState(new Set()); // Set of row IDs selected in left panel
  const [flashedRowId, setFlashedRowId] = useState(null);

  const containerRef  = useRef(null); // main table focusable div
  const leftPanelRef  = useRef(null); // left panel focusable div
  const pendingRowsRef = useRef(null);
  const hasPendingSave = useRef(false);
  const flashTimerRef  = useRef(null);

  // ── Flash feedback for blocked moves ─────────────────────────────────────
  const flashRow = useCallback((id) => {
    setFlashedRowId(id);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashedRowId(null), 400);
  }, []);

  // ── Load rows from server ─────────────────────────────────────────────────
  useEffect(() => {
    if (rows !== null) {
      setServerOk(true);
      setDataReady(true);
      return;
    }
    let cancelled = false;
    async function load(attempt = 0) {
      try {
        const data = await loadRows();
        if (!cancelled) {
          setRows(data ?? SEED_ROWS);
          setServerOk(true);
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

  // ── Persist on every rows change (debounced 800ms) ────────────────────────
  useEffect(() => {
    if (!dataReady || rows === null || !serverOk) return;
    pendingRowsRef.current = rows;
    hasPendingSave.current = true;
    const t = setTimeout(() => {
      saveRows(rows);
      hasPendingSave.current = false;
    }, 800);
    return () => clearTimeout(t);
  }, [rows, dataReady, serverOk]);

  useEffect(() => {
    return () => {
      if (hasPendingSave.current && pendingRowsRef.current) {
        saveRows(pendingRowsRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function flushOnPageHide() {
      if (hasPendingSave.current && pendingRowsRef.current) {
        saveRows(pendingRowsRef.current);
      }
    }
    window.addEventListener('pagehide', flushOnPageHide);
    return () => window.removeEventListener('pagehide', flushOnPageHide);
  }, []);

  // ── Computed values ───────────────────────────────────────────────────────
  const computedAvailable = useMemo(() => computeAvailability(rows ?? []), [rows]);
  const computedPriority  = useMemo(() => computePriority(rows ?? []), [rows]);
  const computedInheritedPriority = useMemo(
    () => computeUpwardInheritedPriority(rows ?? [], computedPriority),
    [rows, computedPriority],
  );
  const computedImportance = useMemo(() => computeInheritedImportance(rows ?? []), [rows]);

  // ── Left panel selection → index set for pre-filtering the main table ─────
  //
  // Area selected   → Area + all descendants
  // Goal selected   → Goal + parent Area + all descendants
  // Project selected→ Project + parent Goal + grandparent Area + all descendants
  const lpIndices = useMemo(() => {
    if (!rows || lpSelection.size === 0) return null;
    const result = new Set();
    for (const id of lpSelection) {
      const idx = rows.findIndex(r => r.id === id);
      if (idx === -1) continue;
      const type = getType(rows[idx].depth);
      if (type === 'Area') {
        const [s, e] = subtreeRange(rows, idx);
        for (let i = s; i < e; i++) result.add(i);
      } else if (type === 'Goal') {
        // parent Area
        for (let j = idx - 1; j >= 0; j--) {
          if (rows[j].depth === 0) { result.add(j); break; }
        }
        const [s, e] = subtreeRange(rows, idx);
        for (let i = s; i < e; i++) result.add(i);
      } else if (type === 'Project') {
        // parent Goal
        let goalIdx = -1;
        for (let j = idx - 1; j >= 0; j--) {
          if (rows[j].depth === 1) { goalIdx = j; break; }
          if (rows[j].depth === 0) break;
        }
        if (goalIdx >= 0) {
          result.add(goalIdx);
          // grandparent Area
          for (let j = goalIdx - 1; j >= 0; j--) {
            if (rows[j].depth === 0) { result.add(j); break; }
          }
        }
        const [s, e] = subtreeRange(rows, idx);
        for (let i = s; i < e; i++) result.add(i);
      }
    }
    return result;
  }, [rows, lpSelection]);

  // ── Visible rows — left-panel pre-filter AND all main-table filters ────────
  const visible = useMemo(
    () => computeVisible(rows ?? [], computedAvailable, computedPriority, filters, lpIndices),
    [rows, computedAvailable, computedPriority, filters, lpIndices],
  );

  const visibleSet = useMemo(() => new Set(visible.map(v => v.globalIdx)), [visible]);

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

  // Scroll selected main-table row into view
  useEffect(() => {
    document.getElementById(`row-${sel.r}`)?.scrollIntoView({ block: 'nearest' });
  }, [sel.r]);

  // ── Cell update ───────────────────────────────────────────────────────────
  const updateCell = useCallback((id, col, val) => {
    setRows(prev =>
      prev.map(r => r.id === id
        ? { ...r, values: r.values.map((v, i) => i === col ? val : v) }
        : r
      )
    );
  }, []);

  // ── Keyboard handling ─────────────────────────────────────────────────────
  const returnToTable = useCallback(() => {
    setFilterFocus(null);
    setSel(s => ({ ...s, r: 0 }));
    containerRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.target !== containerRef.current) return;

    const numRows = visible.length;
    if (numRows === 0) return;

    if (editing) {
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

    // ── Plain arrow navigation ───────────────────────────────────────────────
    if (!isCtrl && !isShift) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSel({ r: Math.min(r + 1, numRows - 1), c });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (r === 0) {
          setFilterFocus({ ctrl: 'area', subIdx: 0 });
        } else {
          setSel({ r: r - 1, c });
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSel({ r, c: Math.min(c + 1, COL_ORDER.length - 1) });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (c === 0) {
          // Hand focus to the left panel
          leftPanelRef.current?.focus();
        } else {
          setSel({ r, c: c - 1 });
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setEditing(true);
      }
      return;
    }

    // ── Shift+Arrow — move rows ──────────────────────────────────────────────
    if (isShift && !isCtrl && e.key.startsWith('Arrow')) {
      e.preventDefault();
      const { globalIdx, row } = visible[r];
      const lpActive = lpIndices !== null;

      if (e.key === 'ArrowUp') {
        let sibIdx = -1;
        for (let i = globalIdx - 1; i >= 0; i--) {
          if (rows[i].depth === row.depth) { sibIdx = i; break; }
          if (rows[i].depth < row.depth) break;
        }
        if (sibIdx === -1) return;
        if (lpActive && !lpIndices.has(sibIdx)) { flashRow(row.id); return; }
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
        const [ourStart, ourEnd] = subtreeRange(rows, globalIdx);
        if (ourEnd >= rows.length || rows[ourEnd].depth !== row.depth) return;
        if (lpActive && !lpIndices.has(ourEnd)) { flashRow(row.id); return; }
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
        if (row.depth >= 4) return;
        let sibIdx = -1;
        for (let i = globalIdx - 1; i >= 0; i--) {
          if (rows[i].depth === row.depth) { sibIdx = i; break; }
          if (rows[i].depth < row.depth) break;
        }
        if (sibIdx === -1) return;
        if (lpActive && !lpIndices.has(sibIdx)) { flashRow(row.id); return; }
        const [start, end] = subtreeRange(rows, globalIdx);
        setRows(prev => recomputeStructure(
          prev.map((rr, i) => i >= start && i < end ? { ...rr, depth: rr.depth + 1 } : rr)
        ));

      } else if (e.key === 'ArrowLeft') {
        if (row.depth === 0) return;
        if (lpActive && row.depth >= 2) {
          // Find grandparent — new container after outdent
          let grandparentIdx = -1;
          for (let j = globalIdx - 1; j >= 0; j--) {
            if (rows[j].depth === row.depth - 2) { grandparentIdx = j; break; }
            if (rows[j].depth < row.depth - 2) break;
          }
          if (grandparentIdx >= 0 && !lpIndices.has(grandparentIdx)) {
            flashRow(row.id); return;
          }
        }
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
      const lpActive = lpIndices !== null;

      if (e.key === 'ArrowRight') {
        if (row.depth >= 4) return;
        const newRow = makeRow(row.depth + 1, row.id, 0);
        setRows(prev => { const next = [...prev]; next.splice(ourEnd, 0, newRow); return recomputeStructure(next); });
        setTimeout(() => { setSel({ r: r + visInSubtree, c: 0 }); setEditing(true); }, 0);

      } else if (e.key === 'ArrowDown') {
        const newRow = makeRow(row.depth, row.parent_id, row.position + 1);
        setRows(prev => { const next = [...prev]; next.splice(ourEnd, 0, newRow); return recomputeStructure(next); });
        setTimeout(() => { setSel({ r: r + visInSubtree, c: 0 }); setEditing(true); }, 0);

      } else if (e.key === 'ArrowUp') {
        const newRow = makeRow(row.depth, row.parent_id, row.position);
        setRows(prev => { const next = [...prev]; next.splice(globalIdx, 0, newRow); return recomputeStructure(next); });
        setTimeout(() => { setSel({ r, c: 0 }); setEditing(true); }, 0);

      } else if (e.key === 'ArrowLeft') {
        if (row.depth === 0) return;
        if (lpActive && row.depth >= 2) {
          let grandparentIdx = -1;
          for (let j = globalIdx - 1; j >= 0; j--) {
            if (rows[j].depth === row.depth - 2) { grandparentIdx = j; break; }
            if (rows[j].depth < row.depth - 2) break;
          }
          if (grandparentIdx >= 0 && !lpIndices.has(grandparentIdx)) {
            flashRow(row.id); return;
          }
        }
        const newRow = makeRow(row.depth - 1, row.parent_id, 0);
        setRows(prev => { const next = [...prev]; next.splice(ourEnd, 0, newRow); return recomputeStructure(next); });
        setTimeout(() => { setSel({ r: r + visInSubtree, c: 0 }); setEditing(true); }, 0);
      }
      return;
    }

    // ── Ctrl+Delete — delete row and subtree ──────────────────────────────────
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
  }, [editing, sel, visible, rows, lpIndices, flashRow]);

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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "'DM Mono','Fira Code',monospace",
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#0f1117', userSelect: 'none',
    }}>

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

      {/* ── Body: left panel + right (filter bar + table) ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left panel */}
        <LeftPanel
          rows={rows}
          selectedIds={lpSelection}
          onSelectionChange={setLpSelection}
          onMoveToTable={() => containerRef.current?.focus()}
          panelRef={leftPanelRef}
        />

        {/* Right side: filter bar + main table */}
        <div
          ref={containerRef}
          tabIndex={0}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            overflow: 'hidden', outline: 'none',
          }}
        >
          <FilterBar
            filters={filters}
            onChange={setFilters}
            rows={rows}
            filterFocus={filterFocus}
            onFilterFocusChange={setFilterFocus}
            onReturnToTable={returnToTable}
            navMode={!editing}
          />

          <MainTable
            rows={rows}
            visible={visible}
            sel={sel}
            editing={editing}
            containerRef={containerRef}
            updateCell={updateCell}
            setSel={setSel}
            setEditing={setEditing}
            setFilterFocus={setFilterFocus}
            computedAvailable={computedAvailable}
            computedPriority={computedPriority}
            computedInheritedPriority={computedInheritedPriority}
            computedImportance={computedImportance}
            computedSums={computedSums}
            flashedRowId={flashedRowId}
          />
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
        {visible.length < (rows?.length ?? 0) && (
          <span>Filtered: <span style={{ color: '#60a5fa' }}>{visible.length}</span> of {rows.length}</span>
        )}
        {lpSelection.size > 0 && (
          <span>
            Panel: <span style={{ color: '#7c3aed', fontWeight: 700 }}>{lpSelection.size}</span> selected
            {' · '}
            <span
              style={{ color: '#475569', cursor: 'pointer', textDecoration: 'underline' }}
              onMouseDown={() => setLpSelection(new Set())}
            >
              clear
            </span>
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: editing ? '#60a5fa' : '#475569' }}>
          {editing ? '✏ EDIT' : '⌨ NAV'}
        </span>
      </div>
    </div>
  );
}
