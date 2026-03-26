import { useEffect, useRef } from 'react';
import {
  COL_DEFS, COL_WIDTHS, COL_HEADERS, COL_ORDER, INDENT_PX, TYPE_BADGE_COLOR, getType,
} from './storage.js';
import CellDisplay, { isValidWeek } from './CellDisplay.jsx';

export default function MainTable({
  rows,
  visible,
  sel,
  editing,
  containerRef,
  updateCell,
  setSel,
  setEditing,
  setFilterFocus,
  computedAvailable,
  computedPriority,
  computedInheritedPriority,
  computedImportance,
  computedSums,
  flashedRowId,
}) {
  const inputRef = useRef(null);
  const totalWidth = COL_WIDTHS.reduce((a, b) => a + b, 0);

  // Focus the active cell input whenever editing starts or selection moves
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.select) inputRef.current.select();
    }
  }, [editing, sel]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* ── Column headers ── */}
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
        <div style={{ minWidth: totalWidth }}>
          {visible.map(({ row, globalIdx }, rowIdx) => {
            const type      = getType(row.depth);
            const defs      = COL_DEFS[type];
            const isSelRow  = sel.r === rowIdx;
            const isFlashed = flashedRowId === row.id;

            const rowBg = isFlashed    ? '#3a1a0a'
              : isSelRow               ? '#1e3a5f'
              : type === 'Area'        ? '#12151f'
              : type === 'Goal'        ? '#161b2e'
              : type === 'Project'     ? '#1a2035'
              : type === 'Step'        ? '#1d2133'
              :                          '#1e2238';

            const PROJECT_BRACKET_COLOR = '#2e3f6a';
            const isProjectRow = type === 'Project';
            const nextRow = visible[rowIdx + 1];
            const isLastProjectDescendant = row.depth >= 2 && (!nextRow || nextRow.row.depth < 2);

            return (
              <div
                id={`row-${rowIdx}`}
                key={row.id}
                style={{
                  display: 'flex',
                  borderTop: isProjectRow ? `1px solid ${PROJECT_BRACKET_COLOR}` : undefined,
                  borderBottom: isLastProjectDescendant
                    ? `1px solid ${PROJECT_BRACKET_COLOR}`
                    : `1px solid ${isSelRow ? '#2d4a6e' : '#1e2235'}`,
                  background: rowBg,
                  transition: isFlashed ? 'none' : 'background 0.1s',
                }}
                onMouseDown={() => {
                  setSel({ r: rowIdx, c: sel.c });
                  setEditing(false);
                  setFilterFocus(null);
                  containerRef.current?.focus();
                }}
              >
                {COL_WIDTHS.map((w, colIdx) => {
                  const def = defs[colIdx];
                  const dataIdx = COL_ORDER[colIdx];
                  const isInheritedPriorityRow = type === 'Project' || type === 'Goal';

                  const displayVal =
                    def.type === 'currency_sum' ? (computedSums[row.id] ?? 0)
                    : def.type === 'available'  ? (computedAvailable[row.id] ?? '')
                    : def.type === 'priority'   ? (isInheritedPriorityRow
                                                    ? (computedInheritedPriority[row.id] ?? '')
                                                    : (computedPriority[row.id] ?? ''))
                    : def.type === 'id'         ? row.id
                    : (def.readonly && def.type === 'dropdown' && dataIdx === 2 && (type === 'Step' || type === 'Action'))
                                                ? (computedImportance[row.id] ?? '')
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
                      {/* Type badge — col 0 only */}
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
                          <CellDisplay val={displayVal} def={def} inherited={
                            (def.type === 'priority' && isInheritedPriorityRow) ||
                            (def.type === 'dropdown' && dataIdx === 2 && (type === 'Step' || type === 'Action'))
                          } />
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
    </div>
  );
}
