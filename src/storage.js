// ─── Constants ───────────────────────────────────────────────────────────────

export const TYPES = ['Area', 'Goal', 'Project', 'Step', 'Action'];

const REQ_OPTS     = ['', 'Must', 'Need', 'Want'];
const IU_OPTS      = ['', 'HH', 'HM', 'MH', 'HL', 'MM', 'LH', 'ML', 'LM', 'LL'];
const CTX_OPTS     = [
  '', 'phone', 'comp & call', 'quick comp', 'long comp',
  'work', 'home', 'supermarket', 'storage', 'post office',
  'chemist', 'short drive', 'longer drive', 'gym', 'bunnings',
  'city', 'shopping center', "al's house", "g&t's house", 'boys', 'note',
];
const TYPE_OPTS    = ['sequential', 'parallel'];
const ROUTINE_OPTS = ['not r', 'routine'];
const EVENT_OPTS   = ['not e', 'event'];
const STATUS_OPTS  = ['Potential', 'Active', 'Deferred', 'Done', 'Cancelled'];

// Column index reference (0-based):
// 0  name
// 1  requirement
// 2  imp/urg | context | empty
// 3  $ total (computed) | $ in/out | empty
// 4  date
// 5  time | empty
// 6  link
// 7  type | empty
// 8  routine | event | empty
// 9  enablers | empty
// 10 status
// 11 available (computed, never stored)
// 12 id (readonly) | empty

export const COL_DEFS = {
  Area: [
    { label: 'Area',      type: 'text' },
    { label: '',          type: 'empty' },
    { label: '',          type: 'empty' },
    { label: '',          type: 'empty' },
    { label: '',          type: 'empty' },
    { label: '',          type: 'empty' },
    { label: '',          type: 'empty' },
    { label: '',          type: 'empty' },
    { label: '',          type: 'empty' },
    { label: '',          type: 'empty' },
    { label: '',          type: 'empty' },
    { label: '',          type: 'empty' },
    { label: '',          type: 'empty' },
  ],
  Goal: [
    { label: 'Goal',        type: 'text' },
    { label: 'Requirement', type: 'dropdown', options: REQ_OPTS },
    { label: '',            type: 'empty' },
    { label: '$ total',     type: 'currency_sum', readonly: true },
    { label: 'Date',        type: 'date' },
    { label: '',            type: 'empty' },
    { label: 'Link',        type: 'url' },
    { label: 'Sequence',    type: 'dropdown', options: TYPE_OPTS, default: 'sequential' },
    { label: '',            type: 'empty' },
    { label: 'Enablers',    type: 'text' },
    { label: 'Status',      type: 'status', options: STATUS_OPTS, default: 'Active' },
    { label: 'Availability', type: 'available', readonly: true },
    { label: 'ID',          type: 'id', readonly: true },
  ],
  Project: [
    { label: 'Project',     type: 'text' },
    { label: 'Requirement', type: 'dropdown', options: REQ_OPTS },
    { label: 'Imp/Urg',     type: 'dropdown', options: IU_OPTS },
    { label: '$ total',     type: 'currency_sum', readonly: true },
    { label: 'Date',        type: 'date' },
    { label: '',            type: 'empty' },
    { label: 'Link',        type: 'url' },
    { label: 'Sequence',    type: 'dropdown', options: TYPE_OPTS, default: 'sequential' },
    { label: '',            type: 'empty' },
    { label: 'Enablers',    type: 'text' },
    { label: 'Status',      type: 'status', options: STATUS_OPTS, default: 'Active' },
    { label: 'Availability', type: 'available', readonly: true },
    { label: 'ID',          type: 'id', readonly: true },
  ],
  Step: [
    { label: 'Step',        type: 'text' },
    { label: 'Requirement', type: 'dropdown', options: REQ_OPTS },
    { label: 'Imp/Urg',     type: 'dropdown', options: IU_OPTS },
    { label: '$ total',     type: 'currency_sum', readonly: true },
    { label: 'Date',        type: 'date' },
    { label: 'Time',        type: 'time' },
    { label: 'Link',        type: 'url' },
    { label: 'Sequence',    type: 'dropdown', options: TYPE_OPTS, default: 'sequential' },
    { label: 'Routine',     type: 'dropdown', options: ROUTINE_OPTS, default: 'not r' },
    { label: 'Enablers',    type: 'text' },
    { label: 'Status',      type: 'status', options: STATUS_OPTS, default: 'Active' },
    { label: 'Availability', type: 'available', readonly: true },
    { label: 'ID',          type: 'id', readonly: true },
  ],
  Action: [
    { label: 'Action',    type: 'text' },
    { label: '',          type: 'empty' },
    { label: 'Context',   type: 'dropdown', options: CTX_OPTS },
    { label: '$ in/out',  type: 'currency' },
    { label: 'Date',      type: 'date' },
    { label: 'Time',      type: 'time' },
    { label: 'Link',      type: 'url' },
    { label: '',          type: 'empty' },
    { label: 'Event',     type: 'dropdown', options: EVENT_OPTS, default: 'not e' },
    { label: '',          type: 'empty' },
    { label: 'Status',    type: 'status', options: STATUS_OPTS, default: 'Active' },
    { label: 'Available', type: 'available', readonly: true },
    { label: '',          type: 'empty' },
  ],
};

