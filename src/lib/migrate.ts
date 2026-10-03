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
  const unlock = lock(`${file}.migrate-lock`);
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
    unlock();
  }
}

/**
 * One migrator at a time per database file. `next build` collects page data
 * in several worker processes, each importing db/index.ts — against a fresh
 * file they all saw no migrations applied and raced to create the same tables
 * ("table already exists"). The lock file serialises them; the ones that wait
 * then find everything applied. A lock older than a minute is a crashed run's
 * and is taken over.
 */
function lock(lockFile: string): () => void {
  const wait = new Int32Array(new SharedArrayBuffer(4));
  for (const started = Date.now(); ; ) {
    try {
      const fd = fs.openSync(lockFile, 'wx');
      return () => {
        fs.closeSync(fd);
        fs.rmSync(lockFile, { force: true });
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const age = Date.now() - (fs.statSync(lockFile, { throwIfNoEntry: false })?.mtimeMs ?? Date.now());
      if (age > 60_000) fs.rmSync(lockFile, { force: true });
      else if (Date.now() - started > 120_000)
        throw new Error(`Timed out waiting for another migration (${lockFile}).`);
      else Atomics.wait(wait, 0, 0, 50); // synchronous: the callers are synchronous
    }
  }
}
