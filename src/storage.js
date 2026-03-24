// ─── Constants ───────────────────────────────────────────────────────────────

export const TYPES = ['Area', 'Goal', 'Project', 'Step', 'Action'];

const IU_OPTS      = ['', '1', '2', '3', '4', '5'];
const CTX_OPTS     = [
  '', 'phone', 'comp & call', 'quick comp', 'long comp',
  'work', 'home', 'supermarket', 'storage', 'post office',
  'chemist', 'short drive', 'longer drive', 'gym', 'bunnings',
  'city', 'shopping center', "al's house", "g&t's house", 'boys', 'note',
];
const TYPE_OPTS    = ['sequential', 'parallel'];
const ROUTINE_OPTS = ['not r', 'routine'];
const EVENT_OPTS   = ['not e', 'event'];
const STATUS_OPTS  = ['Potential', 'Active', 'Someday', 'Done', 'Cancelled'];

// Data index reference (0-based, fixed — never reorder stored values):
// 0  name
// 1  (unused)
// 2  importance | context | empty
// 3  $ total (computed) | $ in/out | empty
// 4  week (ww-yy) | empty
// 5  priority (computed, never stored) | empty
// 6  date
// 7  time | empty
// 8  link
// 9  type | empty
// 10 routine | event | empty
// 11 enablers | empty
// 12 status
// 13 available (computed, never stored)
// 14 id (readonly) | empty

// Display column order: maps display position → data index
// Display: name | status | sequence | available | week | priority | importance | context | date | time | $ total | link | routine | enablers | id
export const COL_ORDER = [0, 12, 9, 13, 5, 4, 2, 2, 6, 7, 3, 8, 10, 11, 14];

