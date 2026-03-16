import { Router } from 'express';
import db from './db.js';

const router = Router();

router.get('/', (_req, res) => {
  const raw = db.prepare('SELECT * FROM rows ORDER BY sort_order').all();
  res.json(raw.map(r => ({
    id:        r.id,
    parent_id: r.parent_id,
    position:  r.position,
    depth:     r.depth,
    values:    JSON.parse(r.values_json),
  })));
});

// node:sqlite uses bare keys for named params (no @ prefix in the object)
const upsertRow = db.prepare(`
  INSERT INTO rows (id, parent_id, position, depth, values_json, sort_order)
  VALUES (@id, @parent_id, @position, @depth, @values_json, @sort_order)
  ON CONFLICT(id) DO UPDATE SET
    parent_id   = excluded.parent_id,
    position    = excluded.position,
    depth       = excluded.depth,
    values_json = excluded.values_json,
    sort_order  = excluded.sort_order
`);

router.put('/', (req, res) => {
  const rows = req.body;
  db.exec('BEGIN TRANSACTION');
  try {
    if (rows.length > 0) {
      const placeholders = rows.map(() => '?').join(',');
      db.prepare(`DELETE FROM rows WHERE id NOT IN (${placeholders})`)
        .run(...rows.map(r => r.id));
    } else {
      db.exec('DELETE FROM rows');
    }
    rows.forEach((row, i) => {
      upsertRow.run({
        id:          row.id,
        parent_id:   row.parent_id ?? null,
        position:    row.position,
        depth:       row.depth,
        values_json: JSON.stringify(row.values),
        sort_order:  i,
      });
    });
    db.exec('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('[rows] save error:', err);
    res.status(500).json({ error: 'Save failed' });
  }
});

export default router;
