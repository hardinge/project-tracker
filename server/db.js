import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'fs';

const dataDir = '/data';
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(`${dataDir}/tracker.db`);

db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS rows (
    id          TEXT    PRIMARY KEY,
    parent_id   TEXT,
    position    INTEGER NOT NULL DEFAULT 0,
    depth       INTEGER NOT NULL DEFAULT 0,
    values_json TEXT    NOT NULL DEFAULT '[]',
    sort_order  INTEGER NOT NULL DEFAULT 0
  )
`);

// Migrate status values: Completed → Done, Deferred → Someday
db.exec(`
  UPDATE rows SET values_json = json_replace(values_json, '$[12]', 'Done')
  WHERE json_extract(values_json, '$[12]') = 'Completed'
`);
db.exec(`
  UPDATE rows SET values_json = json_replace(values_json, '$[12]', 'Someday')
  WHERE json_extract(values_json, '$[12]') = 'Deferred'
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS blocks (
    id         TEXT    PRIMARY KEY,
    tab        TEXT    NOT NULL,
    day        INTEGER NOT NULL,
    sub_col    TEXT    NOT NULL,
    start_slot INTEGER NOT NULL,
    end_slot   INTEGER NOT NULL,
    label      TEXT    NOT NULL DEFAULT '',
    category   TEXT,
    linked_id  TEXT,
    created_at INTEGER NOT NULL DEFAULT 0
  )
`);

// Migrate existing tables that predate the created_at column
try {
  db.exec('ALTER TABLE blocks ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0');
} catch (_) { /* column already exists */ }

export default db;