export const COL_DEFS = {
  Area: [
    { label: 'Area',      type: 'text' },  // display 0 → data 0
    { label: '',          type: 'empty' }, // display 1 → data 12
    { label: '',          type: 'empty' }, // display 2 → data 13
    { label: '',          type: 'empty' }, // display 3 → data 5
    { label: '',          type: 'empty' }, // display 4 → data 4
    { label: '',          type: 'empty' }, // display 5 → data 2
    { label: '',          type: 'empty' }, // display 6 → data 2 (context col)
    { label: '',          type: 'empty' }, // display 7 → data 6
    { label: '',          type: 'empty' }, // display 8 → data 7
    { label: '',          type: 'empty' }, // display 9 → data 3
    { label: '',          type: 'empty' }, // display 10 → data 8
    { label: '',          type: 'empty' }, // display 11 → data 9
    { label: '',          type: 'empty' }, // display 12 → data 10
    { label: '',          type: 'empty' }, // display 13 → data 11
    { label: '',          type: 'empty' }, // display 14 → data 14
  ],
  Goal: [
    { label: 'Goal',        type: 'text' },                                          // display 0 → data 0
    { label: 'Status',      type: 'status', options: STATUS_OPTS, default: 'Active' }, // display 1 → data 12
    { label: 'Availability', type: 'available', readonly: true },                    // display 2 → data 13
    { label: 'Priority',    type: 'priority', readonly: true },                      // display 3 → data 5
    { label: 'Week',        type: 'week' },                                          // display 4 → data 4
    { label: '',            type: 'empty' },                                         // display 5 → data 2
    { label: '',            type: 'empty' },                                         // display 6 → data 2 (context col)
    { label: 'Date',        type: 'date' },                                          // display 7 → data 6
    { label: '',            type: 'empty' },                                         // display 8 → data 7
    { label: '$ total',     type: 'currency_sum', readonly: true },                  // display 9 → data 3
    { label: 'Link',        type: 'url' },                                           // display 10 → data 8
    { label: 'Sequence',    type: 'dropdown', options: TYPE_OPTS, default: 'sequential' }, // display 11 → data 9
    { label: '',            type: 'empty' },                                         // display 12 → data 10
    { label: 'Enablers',    type: 'text' },                                          // display 13 → data 11
    { label: 'ID',          type: 'id', readonly: true },                            // display 14 → data 14
  ],
  Project: [
    { label: 'Project',     type: 'text' },                                          // display 0 → data 0
    { label: 'Status',      type: 'status', options: STATUS_OPTS, default: 'Active' }, // display 1 → data 12
    { label: 'Availability', type: 'available', readonly: true },                    // display 2 → data 13
    { label: 'Priority',    type: 'priority', readonly: true },                      // display 3 → data 5
    { label: 'Week',        type: 'week' },                                          // display 4 → data 4
    { label: 'Importance',  type: 'dropdown', options: IU_OPTS },                    // display 5 → data 2
    { label: '',            type: 'empty' },                                         // display 6 → data 2 (context col)
    { label: 'Date',        type: 'date' },                                          // display 7 → data 6
    { label: '',            type: 'empty' },                                         // display 8 → data 7
    { label: '$ total',     type: 'currency_sum', readonly: true },                  // display 9 → data 3
    { label: 'Link',        type: 'url' },                                           // display 10 → data 8
    { label: 'Sequence',    type: 'dropdown', options: TYPE_OPTS, default: 'sequential' }, // display 11 → data 9
    { label: '',            type: 'empty' },                                         // display 12 → data 10
    { label: 'Enablers',    type: 'text' },                                          // display 13 → data 11
    { label: 'ID',          type: 'id', readonly: true },                            // display 14 → data 14
  ],
  Step: [
    { label: 'Step',        type: 'text' },                                          // display 0 → data 0
    { label: 'Status',      type: 'status', options: STATUS_OPTS, default: 'Active' }, // display 1 → data 12
    { label: 'Availability', type: 'available', readonly: true },                    // display 2 → data 13
    { label: 'Priority',    type: 'priority', readonly: true },                      // display 3 → data 5
    { label: 'Week',        type: 'week' },                                          // display 4 → data 4
    { label: 'Importance',  type: 'dropdown', options: IU_OPTS },                    // display 5 → data 2
    { label: '',            type: 'empty' },                                         // display 6 → data 2 (context col)
    { label: 'Date',        type: 'date' },                                          // display 7 → data 6
    { label: 'Time',        type: 'time' },                                          // display 8 → data 7
    { label: '$ total',     type: 'currency_sum', readonly: true },                  // display 9 → data 3
    { label: 'Link',        type: 'url' },                                           // display 10 → data 8
    { label: 'Sequence',    type: 'dropdown', options: TYPE_OPTS, default: 'sequential' }, // display 11 → data 9
    { label: 'Routine',     type: 'dropdown', options: ROUTINE_OPTS, default: 'not r' }, // display 12 → data 10
    { label: 'Enablers',    type: 'text' },                                          // display 13 → data 11
    { label: 'ID',          type: 'id', readonly: true },                            // display 14 → data 14
  ],
  Action: [
    { label: 'Action',    type: 'text' },                                            // display 0 → data 0
    { label: 'Status',    type: 'status', options: STATUS_OPTS, default: 'Active' }, // display 1 → data 12
    { label: 'Available', type: 'available', readonly: true },                       // display 2 → data 13
    { label: 'Priority',  type: 'priority', readonly: true },                        // display 3 → data 5
    { label: '',          type: 'empty' },                                           // display 4 → data 4
    { label: '',          type: 'empty' },                                           // display 5 → data 2 (importance col, n/a for actions)
    { label: 'Context',   type: 'dropdown', options: CTX_OPTS },                     // display 6 → data 2
    { label: 'Date',      type: 'date' },                                            // display 7 → data 6
    { label: 'Time',      type: 'time' },                                            // display 8 → data 7
    { label: '$ in/out',  type: 'currency' },                                        // display 9 → data 3
    { label: 'Link',      type: 'url' },                                             // display 10 → data 8
    { label: '',          type: 'empty' },                                           // display 11 → data 9
    { label: 'Event',     type: 'dropdown', options: EVENT_OPTS, default: 'not e' }, // display 12 → data 10
    { label: '',          type: 'empty' },                                           // display 13 → data 11
    { label: '',          type: 'empty' },                                           // display 14 → data 14
  ],
};

// Permanent column headers — fixed regardless of selected row type
export const COL_HEADERS = [
  'Name',       // display 0  → data 0
  'Status',     // display 1  → data 12
  'Sequence',   // display 2  → data 9
  'Available',  // display 3  → data 13
  'Priority',   // display 4  → data 5
  'Week',       // display 5  → data 4
  'Importance', // display 6  → data 2
  'Context',    // display 7  → data 2
  'Date',       // display 8  → data 6
  'Time',       // display 9  → data 7
  '$',          // display 10 → data 3
  'Link',       // display 11 → data 8
  'Ro / Ev',    // display 12 → data 10
  'Enablers',   // display 13 → data 11
  'ID',         // display 14 → data 14
];

export const COL_WIDTHS = [345, 40, 40, 40, 65, 65, 65, 95, 100, 65, 85, 60, 75, 100, 70];
export const INDENT_PX  = 20;
export const NUM_COLS   = 15;

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
 * Create a new row with 15 values.
 * - ID written into values[14] for Goal/Project/Step.
 * - values[3]  ($ sum) cleared for Goal/Project/Step — always computed.
 * - values[5]  (Priority) always cleared — always computed.
 * - values[13] (Available) always cleared — always computed.
 */