export const COL_WIDTHS = [345, 80, 95, 85, 100, 65, 60, 90, 75, 100, 90, 70, 70];
export const INDENT_PX  = 20;
export const NUM_COLS   = 13;

export const TYPE_BADGE_COLOR = {
  Area:    '#e94560',
  Goal:    '#7c3aed',
  Project: '#2563eb',
  Step:    '#059669',
  Action:  '#d97706',
};

// ─── ID generation ────────────────────────────────────────────────────────────

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
function makeId() {
  return Array.from({ length: 6 }, () =>
    ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)]
  ).join('');
}

// ─── Row factory ─────────────────────────────────────────────────────────────

export function getType(depth) {
  return TYPES[Math.min(depth, 4)];
}

/**
 * Create a new row with 13 values.
 * - ID written into values[12] for Goal/Project/Step.
 * - values[3] ($ sum) cleared for Goal/Project/Step — always computed.
 * - values[11] (Available) always cleared — always computed.
 */
export function makeRow(depth, parentId = null, position = 0, vals = null) {
  const type = getType(depth);
  const defs = COL_DEFS[type];
  const id   = makeId();

  const values = vals ? [...vals] : defs.map(d => d.default ?? '');
  while (values.length < NUM_COLS) values.push('');

  if (type === 'Goal' || type === 'Project' || type === 'Step') {
    values[12] = id;   // ID column
    values[3]  = '';   // $ sum is computed, never stored
  }
  values[11] = '';     // Available is computed, never stored

  return { id, parent_id: parentId, position, depth, values };
}

// ─── Structural helpers ───────────────────────────────────────────────────────

/** Return [start, end) for the subtree rooted at idx (root + all deeper descendants). */
export function subtreeRange(rows, idx) {
  const d = rows[idx].depth;
  let end = idx + 1;
  while (end < rows.length && rows[end].depth > d) end++;
  return [idx, end];
}

/** Recompute parent_id and position from flat order + depth. */
export function recomputeStructure(rows) {
  return rows.map((row, i) => {
    let parent_id = null;
    if (row.depth > 0) {
      for (let j = i - 1; j >= 0; j--) {
        if (rows[j].depth === row.depth - 1) { parent_id = rows[j].id; break; }
      }
    }
    const position = rows
      .slice(0, i)
      .filter(r => r.parent_id === parent_id && r.depth === row.depth)
      .length;
    return { ...row, parent_id, position };
  });
}

// ─── Availability computation ─────────────────────────────────────────────────

