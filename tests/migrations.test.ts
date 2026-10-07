import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { runMigrations } from "../src/lib/migrate";

/**
 * The schema is a squashed initial migration plus the changes made since
 * (installations now hold data, so they migrate forward). A fresh database gets every table, including each exhibition's
 * TYDAL organization, and migrating again changes nothing.
 */
test("a fresh database gets the whole schema, and re-running migrations is harmless", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fullframe-migration-"));
  const previous = process.env.DATABASE_PATH;
  try {
    const file = path.join(dir, "fresh.sqlite");
    process.env.DATABASE_PATH = file;
    runMigrations();
    runMigrations();

    const db = new Database(file);
    const tables = (db.prepare("select name from sqlite_master where type='table'").all() as { name: string }[])
      .map((t) => t.name);
    for (const table of ["exhibitions", "criteria", "jurors", "votes", "comments", "authors", "submissions"])
      assert.ok(tables.includes(table), `missing table ${table}`);

    const columns = (db.prepare("pragma table_info(exhibitions)").all() as { name: string }[]).map((c) => c.name);
    assert.ok(columns.includes("organization_id"));
    assert.ok(columns.includes("organization_name"));
    assert.ok(columns.includes("submissions") && columns.includes("submission_limit"));
    assert.ok(columns.includes("description_required"));
    assert.ok(columns.includes("organization_slug"));

    // An exhibition slug is unique within its organization, not installation-wide.
    const insert = db.prepare(
      "insert into exhibitions (slug, title, organization_slug, created_at, updated_at) values (?, ?, ?, 0, 0)",
    );
    insert.run("semana-42", "Semana 42", "lucila");
    insert.run("semana-42", "Semana 42", "otra");
    assert.throws(() => insert.run("semana-42", "Again", "lucila"), /UNIQUE/);
    db.close();
  } finally {
    process.env.DATABASE_PATH = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
