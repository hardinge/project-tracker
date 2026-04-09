import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SLOTS, SLOT_H, TIME_COL_W, SUB_COL_W, HEADER_H,
  CATEGORIES,
  slotLabel, isHourSlot, catBg, catText, genId, linkedLabel,
  jsDayToWeekDay, computeOverlapLayout, wouldExceedOverlapLimit,
} from './calendarUtils.js';

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiBlocks(tab)       { const r = await fetch(`/api/blocks?tab=${tab}`); return r.json(); }
async function apiCreate(block)     { await fetch('/api/blocks', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(block) }); }
async function apiUpdate(id, patch) { await fetch(`/api/blocks/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(patch) }); }
async function apiDelete(id)        { await fetch(`/api/blocks/${id}`, { method:'DELETE' }); }
async function apiRotate()          { await fetch('/api/blocks/rotate', { method:'POST' }); }
async function apiRows()            { const r = await fetch('/api/rows'); return r.json(); }
async function apiSaveRows(rows)    { await fetch('/api/rows', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rows) }); }

// ─── Layout constants ────────────────────────────────────────────────────────

const NOW_GROUPS    = ['Today', 'Tomorrow'];
const NOW_SUBS      = ['Base', 'Import', 'Revised'];
const NOW_SUB_COL_W = SUB_COL_W * 2;   // double width for Now tab columns

const TOTAL_W = TIME_COL_W + NOW_GROUPS.length * NOW_SUBS.length * NOW_SUB_COL_W;

const BG        = '#0f1117';
const PANEL     = '#12151f';
const BORDER_H  = '#2d3149';
const BORDER_Q  = '#1e2235';
const HDR_BG    = '#0a0c14';
const HDR_TEXT  = '#94a3b8';
const TIME_TEXT = '#475569';
const READONLY_OVERLAY = 'rgba(0,0,0,0.15)';

// ─── Midnight rotation helper ─────────────────────────────────────────────────

const ROTATION_KEY = 'nowTabLastRotation';

async function checkRotation() {
  const today     = new Date().toISOString().slice(0, 10);
  const lastDate  = localStorage.getItem(ROTATION_KEY);
  if (lastDate && lastDate !== today) {
    await apiRotate();
  }
  localStorage.setItem(ROTATION_KEY, today);
}

// ─── Sub-component: TimeColumn ────────────────────────────────────────────────

function TimeColumn() {
  return (
    <div style={{
      width: TIME_COL_W, flexShrink: 0,
      position: 'sticky', left: 0, zIndex: 10,
      background: PANEL, borderRight: `1px solid ${BORDER_H}`,
    }}>
      {Array.from({ length: SLOTS }, (_, s) => (
        <div key={s} style={{
          height: SLOT_H,
          borderBottom: `1px solid ${isHourSlot(s + 1) ? BORDER_H : BORDER_Q}`,
          display: 'flex', alignItems: 'center',
          paddingRight: 6, justifyContent: 'flex-end',
        }}>
          {isHourSlot(s) && (
            <span style={{ fontSize: 10, color: TIME_TEXT, fontFamily: "'DM Mono','Fira Code',monospace", lineHeight: 1 }}>
              {slotLabel(s)}
            </span>
          )}
        </div>
      ))}
      <div style={{ height: 1, position: 'relative' }}>
        <span style={{
          position: 'absolute', right: 6, top: -8,
          fontSize: 10, color: TIME_TEXT, fontFamily: "'DM Mono','Fira Code',monospace",
        }}>10pm</span>
      </div>
    </div>
  );
}

// ─── Sub-component: SubColumn ─────────────────────────────────────────────────

function SubColumn({ groupIdx, subColName, blocks, readOnly, pendingClick, actionMode, onSlotClick, onBlockClick }) {
  const isPending      = !readOnly && pendingClick
    && pendingClick.group === groupIdx && pendingClick.subCol === subColName;
  const isActionTarget = !readOnly && actionMode
    && actionMode.group === groupIdx && actionMode.subCol === subColName;

  return (
    <div style={{
      width: NOW_SUB_COL_W, flexShrink: 0, position: 'relative',
      background: readOnly ? READONLY_OVERLAY : (isPending || isActionTarget) ? 'rgba(255,255,255,0.03)' : 'transparent',
      cursor: (isPending || isActionTarget) ? 'crosshair' : (readOnly ? 'default' : 'default'),
    }}>
      {Array.from({ length: SLOTS }, (_, s) => (
        <div
          key={s}
          onClick={() => !readOnly && onSlotClick(groupIdx, subColName, s)}
          style={{
            height: SLOT_H,
            borderBottom: `1px solid ${isHourSlot(s + 1) ? BORDER_H : BORDER_Q}`,
            borderRight: `1px solid ${BORDER_Q}`,
            boxSizing: 'border-box',
            background: isPending && pendingClick.slot === s ? 'rgba(99,102,241,0.25)' : 'transparent',
          }}
        />
      ))}
      <div style={{ height: 1, background: BORDER_H }} />

      {/* Blocks */}
      {computeOverlapLayout(blocks).map(b => (
        <BlockChip
          key={b.id}
          block={b}
          lane={b.lane}
          laneCount={b.laneCount}
          readOnly={readOnly}
          onBlockClick={onBlockClick}
          onPassThroughClick={readOnly ? null : (slot) => onSlotClick(groupIdx, subColName, slot)}
        />
      ))}
    </div>
  );
}

// ─── Block label parser ────────────────────────────────────────────────────────
// Linked blocks store their label as "mainTitle|||fullParentName".
// Unlinked (or legacy) blocks return parentName: null.

function parseBlockLabel(block) {
  if (block.linked_id && typeof block.label === 'string') {
    const sep = block.label.indexOf('|||');
    if (sep !== -1) {
      return { mainTitle: block.label.slice(0, sep), parentName: block.label.slice(sep + 3) };
    }
    // Strip legacy "[prefix8] itemName" format — show only the item title
    const legacy = block.label.match(/^\[[^\]]{0,8}\] ([\s\S]*)$/);
    if (legacy) {
      return { mainTitle: legacy[1], parentName: null };
    }
  }
  return { mainTitle: block.label || '', parentName: null };
}

// ─── Sub-component: BlockChip ─────────────────────────────────────────────────

function BlockChip({ block, readOnly, onBlockClick, onPassThroughClick, lane = 0, laneCount = 1 }) {
  const top      = block.start_slot * SLOT_H;
  const height   = Math.max((block.end_slot - block.start_slot) * SLOT_H - 2, 4);
  const pctW     = 100 / laneCount;
  const pctL     = lane * pctW;
  const bg       = catBg(block.category);
  const fg       = catText(block.category);
  const isSingle = (block.end_slot - block.start_slot) === 1;
  const fontSize = isSingle ? 12 : 10;
  const mono     = "'DM Mono','Fira Code',monospace";

  const { mainTitle, parentName } = parseBlockLabel(block);
  const tooltip = parentName ? `${mainTitle} [${parentName}]` : (block.label || '');

  const lineStyle = {
    fontSize, color: fg, fontFamily: mono,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    display: 'block', lineHeight: 1.3,
  };

  let content;
  if (parentName && !isSingle) {
    // Two-line display for taller blocks
    content = (
      <div style={{ overflow: 'hidden' }}>
        <span style={lineStyle}>{mainTitle || <em style={{ opacity: 0.5 }}>unlabelled</em>}</span>
        <span style={{ ...lineStyle, opacity: 0.8 }}>[{parentName}]</span>
      </div>
    );
  } else if (parentName) {
    // Single line: "Title [Parent]"
    content = (
      <span style={lineStyle}>
        {mainTitle || <em style={{ opacity: 0.5 }}>unlabelled</em>} [{parentName}]
      </span>
    );
  } else {
    content = (
      <span style={lineStyle}>
        {block.label || <em style={{ opacity: 0.5 }}>unlabelled</em>}
      </span>
    );
  }

  return (
    <div
      title={tooltip}
      style={{
        position: 'absolute',
        top,
        left: `calc(${pctL}% + 2px)`,
        width: `calc(${pctW}% - 4px)`,
        height,
        background: bg, borderLeft: `3px solid ${fg}`,
        borderRadius: 3, padding: '1px 4px',
        overflow: 'hidden', zIndex: 5, boxSizing: 'border-box',
        opacity: readOnly ? 0.8 : 1,
      }}
    >
      {content}
      {/* Left half of this block's own width — opens context menu */}
      <div
        onClick={e => { e.stopPropagation(); if (!readOnly) onBlockClick(e, block); }}
        style={{ position: 'absolute', inset: '0 50% 0 0', cursor: readOnly ? 'default' : 'pointer' }}
      />
      {/* Right half of this block's own width — passes click through to time slot */}
      <div
        onClick={e => {
          e.stopPropagation();
          if (!readOnly && onPassThroughClick) {
            const rect = e.currentTarget.getBoundingClientRect();
            const slotOffset = Math.floor((e.clientY - rect.top) / SLOT_H);
            onPassThroughClick(Math.min(block.start_slot + slotOffset, block.end_slot - 1));
          }
        }}
        style={{ position: 'absolute', inset: '0 0 0 50%', cursor: readOnly ? 'default' : 'crosshair' }}
      />
    </div>
  );
}

// ─── Sub-component: ContextMenu ───────────────────────────────────────────────

function ContextMenu({ x, y, block, groupIdx, onAction, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const item = (label, action) => (
    <button
      key={action}
      onClick={() => { onAction(action, block); onClose(); }}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: 'none', border: 'none', padding: '5px 12px',
        color: '#e2e8f0', fontSize: 12, cursor: 'pointer',
        fontFamily: "'DM Mono','Fira Code',monospace",
      }}
      onMouseEnter={e => e.target.style.background = '#2d3149'}
      onMouseLeave={e => e.target.style.background = 'none'}
    >
      {label}
    </button>
  );

  return (
    <div ref={ref} style={{
      position: 'fixed', top: y, left: x, zIndex: 1000,
      background: '#1a1d2e', border: `1px solid ${BORDER_H}`,
      borderRadius: 6, padding: '4px 0', minWidth: 200,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      {item('Edit label & category', 'edit')}
      {item('Change start',          'changeStart')}
      {item('Change end',            'changeEnd')}
      {item('Move whole block',      'moveBlock')}
      {groupIdx === 0 && item('Move to tomorrow', 'moveToTomorrow')}
      {item('Link to database item', 'link')}
      <div style={{ height: 1, background: BORDER_H, margin: '4px 0' }} />
      {item('Delete', 'delete')}
    </div>
  );
}

// ─── Sub-component: EditModal ─────────────────────────────────────────────────

function EditModal({ block, onSave, onClose }) {
  const [label, setLabel]       = useState(block.label ?? '');
  const [category, setCategory] = useState(block.category ?? '');

  return (
    <Modal onClose={onClose} title="Edit block">
      <label style={labelStyle}>Label</label>
      <input value={label} onChange={e => setLabel(e.target.value)} style={inputStyle} autoFocus />
      <label style={labelStyle}>Category</label>
      <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
        <option value="">— none —</option>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button style={btnPrimary} onClick={() => onSave({ label, category: category || null })}>Save</button>
        <button style={btnSecondary} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

// ─── Sub-component: DrilldownModal (Now — goes to Actions) ────────────────────

function DrilldownModal({ onLink, onClose }) {
  const [rows, setRows]       = useState([]);
  const [path, setPath]       = useState([]);
  const [newName, setNewName] = useState('');
  const [busy, setBusy]       = useState(false);

  useEffect(() => { apiRows().then(setRows); }, []);

  const depthLabels = ['Area', 'Goal', 'Project', 'Step', 'Action'];
  const depth    = path.length;
  const parentId = depth > 0 ? path[depth - 1].id : null;

  const visibleRows = rows.filter(r => r.depth === depth && r.parent_id === parentId);

  function select(row) {
    if (row.depth === 4) {
      onLink(row);  // Actions are the final selectable item
    } else {
      setPath([...path, { id: row.id, name: row.values[0] ?? '', depth: row.depth }]);
    }
  }

  async function createNew() {
    if (!newName.trim() || busy) return;
    setBusy(true);
    const fresh  = await apiRows();
    const newRow = {
      id: genId(), parent_id: parentId ?? null,
      position: 0, depth,
      values: Array(15).fill(''),
    };
    newRow.values[0]  = newName.trim();
    newRow.values[12] = 'Active';
    const updated = [...fresh, newRow];
    await apiSaveRows(updated.map((r, i) => ({ ...r, sort_order: i })));
    setRows(await apiRows());
    setNewName('');
    if (depth === 4) onLink(newRow);
    setBusy(false);
  }

  const levelLabel   = depthLabels[depth] ?? 'Action';
  const isActionLevel = depth === 4;

  return (
    <Modal onClose={onClose} title="Link to database item" width={380}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ ...crumbStyle, color: '#60a5fa', cursor: 'pointer' }} onClick={() => setPath([])}>
          All areas
        </span>
        {path.map((p, i) => (
          <span key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#475569' }}>›</span>
            <span
              style={{ ...crumbStyle, color: '#60a5fa', cursor: 'pointer' }}
              onClick={() => setPath(path.slice(0, i + 1))}
            >{p.name}</span>
          </span>
        ))}
      </div>

      <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 10 }}>
        {visibleRows.length === 0 && (
          <div style={{ color: '#475569', fontSize: 12, padding: '6px 0' }}>No items</div>
        )}
        {visibleRows.map(row => {
          const name       = row.values[0] ?? '(unnamed)';
          const selectable = true;   // all depths selectable (just navigates until Action)
          const isFinal    = row.depth === 4;
          return (
            <div
              key={row.id}
              onClick={() => select(row)}
              style={{
                padding: '5px 8px', borderRadius: 4, fontSize: 12,
                fontFamily: "'DM Mono','Fira Code',monospace",
                color: '#e2e8f0', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2d3149'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; }}
            >
              <span style={{ flex: 1 }}>{name}</span>
              <span style={{ fontSize: 10, color: '#475569' }}>{isFinal ? 'select' : '›'}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          placeholder={`New ${levelLabel} name…`}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createNew()}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button style={btnPrimary} onClick={createNew} disabled={busy}>
          {busy ? '…' : `Add ${levelLabel}`}
        </button>
      </div>
      <div style={{ marginTop: 12 }}>
        <button style={btnSecondary} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

// ─── Shared modal wrapper ─────────────────────────────────────────────────────

function Modal({ onClose, title, children, width = 320 }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#1a1d2e', border: `1px solid ${BORDER_H}`,
        borderRadius: 8, padding: 20, width, maxWidth: '90vw',
        boxShadow: '0 16px 64px rgba(0,0,0,0.8)',
        fontFamily: "'DM Mono','Fira Code',monospace",
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle = {
  display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4,
  fontFamily: "'DM Mono','Fira Code',monospace",
};
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: '#0f1117', border: `1px solid ${BORDER_H}`,
  borderRadius: 4, padding: '5px 8px',
  color: '#e2e8f0', fontSize: 12,
  fontFamily: "'DM Mono','Fira Code',monospace",
  outline: 'none', marginBottom: 10,
};
const btnPrimary = {
  background: '#2563eb', color: '#fff', border: 'none',
  borderRadius: 4, padding: '5px 14px', fontSize: 12, cursor: 'pointer',
  fontFamily: "'DM Mono','Fira Code',monospace",
};
const btnSecondary = {
  background: '#1e2235', color: '#94a3b8', border: `1px solid ${BORDER_H}`,
  borderRadius: 4, padding: '5px 14px', fontSize: 12, cursor: 'pointer',
  fontFamily: "'DM Mono','Fira Code',monospace",
};
const crumbStyle = {
  fontSize: 11, fontFamily: "'DM Mono','Fira Code',monospace",
};

// ─── Main NowTab component ────────────────────────────────────────────────────

export default function NowTab() {
  const [nowBlocks,     setNowBlocks]     = useState([]);   // tab='now', sub_col='revised'
  const [weekBlocks,    setWeekBlocks]    = useState([]);   // tab='week' (for Base columns)
  const [pendingClick,  setPending]       = useState(null);
  const [actionMode,    setAction]        = useState(null);
  const [contextMenu,   setMenu]          = useState(null);
  const [editModal,     setEdit]          = useState(null);
  const [drilldown,     setDrill]         = useState(null);
  const [overlapBlocked, setOverlapBlocked] = useState(false);

  // Determine which week-day each group maps to
  const todayJsDay    = new Date().getDay();
  const todayWeekDay  = jsDayToWeekDay(todayJsDay);               // 0-6 (Sat=0)
  const tomorrowWeekDay = jsDayToWeekDay((todayJsDay + 1) % 7);

  // groupIdx 0=Today, 1=Tomorrow
  const weekDayForGroup = [todayWeekDay, tomorrowWeekDay];

  // Load and rotate on mount
  useEffect(() => {
    (async () => {
      await checkRotation();
      const [nb, wb] = await Promise.all([apiBlocks('now'), apiBlocks('week')]);
      setNowBlocks(nb);
      setWeekBlocks(wb);
    })();
  }, []);

  // Escape key
  useEffect(() => {
    const h = e => {
      if (e.key === 'Escape') { setMenu(null); setPending(null); setAction(null); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // ── Slot click ─────────────────────────────────────────────────────────────

  const handleSlotClick = useCallback(async (groupIdx, subColName, slot) => {
    // Only Revised is editable
    if (subColName !== 'Revised') return;

    if (actionMode && actionMode.group === groupIdx && actionMode.subCol === subColName) {
      const b = nowBlocks.find(x => x.id === actionMode.blockId);
      if (!b) { setAction(null); return; }

      let patch = {};
      if (actionMode.action === 'changeStart') {
        patch = { start_slot: Math.min(slot, b.end_slot - 1) };
      } else if (actionMode.action === 'changeEnd') {
        patch = { end_slot: Math.min(Math.max(slot + 1, b.start_slot + 1), SLOTS) };
      } else if (actionMode.action === 'moveBlock') {
        const dur = b.end_slot - b.start_slot;
        const ns  = Math.max(0, Math.min(slot, SLOTS - dur));
        patch = { start_slot: ns, end_slot: ns + dur };
      }

      await apiUpdate(b.id, patch);
      setNowBlocks(prev => prev.map(x => x.id === b.id ? { ...x, ...patch } : x));
      setAction(null);
      return;
    }

    if (pendingClick && pendingClick.group === groupIdx && pendingClick.subCol === subColName) {
      const start_slot = Math.min(pendingClick.slot, slot);
      const end_slot   = Math.max(pendingClick.slot, slot) + 1;
      const colBlocks  = nowBlocks.filter(b => b.day === groupIdx && b.sub_col === 'revised');
      if (wouldExceedOverlapLimit({ start_slot, end_slot }, colBlocks)) {
        setPending(null);
        setOverlapBlocked(true);
        setTimeout(() => setOverlapBlocked(false), 3000);
        return;
      }
      const id         = genId();
      const created_at = Date.now();
      const nb = { id, tab: 'now', day: groupIdx, sub_col: 'revised', start_slot, end_slot, label: '', category: null, linked_id: null, created_at };
      await apiCreate(nb);
      setNowBlocks(prev => [...prev, nb]);
      setPending(null);
    } else {
      setPending({ group: groupIdx, subCol: subColName, slot });
      setMenu(null);
    }
  }, [actionMode, pendingClick, nowBlocks]);

  // ── Block click ────────────────────────────────────────────────────────────

  const handleBlockClick = useCallback((e, block, groupIdx) => {
    setPending(null);
    setAction(null);
    setMenu({ block, groupIdx, x: e.clientX + 8, y: e.clientY });
  }, []);

  // ── Context actions ────────────────────────────────────────────────────────

  const handleContextAction = useCallback(async (action, block) => {
    if (action === 'edit') { setEdit(block); return; }
    if (action === 'delete') {
      await apiDelete(block.id);
      setNowBlocks(prev => prev.filter(x => x.id !== block.id));
      return;
    }
    if (action === 'changeStart' || action === 'changeEnd' || action === 'moveBlock') {
      setAction({ blockId: block.id, action, group: block.day, subCol: 'Revised' });
      return;
    }
    if (action === 'moveToTomorrow') {
      await apiUpdate(block.id, { day: 1 });
      setNowBlocks(prev => prev.map(x => x.id === block.id ? { ...x, day: 1 } : x));
      return;
    }
    if (action === 'link') { setDrill(block); return; }
  }, []);

  const handleEditSave = useCallback(async ({ label, category }) => {
    const b = editModal;
    await apiUpdate(b.id, { label, category });
    setNowBlocks(prev => prev.map(x => x.id === b.id ? { ...x, label, category } : x));
    setEdit(null);
  }, [editModal]);

  const handleLink = useCallback(async (row) => {
    const b    = drilldown;
    const all  = await apiRows();
    const lbl  = linkedLabel(row, all);
    await apiUpdate(b.id, { linked_id: row.id, label: lbl });
    setNowBlocks(prev => prev.map(x => x.id === b.id ? { ...x, linked_id: row.id, label: lbl } : x));
    setDrill(null);
  }, [drilldown]);

  // ── Helper: blocks for a given sub-column in the Now grid ──────────────────

  function blocksForCell(groupIdx, subColName) {
    if (subColName === 'Import') return [];   // placeholder — empty
    if (subColName === 'Base') {
      // Base = week template for the matching day-of-week
      return weekBlocks.filter(b => b.day === weekDayForGroup[groupIdx]);
    }
    // Revised
    return nowBlocks.filter(b => b.day === groupIdx && b.sub_col === 'revised');
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', background: BG, overflow: 'hidden' }}
      onClick={() => { if (pendingClick) setPending(null); }}
    >
      {/* Status banners */}
      {actionMode && (
        <div style={{
          background: '#1e3a5f', color: '#93c5fd', fontSize: 12, padding: '6px 16px',
          fontFamily: "'DM Mono','Fira Code',monospace", flexShrink: 0,
          borderBottom: `1px solid ${BORDER_H}`,
        }}>
          {actionMode.action === 'changeStart' && 'Click a cell in the Revised sub-column to set the new start time. Press Esc to cancel.'}
          {actionMode.action === 'changeEnd'   && 'Click a cell in the Revised sub-column to set the new end time. Press Esc to cancel.'}
          {actionMode.action === 'moveBlock'   && 'Click a cell in the Revised sub-column to move the block. Press Esc to cancel.'}
        </div>
      )}
      {pendingClick && !actionMode && (
        <div style={{
          background: '#2e1065', color: '#d8b4fe', fontSize: 12, padding: '6px 16px',
          fontFamily: "'DM Mono','Fira Code',monospace", flexShrink: 0,
          borderBottom: `1px solid ${BORDER_H}`,
        }}>
          Click a second cell in the same Revised sub-column to create a block. Press Esc to cancel.
        </div>
      )}
      {overlapBlocked && (
        <div style={{
          background: '#7f1d1d', color: '#fca5a5', fontSize: 12, padding: '6px 16px',
          fontFamily: "'DM Mono','Fira Code',monospace", flexShrink: 0,
          borderBottom: `1px solid ${BORDER_H}`,
        }}>
          Cannot create block — three blocks already overlap at that time. Maximum three overlapping blocks per sub-column.
        </div>
      )}

      {/* Scrollable grid */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', minWidth: TOTAL_W }}>

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', position: 'sticky', top: 0, zIndex: 20,
            background: HDR_BG, borderBottom: `1px solid ${BORDER_H}`, flexShrink: 0,
          }}>
            {/* Corner */}
            <div style={{
              width: TIME_COL_W, flexShrink: 0, height: HEADER_H,
              position: 'sticky', left: 0, zIndex: 30,
              background: HDR_BG, borderRight: `1px solid ${BORDER_H}`,
            }} />
            {/* Group headers */}
            {NOW_GROUPS.map((grpName, gi) => (
              <div key={grpName} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  height: HEADER_H / 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#e2e8f0',
                  fontFamily: "'DM Mono','Fira Code',monospace",
                  borderRight: `1px solid ${BORDER_H}`,
                  width: NOW_SUB_COL_W * NOW_SUBS.length,
                  borderBottom: `1px solid ${BORDER_Q}`,
                }}>
                  {grpName}
                </div>
                <div style={{ display: 'flex' }}>
                  {NOW_SUBS.map(sc => (
                    <div key={sc} style={{
                      width: NOW_SUB_COL_W, height: HEADER_H / 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11,
                      color: sc === 'Revised' ? '#e2e8f0' : HDR_TEXT,
                      fontFamily: "'DM Mono','Fira Code',monospace",
                      borderRight: `1px solid ${BORDER_Q}`,
                    }}>
                      {sc}
                      {sc === 'Import' && <span style={{ fontSize: 9, color: '#475569', marginLeft: 3 }}>(soon)</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Body ─────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex' }}>
            <TimeColumn />
            {NOW_GROUPS.map((_, gi) =>
              NOW_SUBS.map(sc => {
                const readOnly = sc !== 'Revised';
                return (
                  <SubColumn
                    key={`${gi}-${sc}`}
                    groupIdx={gi}
                    subColName={sc}
                    blocks={blocksForCell(gi, sc)}
                    readOnly={readOnly}
                    pendingClick={pendingClick}
                    actionMode={actionMode}
                    onSlotClick={handleSlotClick}
                    onBlockClick={(e, b) => handleBlockClick(e, b, gi)}
                  />
                );
              })
            )}
          </div>

        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x} y={contextMenu.y}
          block={contextMenu.block}
          groupIdx={contextMenu.groupIdx}
          onAction={handleContextAction}
          onClose={() => setMenu(null)}
        />
      )}

      {editModal && (
        <EditModal block={editModal} onSave={handleEditSave} onClose={() => setEdit(null)} />
      )}

      {drilldown && (
        <DrilldownModal onLink={handleLink} onClose={() => setDrill(null)} />
      )}
    </div>
  );
}
