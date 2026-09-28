import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { runMigrations } from '../src/lib/migrate';
import * as schema from './schema';

const file = process.env.DATABASE_PATH ?? './data/fullframe.sqlite';

// Migrate before the app's connection opens — this module is the only door to
// the database, so a fresh deploy's volume is schema-ready before the first
// query. (It lives here rather than in Next's `instrumentation.ts` because
// that file is also compiled for non-node runtimes, where better-sqlite3's
// native `bindings` require of `fs` cannot resolve.)
//
// Dev compiles this module once per route graph, so the once-flag hangs off
// the process rather than off the module. (Re-running is harmless either way —
// drizzle's migrator is idempotent.)
const MIGRATED = Symbol.for('fullframe.migrated');
const g = globalThis as unknown as Record<symbol, boolean>;
if (!g[MIGRATED]) {
  runMigrations();
  g[MIGRATED] = true;
}

const sqlite = new Database(file);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export * as schema from './schema';
