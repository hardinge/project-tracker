// ─── Time grid constants ───────────────────────────────────────────────────

/** Total number of 15-minute slots (5:00am – 10:00pm = 17 h × 4) */
export const SLOTS = 68;

/** Absolute minute-of-day where the grid starts (5:00am) */
export const START_MINUTES = 5 * 60;

/** Pixel height of one 15-min slot row */
export const SLOT_H = 11;

/** Pixel width of the fixed time-label column */
export const TIME_COL_W = 35;

/** Pixel width of each sub-column (HS / BM / Base / Revised …) */
export const SUB_COL_W = 90;

/** Pixel height of the two-row day/sub-col header area */
export const HEADER_H = 44;

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