/**
 * Compute the Available field for every row. Returns a map: rowId → 'Yes' | 'No' | ''.
 *
 * A non-Area row is Available when ALL of the following hold:
 *  1. Its own Status is 'Active'.
 *  2. Every ID listed in its Enablers (index 9) has Status 'Done' or 'Cancelled'.
 *  3. (Steps only) If the parent Project/Step has Type 'sequential':
 *       this row must be the first direct child Step whose Status is not Done/Cancelled.
 *  4. (Actions only) The nearest parent row (Step or Project) must itself be Available.
 *
 * Rows are processed top-to-bottom, so parent availability is always resolved first.
 */
export function computeAvailability(rows) {
  const result   = {};   // rowId → '' | 'Yes' | 'No'
  const statusOf = {};   // rowId → status string

  rows.forEach(row => { statusOf[row.id] = row.values[10]; });

  rows.forEach((row, i) => {
    const type = getType(row.depth);

    if (type === 'Area') { result[row.id] = ''; return; }

    // Rule 1 — own Status must be Active
    if (statusOf[row.id] !== 'Active') { result[row.id] = 'No'; return; }

    // Rule 2 — all Enablers must be Done or Cancelled
    const enablersRaw = (row.values[9] || '').trim();
    if (enablersRaw) {
      const ids = enablersRaw.split(',').map(s => s.trim()).filter(Boolean);
      if (ids.some(id => statusOf[id] !== 'Done' && statusOf[id] !== 'Cancelled')) {
        result[row.id] = 'No'; return;
      }
    }

    // Rule 3 — row inside a Sequential parent (Goal→Project, Project→Step, Step→Step)
    // Goal/Project/Step all carry their Sequence value at values[7].
    if (type === 'Project' || type === 'Step') {
      let parentIdx = -1;
      for (let j = i - 1; j >= 0; j--) {
        if (rows[j].depth === row.depth - 1) { parentIdx = j; break; }
      }
      if (parentIdx >= 0) {
        const parent     = rows[parentIdx];
        const parentKind = getType(parent.depth);
        // Parents that carry a Sequence field: Goal, Project, Step
        if (parentKind === 'Goal' || parentKind === 'Project' || parentKind === 'Step') {
          const isSequential = parent.values[7] !== 'parallel'; // default sequential
          if (isSequential) {
            let pe = parentIdx + 1;
            while (pe < rows.length && rows[pe].depth > parent.depth) pe++;
            let firstId = null;
            for (let j = parentIdx + 1; j < pe; j++) {
              if (rows[j].depth === row.depth) {
                if (statusOf[rows[j].id] !== 'Done' && statusOf[rows[j].id] !== 'Cancelled') {
                  firstId = rows[j].id; break;
                }
              }
            }
            if (firstId !== row.id) { result[row.id] = 'No'; return; }
          }
        }
      }
    }

    // Rule 4 — Action: nearest parent must be Available
    if (type === 'Action') {
      let parentIdx = -1;
      for (let j = i - 1; j >= 0; j--) {
        if (rows[j].depth === row.depth - 1) { parentIdx = j; break; }
      }
      if (parentIdx >= 0 && result[rows[parentIdx].id] !== 'Yes') {
        result[row.id] = 'No'; return;
      }
    }

    result[row.id] = 'Yes';
  });

  return result;
}

// ─── Imp/Urg scoring ─────────────────────────────────────────────────────────

export const IU_SCORES = {
  HH: 5.7, HM: 4.8, MH: 4.7, HL: 3.9, MM: 3.8,
  LH: 3.7, ML: 2.9, LM: 2.8, LL: 1.9,
};
export const IU_OPTIONS = ['HH','HM','MH','HL','MM','LH','ML','LM','LL'];

// ─── Visibility computation ───────────────────────────────────────────────────

/**
 * Compute the set of visible rows after applying all filters with AND logic.
 * Returns [{ row, globalIdx }, ...] in original order.
 *
 * filters: {
 *   area:       string — '' or area row id
 *   types:      Set    — enabled types, subset of ['Goal','Project','Step','Action']
 *   nextAction: string — 'all' | 'nextActions'
 *   req:        Set    — enabled reqs, subset of ['Must','Need','Want']
 *   iu:         string — '' | IU code (e.g. 'HH', 'MM')
 *   date:       string — '' | 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'nextWeek' | 'thisMonth'
 *   search:     string — text search on row name
 * }
 *
 * Area rows are always kept regardless of filters 2-7.
 * Ancestors of rows passing a filter are added for context, but only within the
 * current candidate set (so the Area filter cannot be bypassed).
 */
