/**
 * Apply the generated SQL migrations to the SQLite file.
 * Run once, from `db/index.ts`, before the app's connection opens. Idempotent
 * — drizzle's migrator tracks what has already been applied.
 *
 * No `server-only` marker here on purpose: `db/index.ts` is also loaded by the
 * tsx seed scripts, outside any bundler.
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { log } from './log';

export function runMigrations(): void {
  const file = process.env.DATABASE_PATH ?? './data/fullframe.sqlite';
  const folder = path.resolve('drizzle');
  if (!fs.existsSync(folder)) {
    log.warn('migrate.skip', { reason: 'no drizzle folder', folder });
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  try {
    // SQLite table rebuilds need this outside the migrator's transaction.
    sqlite.pragma('foreign_keys = OFF');
    migrate(drizzle(sqlite), { migrationsFolder: folder });
    if ((sqlite.pragma('foreign_key_check') as unknown[]).length)
      throw new Error('Database migration left invalid foreign keys.');
    log.info('migrate.done', { file });
  } finally {
    sqlite.close();
  }
}
