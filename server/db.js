import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../data');
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, 'tracker.db'));

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

export default db;