export function computeVisible(rows, available, filters) {
  const { area, types, nextAction, req, iu, date, search } = filters;

  // Walk from idx upward, adding ancestor rows that exist in currentIndices.
  function addAncestors(idx, currentIndices, resultSet) {
    let d = rows[idx].depth;
    for (let j = idx - 1; j >= 0 && d > 0; j--) {
      if (rows[j].depth < d) {
        if (currentIndices.has(j)) resultSet.add(j);
        d = rows[j].depth;
      }
    }
  }

  // Start with all row indices.
  let indices = new Set(rows.map((_, i) => i));

  // ── Filter 1: Area ────────────────────────────────────────────────────────
  if (area) {
    const areaIdx = rows.findIndex(r => r.id === area);
    if (areaIdx >= 0) {
      const [start, end] = subtreeRange(rows, areaIdx);
      indices = new Set();
      for (let i = start; i < end; i++) indices.add(i);
    }
  }

  /**
   * Apply one filter step: keep Area rows unconditionally, keep other rows
   * that pass the predicate, and add their ancestors (within current indices).
   */
  function applyFilter(predicate) {
    const prev = indices;
    const next = new Set();
    for (const idx of prev) {
      const type = getType(rows[idx].depth);
      if (type === 'Area') { next.add(idx); continue; }
      if (predicate(idx, rows[idx], type)) {
        next.add(idx);
        addAncestors(idx, prev, next);
      }
    }
    indices = next;
  }

  // ── Filter 2: Types ───────────────────────────────────────────────────────
  const typesEnabled = types ?? new Set(['Goal','Project','Step','Action']);
  if (typesEnabled.size < 4) {
    applyFilter((idx, row, type) => typesEnabled.has(type));
  }

  // ── Filter 3: Next Actions ────────────────────────────────────────────────
  if (nextAction === 'nextActions') {
    applyFilter((idx, row) => available[row.id] === 'Yes');
  }

  // ── Filter 4: Requirement ─────────────────────────────────────────────────
  const reqEnabled = req ?? new Set(['Must','Need','Want']);
  if (reqEnabled.size < 3) {
    // Collect non-Action rows that pass req, then let Actions inherit from parent.
    const passedNonAction = new Set();
    for (const idx of indices) {
      const row  = rows[idx];
      const type = getType(row.depth);
      if (type !== 'Area' && type !== 'Action' && reqEnabled.has(row.values[1])) {
        passedNonAction.add(idx);
      }
    }
    applyFilter((idx, row, type) => {
      if (type === 'Action') {
        // Pass if nearest parent is in passedNonAction.
        for (let j = idx - 1; j >= 0; j--) {
          if (rows[j].depth === row.depth - 1) return passedNonAction.has(j);
        }
        return false;
      }
      return reqEnabled.has(row.values[1]);
    });
  }

  // ── Filter 5: Imp/Urg ─────────────────────────────────────────────────────
  if (iu) {
    const threshold = IU_SCORES[iu];
    applyFilter((idx, row) => {
      const score = IU_SCORES[row.values[2]];
      return score !== undefined && score >= threshold;
    });
  }

  // ── Filter 6: Date ────────────────────────────────────────────────────────
  if (date) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    function passesDate(rowDate) {
      if (!rowDate) return false;
      const dMs = new Date(rowDate + 'T00:00:00').getTime();
      if (date === 'overdue')   return dMs < todayMs;
      if (date === 'today')     return dMs === todayMs;
      if (date === 'tomorrow')  return dMs === todayMs + 86400000;
      // Week/month options: include overdue (dates before today count as due).
      const dow = today.getDay(); // 0=Sun
      if (date === 'thisWeek') {
        const sun = new Date(today); sun.setDate(today.getDate() + (dow === 0 ? 0 : 7 - dow));
        return dMs <= sun.getTime();
      }
      if (date === 'nextWeek') {
        const nextSun = new Date(today); nextSun.setDate(today.getDate() + (dow === 0 ? 7 : 14 - dow));
        return dMs <= nextSun.getTime();
      }
      if (date === 'thisMonth') {
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return dMs <= lastDay.getTime();
      }
      return false;
    }

    applyFilter((idx, row) => passesDate(row.values[4]));
  }

  // ── Filter 7: Search ──────────────────────────────────────────────────────
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    applyFilter((idx, row) => row.values[0].toLowerCase().includes(q));
  }

  return rows
    .map((r, i) => ({ row: r, globalIdx: i }))
    .filter((_, i) => indices.has(i));
}