export function makeRow(depth, parentId = null, position = 0, vals = null) {
  const type = getType(depth);
  const defs = COL_DEFS[type];
  const id   = makeId();

  const values = vals ? [...vals] : (() => {
    const v = new Array(NUM_COLS).fill('');
    defs.forEach((def, di) => { if (def.default !== undefined) v[COL_ORDER[di]] = def.default; });
    return v;
  })();
  while (values.length < NUM_COLS) values.push('');

  if (type === 'Goal' || type === 'Project' || type === 'Step') {
    values[14] = id;   // ID column
    values[3]  = '';   // $ sum is computed, never stored
  }
  values[5]  = '';     // Priority is computed, never stored
  values[13] = '';     // Available is computed, never stored

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
 * Compute the Available field for every row. Returns a map: rowId → 'Yes' | 'Potential' | 'No' | ''.
 *
 * A non-Area row is Available ('Yes') when ALL of the following hold:
 *  1. Its own Status is 'Active'.
 *  2. Every ID listed in its Enablers (index 9) has Status 'Completed' or 'Cancelled'.
 *  3. (Steps only) If the parent Project/Step has Type 'sequential':
 *       this row must be the first direct child Step whose Status is not Completed/Cancelled.
 *  4. (Actions only) The nearest parent row (Step or Project) must itself be Available.
 *
 * A row is 'Potential' when it would otherwise be Available but is blocked by a row whose
 * own Status is 'Potential' (own status, a sequential predecessor, or an ancestor).
 *
 * Rows are processed top-to-bottom, so parent availability is always resolved first.
 */
export function computeAvailability(rows) {
  const result   = {};   // rowId → '' | 'Yes' | 'Potential' | 'No'
  const statusOf = {};   // rowId → status string

  rows.forEach(row => { statusOf[row.id] = row.values[12]; });

  rows.forEach((row, i) => {
    const type = getType(row.depth);

    if (type === 'Area') { result[row.id] = ''; return; }

    // Rule 1 — own Status must be Active (Potential status yields Potential availability)
    if (statusOf[row.id] === 'Potential') { result[row.id] = 'Potential'; return; }
    if (statusOf[row.id] !== 'Active') { result[row.id] = 'No'; return; }

    // Rule 2 — all Enablers must be Completed or Cancelled
    const enablersRaw = (row.values[11] || '').trim();
    if (enablersRaw) {
      const ids = enablersRaw.split(',').map(s => s.trim()).filter(Boolean);
      if (ids.some(id => statusOf[id] !== 'Done' && statusOf[id] !== 'Cancelled')) {
        result[row.id] = 'No'; return;
      }
    }

    // Rule 3 — row inside a Sequential parent (Goal→Project, Project→Step, Step→Step)
    // Goal/Project/Step all carry their Sequence value at values[8].
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
          const isSequential = parent.values[9] !== 'parallel'; // default sequential
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
            if (firstId !== row.id) {
              // Propagate Potential if the blocking predecessor is itself Potential
              result[row.id] = result[firstId] === 'Potential' ? 'Potential' : 'No';
              return;
            }
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
        // Propagate Potential if the parent is Potential
        result[row.id] = result[rows[parentIdx].id] === 'Potential' ? 'Potential' : 'No';
        return;
      }
    }

    result[row.id] = 'Yes';
  });

  return result;
}

// ─── Importance scoring (for filter) ─────────────────────────────────────────

export const IU_SCORES = { '1': 5, '2': 4, '3': 3, '4': 2, '5': 1 };
export const IU_OPTIONS = ['1', '2', '3', '4', '5'];

// ─── Week / Priority helpers ──────────────────────────────────────────────────

/**
 * Returns the current ISO-like week number and full year using the same
 * Monday-based rule shown in the app header.
 */
