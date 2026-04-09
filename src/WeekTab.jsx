import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SLOTS, SLOT_H, TIME_COL_W, SUB_COL_W, HEADER_H,
  WEEK_DAYS, WEEK_SUB_COLS, CATEGORIES,
  slotLabel, isHourSlot, catBg, catText, genId, linkedLabel,
  computeOverlapLayout, wouldExceedOverlapLimit,
} from './calendarUtils.js';

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiBlocks(tab)         { const r = await fetch(`/api/blocks?tab=${tab}`); return r.json(); }
async function apiCreate(block)       { await fetch('/api/blocks', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(block) }); }
async function apiUpdate(id, patch)   { await fetch(`/api/blocks/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(patch) }); }
async function apiDelete(id)          { await fetch(`/api/blocks/${id}`, { method:'DELETE' }); }
async function apiRows()              { const r = await fetch('/api/rows'); return r.json(); }
async function apiSaveRows(rows)      { await fetch('/api/rows', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rows) }); }

// ─── Grid dimensions ─────────────────────────────────────────────────────────

const TOTAL_W = TIME_COL_W + WEEK_DAYS.length * WEEK_SUB_COLS.length * SUB_COL_W;

// ─── Colour constants ────────────────────────────────────────────────────────

const BG          = '#0f1117';
const PANEL       = '#12151f';
const BORDER_H    = '#2d3149';   // hour line
const BORDER_Q    = '#1e2235';   // 15-min line
const BORDER_GROUP = '#4a5878';  // day-group separator (clearly brighter)
const HDR_BG      = '#0a0c14';
const HDR_TEXT    = '#94a3b8';
const TIME_TEXT   = '#7a90b0';   // brighter hour labels
const ACTIVE_COL  = 'rgba(255,255,255,0.03)';
const WEEKEND_BG  = '#141c2e';   // subtle lighter bg for weekend + off-hours slots

// ─── Sub-component: TimeColumn ───────────────────────────────────────────────

function TimeColumn() {
  return (
    <div style={{
      width: TIME_COL_W, flexShrink: 0,
      position: 'sticky', left: 0, zIndex: 10,
      background: PANEL,
      borderRight: `1px solid ${BORDER_H}`,
    }}>
      {Array.from({ length: SLOTS }, (_, s) => (
        <div key={s} style={{
          height: SLOT_H,
          borderBottom: `1px solid ${isHourSlot(s + 1) ? BORDER_H : BORDER_Q}`,
          display: 'flex', alignItems: 'center',
          paddingRight: 6,
          justifyContent: 'flex-end',
        }}>
          {isHourSlot(s) && (
            <span style={{ fontSize: 10, color: TIME_TEXT, fontFamily: "'DM Mono','Fira Code',monospace", lineHeight: 1 }}>
              {slotLabel(s)}
            </span>
          )}
        </div>
      ))}
      {/* 10pm end label */}
      <div style={{ height: 1, position: 'relative' }}>
        <span style={{
          position: 'absolute', right: 6, top: -8,
          fontSize: 10, color: TIME_TEXT, fontFamily: "'DM Mono','Fira Code',monospace",
        }}>10pm</span>
      </div>
    </div>
  );
}

// ─── Sub-component: SubColumn ─────────────────────────────────────────────

// Slot 0 = 5am. 7am = slot 8, 5pm = slot 48.
const isWeekend = (dayIdx) => dayIdx <= 1;  // 0=Sat, 1=Sun
const isOffHours = (s) => s < 8 || s >= 48;

function SubColumn({ dayIdx, subCol, blocks, pendingClick, actionMode, onSlotClick, onBlockClick, isLastInDay }) {
  const isPending = pendingClick && pendingClick.day === dayIdx && pendingClick.subCol === subCol;
  const isActionTarget = actionMode && actionMode.day === dayIdx && actionMode.subCol === subCol;
  const weekend = isWeekend(dayIdx);

  return (
    <div style={{
      width: SUB_COL_W, flexShrink: 0,
      position: 'relative',
      background: (isPending || isActionTarget) ? ACTIVE_COL : 'transparent',
      cursor: (isPending || isActionTarget) ? 'crosshair' : 'default',
    }}>
      {/* Slot grid (click targets + grid lines) */}
      {Array.from({ length: SLOTS }, (_, s) => (
        <div
          key={s}
          onClick={() => onSlotClick(dayIdx, subCol, s)}
          style={{
            height: SLOT_H,
            borderBottom: `1px solid ${isHourSlot(s + 1) ? BORDER_H : BORDER_Q}`,
            borderRight: `1px solid ${isLastInDay ? BORDER_GROUP : BORDER_Q}`,
            boxSizing: 'border-box',
            background: isPending && pendingClick.slot === s
              ? 'rgba(99,102,241,0.25)'
              : (weekend || isOffHours(s)) ? WEEKEND_BG : 'transparent',
          }}
        />
      ))}
      {/* Bottom border */}
      <div style={{ height: 1, background: BORDER_H }} />

      {/* Blocks */}
      {computeOverlapLayout(blocks.filter(b => b.day === dayIdx && b.sub_col === subCol))
        .map(b => (
          <BlockChip
            key={b.id}
            block={b}
            lane={b.lane}
            laneCount={b.laneCount}
            onBlockClick={onBlockClick}
            onPassThroughClick={(slot) => onSlotClick(dayIdx, subCol, slot)}
          />
        ))
      }
    </div>
  );
}

// ─── Block label parser ───────────────────────────────────────────────────────
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

// ─── Sub-component: BlockChip ────────────────────────────────────────────────

function BlockChip({ block, onBlockClick, onPassThroughClick, lane = 0, laneCount = 1 }) {
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
        background: bg,
        borderLeft: `3px solid ${fg}`,
        borderRadius: 3,
        padding: '1px 4px',
        overflow: 'hidden',
        zIndex: 5,
        boxSizing: 'border-box',
      }}
    >
      {content}
      {/* Left half of this block's own width — opens context menu */}
      <div
        onClick={e => { e.stopPropagation(); onBlockClick(e, block); }}
        style={{ position: 'absolute', inset: '0 50% 0 0', cursor: 'pointer' }}
      />
      {/* Right half of this block's own width — passes click through to time slot */}
      <div
        onClick={e => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const slotOffset = Math.floor((e.clientY - rect.top) / SLOT_H);
          onPassThroughClick(Math.min(block.start_slot + slotOffset, block.end_slot - 1));
        }}
        style={{ position: 'absolute', inset: '0 0 0 50%', cursor: 'crosshair' }}
      />
    </div>
  );
}

// ─── Sub-component: ContextMenu ──────────────────────────────────────────────

function ContextMenu({ x, y, block, onAction, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
      {item('Copy to rest of week',  'copyWeek')}
      {item('Copy to rest of work week', 'copyWorkWeek')}
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
      <input
        value={label}
        onChange={e => setLabel(e.target.value)}
        style={inputStyle}
        autoFocus
      />
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

// ─── Sub-component: DrilldownModal ───────────────────────────────────────────

function DrilldownModal({ onLink, onClose }) {
  const [rows, setRows]       = useState([]);
  const [path, setPath]       = useState([]);   // [{id, name, depth}]
  const [newName, setNewName] = useState('');
  const [busy, setBusy]       = useState(false);

  useEffect(() => { apiRows().then(setRows); }, []);

  const depthLabels = ['Area', 'Goal', 'Project', 'Step'];
  const depth = path.length;         // current depth we're showing children of (0 = showing Areas)
  const parentId = depth > 0 ? path[depth - 1].id : null;

  const visibleRows = rows.filter(r =>
    r.depth === depth && r.parent_id === parentId
  );

  function select(row) {
    if (row.depth === 3) {
      // Step — only selectable if routine
      const isRoutine = row.values[10] === 'routine';
      if (!isRoutine) return;
      onLink(row);
    } else {
      setPath([...path, { id: row.id, name: row.values[0] ?? '', depth: row.depth }]);
    }
  }

  async function createNew() {
    if (!newName.trim() || busy) return;
    setBusy(true);
    const fresh = await apiRows();
    const newRow = {
      id: genId(),
      parent_id: parentId ?? null,
      position: 0,
      depth,
      values: Array(15).fill(''),
    };
    newRow.values[0]  = newName.trim();
    newRow.values[12] = 'Active';
    if (depth === 3) newRow.values[10] = 'routine';   // new Steps are Routine
    const updated = [...fresh, newRow];
    // Recompute sort_order to match array index
    await apiSaveRows(updated.map((r, i) => ({ ...r, sort_order: i })));
    setRows(await apiRows());
    setNewName('');
    if (depth === 3) onLink(newRow);   // auto-select newly created Step
    setBusy(false);
  }

  const levelLabel  = depthLabels[depth] ?? 'Step';
  const isStepLevel = depth === 3;

  return (
    <Modal onClose={onClose} title="Link to database item" width={380}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        <span
          style={{ ...crumbStyle, color: '#60a5fa', cursor: 'pointer' }}
          onClick={() => setPath([])}
        >All areas</span>
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

      {/* List */}
      <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 10 }}>
        {visibleRows.length === 0 && (
          <div style={{ color: '#475569', fontSize: 12, padding: '6px 0' }}>No items</div>
        )}
        {visibleRows.map(row => {
          const name       = row.values[0] ?? '(unnamed)';
          const isRoutine  = row.values[10] === 'routine';
          const selectable = depth < 3 || isRoutine;
          return (
            <div
              key={row.id}
              onClick={() => selectable && select(row)}
              style={{
                padding: '5px 8px', borderRadius: 4, fontSize: 12,
                fontFamily: "'DM Mono','Fira Code',monospace",
                color: selectable ? '#e2e8f0' : '#475569',
                cursor: selectable ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => { if (selectable) e.currentTarget.style.background = '#2d3149'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; }}
            >
              <span style={{ flex: 1 }}>{name}</span>
              {isStepLevel && <span style={{ fontSize: 10, color: isRoutine ? '#4ade80' : '#475569' }}>
                {isRoutine ? 'routine' : 'not routine'}
              </span>}
              {!isStepLevel && <span style={{ fontSize: 10, color: '#475569' }}>›</span>}
            </div>
          );
        })}
      </div>

      {/* Create new */}
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

// ─── Shared styles ────────────────────────────────────────────────────────────

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

// ─── Main WeekTab component ───────────────────────────────────────────────────

export default function WeekTab() {
  const [blocks, setBlocks]               = useState([]);
  const [pendingClick, setPending]        = useState(null);   // {day, subCol, slot}
  const [actionMode, setActionMode]       = useState(null);   // {blockId, action, day, subCol}
  const [contextMenu, setContextMenu]     = useState(null);   // {block, x, y}
  const [editModal, setEditModal]         = useState(null);   // block
  const [drilldown, setDrilldown]         = useState(null);   // block
  const [overlapBlocked, setOverlapBlocked] = useState(false);

  // Load blocks on mount
  useEffect(() => {
    apiBlocks('week').then(setBlocks);
  }, []);

  // Close context menu on Escape
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') { setContextMenu(null); setPending(null); setActionMode(null); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // ── Slot click handler ───────────────────────────────────────────────────

  const handleSlotClick = useCallback(async (day, subCol, slot) => {
    // 1. If in action mode targeting this sub-column
    if (actionMode && actionMode.day === day && actionMode.subCol === subCol) {
      const b = blocks.find(x => x.id === actionMode.blockId);
      if (!b) { setActionMode(null); return; }

      let patch = {};
      if (actionMode.action === 'changeStart') {
        const newStart = Math.min(slot, b.end_slot - 1);
        patch = { start_slot: newStart };
      } else if (actionMode.action === 'changeEnd') {
        const newEnd = Math.max(slot + 1, b.start_slot + 1);
        patch = { end_slot: Math.min(newEnd, SLOTS) };
      } else if (actionMode.action === 'moveBlock') {
        const dur = b.end_slot - b.start_slot;
        const newStart = Math.max(0, Math.min(slot, SLOTS - dur));
        patch = { start_slot: newStart, end_slot: newStart + dur };
      }

      await apiUpdate(b.id, patch);
      setBlocks(prev => prev.map(x => x.id === b.id ? { ...x, ...patch } : x));
      setActionMode(null);
      return;
    }

    // 2. Two-click block creation
    if (pendingClick && pendingClick.day === day && pendingClick.subCol === subCol) {
      const s1 = pendingClick.slot;
      const s2 = slot;
      const start_slot = Math.min(s1, s2);
      const end_slot   = Math.max(s1, s2) + 1;
      const colBlocks  = blocks.filter(b => b.day === day && b.sub_col === subCol);
      if (wouldExceedOverlapLimit({ start_slot, end_slot }, colBlocks)) {
        setPending(null);
        setOverlapBlocked(true);
        setTimeout(() => setOverlapBlocked(false), 3000);
        return;
      }
      const id         = genId();
      const created_at = Date.now();
      const newBlock = { id, tab: 'week', day, sub_col: subCol, start_slot, end_slot, label: '', category: null, linked_id: null, created_at };
      await apiCreate(newBlock);
      setBlocks(prev => [...prev, newBlock]);
      setPending(null);
    } else {
      // First click — set pending
      setPending({ day, subCol, slot });
      setContextMenu(null);
    }
  }, [actionMode, pendingClick, blocks]);

  // ── Block click → context menu ───────────────────────────────────────────

  const handleBlockClick = useCallback((e, block) => {
    setPending(null);
    setActionMode(null);
    setContextMenu({ block, x: e.clientX + 8, y: e.clientY });
  }, []);

  // ── Context menu actions ─────────────────────────────────────────────────

  const handleContextAction = useCallback(async (action, block) => {
    if (action === 'edit') {
      setEditModal(block);
      return;
    }
    if (action === 'delete') {
      await apiDelete(block.id);
      setBlocks(prev => prev.filter(x => x.id !== block.id));
      return;
    }
    if (action === 'changeStart' || action === 'changeEnd' || action === 'moveBlock') {
      setActionMode({ blockId: block.id, action, day: block.day, subCol: block.sub_col });
      return;
    }
    if (action === 'copyWeek' || action === 'copyWorkWeek') {
      const workDays = [2, 3, 4, 5, 6];
      const targets  = action === 'copyWorkWeek'
        ? workDays.filter(d => d > block.day)
        : Array.from({ length: 7 }, (_, i) => i).filter(d => d > block.day);
      const newBlocks = [];
      for (const d of targets) {
        const nb = { ...block, id: genId(), day: d };
        await apiCreate(nb);
        newBlocks.push(nb);
      }
      setBlocks(prev => [...prev, ...newBlocks]);
      return;
    }
    if (action === 'link') {
      setDrilldown(block);
      return;
    }
  }, []);

  // ── Edit modal save ──────────────────────────────────────────────────────

  const handleEditSave = useCallback(async ({ label, category }) => {
    const b = editModal;
    await apiUpdate(b.id, { label, category });
    setBlocks(prev => prev.map(x => x.id === b.id ? { ...x, label, category } : x));
    setEditModal(null);
  }, [editModal]);

  // ── Drilldown link ────────────────────────────────────────────────────────

  const handleLink = useCallback(async (row) => {
    const b = drilldown;
    const allRows = await apiRows();
    const lbl = linkedLabel(row, allRows);
    await apiUpdate(b.id, { linked_id: row.id, label: lbl });
    setBlocks(prev => prev.map(x => x.id === b.id ? { ...x, linked_id: row.id, label: lbl } : x));
    setDrilldown(null);
  }, [drilldown]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', background: BG, overflow: 'hidden' }}
      onClick={() => { if (pendingClick) setPending(null); }}
    >
      {/* Action-mode banner */}
      {actionMode && (
        <div style={{
          background: '#1e3a5f', color: '#93c5fd', fontSize: 12, padding: '6px 16px',
          fontFamily: "'DM Mono','Fira Code',monospace", flexShrink: 0,
          borderBottom: `1px solid ${BORDER_H}`,
        }}>
          {actionMode.action === 'changeStart'  && 'Click a cell in the same sub-column to set the new start time. Press Esc to cancel.'}
          {actionMode.action === 'changeEnd'    && 'Click a cell in the same sub-column to set the new end time. Press Esc to cancel.'}
          {actionMode.action === 'moveBlock'    && 'Click a cell in the same sub-column to move the block there. Press Esc to cancel.'}
        </div>
      )}
      {pendingClick && !actionMode && (
        <div style={{
          background: '#2e1065', color: '#d8b4fe', fontSize: 12, padding: '6px 16px',
          fontFamily: "'DM Mono','Fira Code',monospace", flexShrink: 0,
          borderBottom: `1px solid ${BORDER_H}`,
        }}>
          Click a second cell in the same sub-column to create a block. Press Esc to cancel.
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

          {/* ── Header row ───────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', position: 'sticky', top: 0, zIndex: 20,
            background: HDR_BG, borderBottom: `1px solid ${BORDER_H}`,
            flexShrink: 0,
          }}>
            {/* Top-left corner */}
            <div style={{
              width: TIME_COL_W, flexShrink: 0, height: HEADER_H,
              position: 'sticky', left: 0, zIndex: 30,
              background: HDR_BG, borderRight: `1px solid ${BORDER_H}`,
            }} />
            {/* Day columns */}
            {WEEK_DAYS.map((day, di) => (
              <div key={day} style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Day name */}
                <div style={{
                  height: HEADER_H / 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#e2e8f0',
                  fontFamily: "'DM Mono','Fira Code',monospace",
                  borderRight: `1px solid ${BORDER_GROUP}`,
                  width: SUB_COL_W * WEEK_SUB_COLS.length,
                  borderBottom: `1px solid ${BORDER_Q}`,
                }}>
                  {day}
                </div>
                {/* Sub-col headers */}
                <div style={{ display: 'flex' }}>
                  {WEEK_SUB_COLS.map((sc, si) => (
                    <div key={sc} style={{
                      width: SUB_COL_W, height: HEADER_H / 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, color: HDR_TEXT,
                      fontFamily: "'DM Mono','Fira Code',monospace",
                      borderRight: `1px solid ${si === WEEK_SUB_COLS.length - 1 ? BORDER_GROUP : BORDER_Q}`,
                    }}>
                      {sc}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Body row ─────────────────────────────────────────────────── */}
          <div style={{ display: 'flex' }}>
            <TimeColumn />
            {/* Day sub-columns */}
            {WEEK_DAYS.map((_, di) =>
              WEEK_SUB_COLS.map((sc, si) => (
                <SubColumn
                  key={`${di}-${sc}`}
                  dayIdx={di}
                  subCol={sc}
                  blocks={blocks}
                  pendingClick={pendingClick}
                  actionMode={actionMode}
                  onSlotClick={handleSlotClick}
                  onBlockClick={handleBlockClick}
                  isLastInDay={si === WEEK_SUB_COLS.length - 1}
                />
              ))
            )}
          </div>

        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x} y={contextMenu.y}
          block={contextMenu.block}
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Edit modal */}
      {editModal && (
        <EditModal
          block={editModal}
          onSave={handleEditSave}
          onClose={() => setEditModal(null)}
        />
      )}

      {/* Drilldown / link modal */}
      {drilldown && (
        <DrilldownModal
          onLink={handleLink}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
}