// ─── Seed data ────────────────────────────────────────────────────────────────

function seedRow(depth, vals) {
  const padded = [...vals];
  // Default Status for non-Area rows if not provided
  if (getType(depth) !== 'Area' && !padded[10]) padded[10] = 'Active';
  while (padded.length < NUM_COLS) padded.push('');
  return makeRow(depth, null, 0, padded);
}

//              0:name                       1:req    2:misc       3:$  4:date        5:time   6:link                  7:type         8:routine/event  9:enablers  10:status
const RAW_SEED = [
  seedRow(0, ['Personal']),
  seedRow(1, ['Health & Fitness',            'Need',  '',          '',  '2026-06-30', '',      '',                     'sequential',  '',              '',         'Active']),
  seedRow(2, ['Run a 5K',                    'Want',  'HM',        '',  '2026-05-01', '',      '',                     'sequential',  '',              '',         'Active']),
  seedRow(3, ['Training Plan',               'Must',  'HH',        '',  '2026-04-01', '',      '',                     'sequential',  'not r',         '',         'Active']),
  seedRow(4, ['Register for race',           '',      'work',      '',  '2026-03-20', '09:00', 'https://example.com', '',            'not e',         '',         'Active']),
  seedRow(4, ['Buy running shoes',           '',      'city',      '-120','2026-03-15','',     '',                     '',            'not e',         '',         'Active']),
  seedRow(2, ['Improve Diet',                'Want',  'MM',        '',  '',           '',      '',                     'sequential',  '',              '',         'Active']),
  seedRow(0, ['Work']),
  seedRow(1, ['Career Growth',               'Must',  '',          '',  '2026-12-31', '',      '',                     'sequential',  '',              '',         'Active']),
  seedRow(2, ['Launch Side Project',         'Need',  'HH',        '',  '2026-09-01', '',      '',                     'sequential',  '',              '',         'Active']),
  seedRow(3, ['Build MVP',                   'Must',  'HH',        '',  '2026-07-01', '',      '',                     'sequential',  'not r',         '',         'Active']),
  seedRow(4, ['Design wireframes',           '',      'long comp', '',  '2026-04-15', '14:00', '',                     '',            'not e',         '',         'Active']),
];

export const SEED_ROWS = recomputeStructure(RAW_SEED);

// ─── API layer ────────────────────────────────────────────────────────────────
//
// All server I/O is isolated here. To add offline sync:
//   1. Intercept saveRows() with a SyncQueue that buffers writes when offline.
//   2. Replay the queue on reconnect with a background worker.
//   3. loadRows() can be backed by an IndexedDB mirror for instant offline reads.
//
const API = '/api';

export async function checkAuth() {
  try {
    const res = await fetch(`${API}/auth/check`);
    const data = await res.json();
    return data.authenticated === true;
  } catch {
    return false;
  }
}

export async function login(username, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Invalid credentials');
}

export async function logout() {
  await fetch(`${API}/auth/logout`, { method: 'POST' });
}

export async function loadRows() {
  try {
    const res = await fetch(`${API}/rows`);
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

export async function saveRows(rows) {
  try {
    const res = await fetch(`${API}/rows`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    });
    if (!res.ok) console.warn('[storage] save returned', res.status);
  } catch (err) {
    // TODO: queue write for offline sync replay
    console.warn('[storage] save failed — data may be out of sync:', err);
  }
}