export function getCurrentWeek() {
  const now  = new Date();
  const year = now.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay(); // 0=Sun … 6=Sat

  let firstMonday;
  if (jan1Day === 1) {
    firstMonday = jan1;
  } else {
    const daysToMonday = jan1Day === 0 ? 1 : 8 - jan1Day;
    firstMonday = new Date(year, 0, 1 + daysToMonday);
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let week;
  if (today < firstMonday) {
    week = 1;
  } else {
    const weekOffset = jan1Day === 1 ? 1 : 2;
    const daysSince  = Math.floor((today - firstMonday) / 86400000);
    week = weekOffset + Math.floor(daysSince / 7);
  }

  return { week, year };
}

/**
 * Compute the Priority field for every row. Returns a map: rowId → 'x.y' | ''.
 *
 * For Goal / Project / Step:
 *   x = importance value (values[2], one of 1–5)
 *   y = weeks remaining until the week stored in values[4] (ww-yy),
 *       clamped to 0 — negative values (overdue) become 0.
 *
 * For Action rows: inherit the computed priority of the direct parent row.
 * For Area rows: always ''.
 *
 * Rows are processed top-to-bottom so parent priority is resolved first.
 */
export function computePriority(rows) {
  const { week: currentWeek, year: currentYear } = getCurrentWeek();
  const result = {}; // rowId → string

  rows.forEach((row, i) => {
    const type = getType(row.depth);

    if (type === 'Area') { result[row.id] = ''; return; }

    if (type === 'Action') {
      // Inherit from direct parent (nearest row one depth above)
      for (let j = i - 1; j >= 0; j--) {
        if (rows[j].depth === row.depth - 1) {
          result[row.id] = result[rows[j].id] ?? '';
          return;
        }
      }
      result[row.id] = '';
      return;
    }

    // Goal / Project / Step
    const importance = row.values[2]; // Importance (index 2)
    const weekStr    = row.values[4]; // Week ww-yy (index 4)

    if (!importance || !weekStr) { result[row.id] = ''; return; }

    const m = weekStr.match(/^(\d{1,2})-(\d{2})$/);
    if (!m) { result[row.id] = ''; return; }

    const targetWeek = parseInt(m[1], 10);
    const targetYear = 2000 + parseInt(m[2], 10);
    const weeksLeft  = Math.max(0, (targetYear - currentYear) * 52 + (targetWeek - currentWeek));

    result[row.id] = `${weeksLeft}.${importance}`;
  });

  return result;
}

// ─── Visibility computation ───────────────────────────────────────────────────

/**
 * Compute the set of visible rows after applying all filters with AND logic.
 * Returns [{ row, globalIdx }, ...] in original order.
 *
 * filters: {
 *   area:       string — '' or area row id
 *   types:      Set    — enabled types, subset of ['Goal','Project','Step','Action']
 *   nextAction: string — 'all' | 'nextActions'
 *   priority:   Set    — enabled priority buckets, subset of ['X','0','1','2','3','4','5']
 *   iu:         string — '' | IU code (e.g. 'HH', 'MM')
 *   date:       string — '' | 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'nextWeek' | 'thisMonth'
 *   search:     string — text search on row name
 * }
 *
 * Area rows are always kept regardless of filters 2-7.
 * Ancestors of rows passing a filter are added for context, but only within the
 * current candidate set (so the Area filter cannot be bypassed).
 */
export function computeVisible(rows, available, priorityMap, filters) {
  const { area, types, nextAction, priority, iu, date, search } = filters;

  function getPriorityBucket(priorityStr) {
    if (!priorityStr) return 'X';
    const n = parseFloat(priorityStr);
    if (isNaN(n)) return 'X';
    const b = Math.floor(n);
    if (b >= 5) return '5';
    return String(b);
  }

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

  // ── Filter 2: Priority ────────────────────────────────────────────────────
  // When any button is active: suppress Area/Goal rows entirely (no ancestor
  // promotion). Steps and Actions are kept when their own priority bucket
  // matches. Project rows are kept as parent containers whenever any descendant
  // Step or Action matches — the Project's own priority is not checked.
  if (priority && priority.size > 0) {
    const addDescendants = (idx, currentIndices, resultSet) => {
      const d = rows[idx].depth;
      for (let j = idx + 1; j < rows.length; j++) {
        if (rows[j].depth <= d) break;
        if (!currentIndices.has(j)) continue;
        const t = getType(rows[j].depth);
        if (t === 'Step' || t === 'Action') resultSet.add(j);
      }
    };
    const prev = indices;
    const next = new Set();
    for (const idx of prev) {
      const type = getType(rows[idx].depth);
      if (type === 'Area' || type === 'Goal') continue;
      if (type === 'Project') {
        // Show project if any descendant Step or Action matches the priority filter.
        const [, end] = subtreeRange(rows, idx);
        for (let j = idx + 1; j < end; j++) {
          if (!prev.has(j)) continue;
          const descType = getType(rows[j].depth);
          if ((descType === 'Step' || descType === 'Action') &&
              priority.has(getPriorityBucket(priorityMap[rows[j].id]))) {
            next.add(idx);
            break;
          }
        }
      } else {
        // Step or Action: include if own priority bucket matches.
        const bucket = getPriorityBucket(priorityMap[rows[idx].id]);
        if (priority.has(bucket)) {
          next.add(idx);
          addDescendants(idx, prev, next);
        }
      }
    }
    indices = next;
  }

  // ── Filter 3: Types ───────────────────────────────────────────────────────
  // Default state: empty Set — no type filter, all rows visible.
  // When one or more buttons are active: keep only rows whose type matches
  // any active button (OR logic). No ancestor/context rows are promoted.
  if (types && types.size > 0) {
    const prev = indices;
    const next = new Set();
    for (const idx of prev) {
      const type = getType(rows[idx].depth);
      if (types.has(type)) {
        next.add(idx);
      }
    }
    indices = next;
  }

  // ── Filter 4: Next Actions ────────────────────────────────────────────────
  if (nextAction === 'nextActions') {
    applyFilter((idx, row, type) => (type === 'Step' || type === 'Action') && available[row.id] === 'Yes');
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

    applyFilter((idx, row) => passesDate(row.values[6]));
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
  if (getType(depth) !== 'Area' && !padded[12]) padded[12] = 'Active';
  while (padded.length < NUM_COLS) padded.push('');
  return makeRow(depth, null, 0, padded);
}

//              0:name                       1:unused  2:misc       3:$  4:week  5:pri  6:date        7:time   8:link                  9:type         10:routine/event  11:enablers  12:status
const RAW_SEED = [
  seedRow(0, ['Personal']),
  seedRow(1, ['Health & Fitness',            '',       '',          '',  '',     '',    '2026-06-30', '',      '',                     'sequential',  '',               '',          'Active']),
  seedRow(2, ['Run a 5K',                    '',       '2',         '',  '',     '',    '2026-05-01', '',      '',                     'sequential',  '',               '',          'Active']),
  seedRow(3, ['Training Plan',               '',       '1',         '',  '',     '',    '2026-04-01', '',      '',                     'sequential',  'not r',          '',          'Active']),
  seedRow(4, ['Register for race',           '',       'work',      '',  '',     '',    '2026-03-20', '09:00', 'https://example.com', '',            'not e',          '',          'Active']),
  seedRow(4, ['Buy running shoes',           '',       'city',      '-120','',   '',    '2026-03-15', '',      '',                     '',            'not e',          '',          'Active']),
  seedRow(2, ['Improve Diet',                '',       '3',         '',  '',     '',    '',           '',      '',                     'sequential',  '',               '',          'Active']),
  seedRow(0, ['Work']),
  seedRow(1, ['Career Growth',               '',       '',          '',  '',     '',    '2026-12-31', '',      '',                     'sequential',  '',               '',          'Active']),
  seedRow(2, ['Launch Side Project',         '',       '1',         '',  '',     '',    '2026-09-01', '',      '',                     'sequential',  '',               '',          'Active']),
  seedRow(3, ['Build MVP',                   '',       '1',         '',  '',     '',    '2026-07-01', '',      '',                     'sequential',  'not r',          '',          'Active']),
  seedRow(4, ['Design wireframes',           '',       'long comp', '',  '',     '',    '2026-04-15', '14:00', '',                     '',            'not e',          '',          'Active']),
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

// Module-level promise that tracks the latest in-flight save.
// Stored on window so it survives HMR module re-execution — otherwise a
// hot-reload could reset the promise and let loadRows() race ahead of a
// still-in-flight save from the unmount cleanup.
if (typeof window !== 'undefined' && !window.__trackerSaveFlight) {
  window.__trackerSaveFlight = Promise.resolve();
}
const _getF = () => (typeof window !== 'undefined' ? window.__trackerSaveFlight : Promise.resolve());
const _setF = (p) => { if (typeof window !== 'undefined') window.__trackerSaveFlight = p; };

export async function loadRows() {
  await _getF(); // wait for any in-flight save to finish first
  const res = await fetch(`${API}/rows`);
  if (!res.ok) throw new Error(`[storage] load failed: HTTP ${res.status}`);
  const rows = await res.json();
  return rows.length > 0 ? rows : null; // null = empty DB → caller should use seed
}

export function saveRows(rows) {
  const next = _getF().then(() =>
    fetch(`${API}/rows`, {
      method: 'PUT',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })
    .then(res => { if (!res.ok) console.warn('[storage] save returned', res.status); })
    .catch(err => { console.warn('[storage] save failed — data may be out of sync:', err); })
  );
  _setF(next);
  return next;
}
