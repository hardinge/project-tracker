import { Router } from 'express';
import db from './db.js';

const router = Router();

router.get('/', (req, res) => {
  const { tab } = req.query;
  const rows = tab
    ? db.prepare('SELECT * FROM blocks WHERE tab = ?').all(tab)
    : db.prepare('SELECT * FROM blocks').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { id, tab, day, sub_col, start_slot, end_slot, label, category, linked_id, created_at } = req.body;
  try {
    db.prepare(`
      INSERT INTO blocks (id, tab, day, sub_col, start_slot, end_slot, label, category, linked_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, tab, day, sub_col, start_slot, end_slot, label ?? '', category ?? null, linked_id ?? null, created_at ?? Date.now());
    res.json({ ok: true });
  } catch (err) {
    console.error('[blocks] create error:', err);
    res.status(500).json({ error: 'Create failed' });
  }
});

router.put('/:id', (req, res) => {
  const patch = req.body;
  try {
    const existing = db.prepare('SELECT * FROM blocks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare(`
      UPDATE blocks SET
        start_slot = ?, end_slot = ?, label = ?,
        category = ?, linked_id = ?, day = ?
      WHERE id = ?
    `).run(
      patch.start_slot ?? existing.start_slot,
      patch.end_slot   ?? existing.end_slot,
      patch.label      !== undefined ? patch.label      : existing.label,
      patch.category   !== undefined ? patch.category   : existing.category,
      patch.linked_id  !== undefined ? patch.linked_id  : existing.linked_id,
      patch.day        ?? existing.day,
      req.params.id,
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[blocks] update error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM blocks WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[blocks] delete error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// POST /api/blocks/rotate — midnight rotation for Now tab
router.post('/rotate', (req, res) => {
  try {
    db.exec('BEGIN TRANSACTION');
    db.prepare("DELETE FROM blocks WHERE tab='now' AND day=0 AND sub_col='revised'").run();
    db.prepare("UPDATE blocks SET day=0 WHERE tab='now' AND day=1 AND sub_col='revised'").run();
    db.exec('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    console.error('[blocks] rotate error:', err);
    res.status(500).json({ error: 'Rotate failed' });
  }
});

export default router;
