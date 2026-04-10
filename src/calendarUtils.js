// ─── Time grid constants ───────────────────────────────────────────────────

/** Total number of 15-minute slots (5:00am – 10:00pm = 17 h × 4) */
export const SLOTS = 68;

/** Absolute minute-of-day where the grid starts (5:00am) */
export const START_MINUTES = 5 * 60;

/** Pixel height of one 15-min slot row */
export const SLOT_H = 14;

/** Pixel width of the fixed time-label column */
export const TIME_COL_W = 44;

/** Pixel width of each sub-column (HS / BM / Base / Revised …) */
export const SUB_COL_W = 112;

/** Pixel height of the two-row day/sub-col header area */
export const HEADER_H = 55;

// ─── Week tab structure ────────────────────────────────────────────────────

/** Ordered day names shown as column headers in the Week tab */
export const WEEK_DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** Sub-column labels inside each day (Week tab) */
export const WEEK_SUB_COLS = ['HS', 'BM'];

// ─── Category palette ──────────────────────────────────────────────────────

export const CATEGORIES = ['Work', 'Health', 'Admin', 'Chores', 'Kids', 'Fun', 'No'];

const CAT_BG = {
  Work:   '#172554',
  Health: '#14532d',
  Admin:  '#422006',
  Chores: '#431407',
  Kids:   '#2e1065',
  Fun:    '#134e4a',
  No:     '#7f1d1d',
};

const CAT_TEXT = {
  Work:   '#93c5fd',
  Health: '#86efac',
  Admin:  '#fde68a',
  Chores: '#fdba74',
  Kids:   '#d8b4fe',
  Fun:    '#5eead4',
  No:     '#fca5a5',
};

export function catBg(category)   { return CAT_BG[category]   ?? '#1a1d2e'; }
export function catText(category) { return CAT_TEXT[category]  ?? '#94a3b8'; }

// ─── Time helpers ──────────────────────────────────────────────────────────

/** Convert a slot index to absolute minutes from midnight */
export function slotToMin(slot) { return START_MINUTES + slot * 15; }

/** Convert absolute minutes from midnight to a slot index (clamped) */
export function minToSlot(min) {
  return Math.max(0, Math.min(SLOTS, Math.round((min - START_MINUTES) / 15)));
}

/** True if a slot index falls exactly on an hour boundary */
export function isHourSlot(slot) { return slot % 4 === 0; }

/** Human-readable label for a slot index, e.g. slot 0 → "5am", slot 4 → "6am" */
export function slotLabel(slot) {
  const min = slotToMin(slot);
  const h   = Math.floor(min / 60);
  const m   = min % 60;
  const ap  = h < 12 ? 'am' : 'pm';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m ? `${h12}:${String(m).padStart(2, '0')}${ap}` : `${h12}${ap}`;
}

// ─── Misc ──────────────────────────────────────────────────────────────────

/** Generate a short random ID (same style as the rows table) */
export function genId() { return Math.random().toString(36).slice(2, 8); }

/**
 * Build a block label from a linked database item.
 * Format: "itemName|||fullParentName"
 * BlockChip components parse this to render a two-line (or single-line) display.
 */
export function linkedLabel(item, allRows) {
  const parent = allRows.find(r => r.id === item.parent_id);
  const parentTitle = parent ? (parent.values[0] ?? '') : '';
  return `${item.values[0] ?? ''}|||${parentTitle}`;
}

// ─── JS day-of-week → Week-tab day index ──────────────────────────────────
// Week tab: 0=Sat, 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri
// JS Date.getDay(): 0=Sun … 6=Sat
export function jsDayToWeekDay(jsDay) { return (jsDay + 1) % 7; }

// ─── Overlap layout helpers ────────────────────────────────────────────────

/** True if two blocks share at least one slot */
function blocksOverlap(a, b) {
  return a.start_slot < b.end_slot && b.start_slot < a.end_slot;
}

/**
 * Compute side-by-side overlap layout for a list of blocks in one sub-column.
 * Returns each block augmented with { lane, laneCount } where:
 *   lane      – 0-based index of the horizontal position (0 = leftmost)
 *   laneCount – total number of lanes in this block's overlap group (1, 2, or 3)
 *
 * Sorting: earlier start_slot first; ties broken by created_at oldest first.
 */
export function computeOverlapLayout(blocks) {
  if (blocks.length === 0) return [];

  // Sort: earlier start first, then older creation first (leftmost)
  const sorted = [...blocks].sort((a, b) => {
    if (a.start_slot !== b.start_slot) return a.start_slot - b.start_slot;
    return (a.created_at || 0) - (b.created_at || 0);
  });

  // Assign each block the smallest available lane not taken by any overlapping block
  const laneMap = new Map();
  for (const block of sorted) {
    const usedLanes = new Set(
      sorted
        .filter(b => b.id !== block.id && blocksOverlap(b, block) && laneMap.has(b.id))
        .map(b => laneMap.get(b.id))
    );
    let lane = 0;
    while (usedLanes.has(lane)) lane++;
    laneMap.set(block.id, lane);
  }

  // laneCount for a block = (max lane across all mutually overlapping blocks) + 1
  return sorted.map(block => {
    const overlapping = sorted.filter(b => b.id !== block.id && blocksOverlap(b, block));
    const allLanes = [laneMap.get(block.id), ...overlapping.map(b => laneMap.get(b.id))];
    const laneCount = Math.max(...allLanes) + 1;
    return { ...block, lane: laneMap.get(block.id), laneCount };
  });
}

/**
 * Returns true if placing a block with [start_slot, end_slot) in the given
 * list of existing same-column blocks would push any slot to 4+ simultaneous blocks.
 */
export function wouldExceedOverlapLimit(newBlock, existingBlocks) {
  for (let slot = newBlock.start_slot; slot < newBlock.end_slot; slot++) {
    const count = existingBlocks.filter(b => b.start_slot <= slot && b.end_slot > slot).length;
    if (count >= 3) return true;
  }
  return false;
}
