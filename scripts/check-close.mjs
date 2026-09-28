import assert from "node:assert/strict";
import { createCipheriv, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import fs from "node:fs";
import Database from "better-sqlite3";

if (!process.env.DATABASE_PATH?.endsWith("/preview.sqlite"))
  throw new Error("Use only the isolated preview database.");
const db = new Database(process.env.DATABASE_PATH);
const exhibition = db
  .prepare("select * from exhibitions order by id limit 1")
  .get();
assert(exhibition);
const base = "http://localhost:3020";
const login = await (await fetch(base + "/admin/login")).text();
const form = new FormData();
form.set(login.match(/name="(\$ACTION_ID_[^"]+)"/)[1], "");
form.set("password", process.env.ADMIN_PASSWORD);
const auth = await fetch(base + "/admin/login", {
  method: "POST",
  body: form,
  redirect: "manual",
});
assert.equal(auth.status, 303);
const cookie = auth.headers
  .getSetCookie()
  .find((c) => c.startsWith("ff_studio="))
  .split(";")[0];
await (
  await fetch(base + `/admin/${exhibition.id}/results`, { headers: { cookie } })
).text();
const manifest = JSON.parse(
  fs.readFileSync(".next/server/server-reference-manifest.json", "utf8"),
);
const actionId = Object.entries(manifest.node).find(
  ([, v]) => v.exportedName === "setPhase",
)?.[0];
assert(actionId);
let rejected = true;
let closes = 0;
const server = createServer((req, res) => {
  res.setHeader("content-type", "application/json");
  if (
    req.method === "POST" &&
    req.url === `/h/${exhibition.vault_hash}/w/close`
  ) {
    assert.equal(req.headers["x-vault-key"], "dummy-close-key");
    closes++;
    res.statusCode = rejected ? 403 : 200;
    res.end(
      JSON.stringify(
        rejected ? { message: "Rejected test key" } : { state: "private" },
      ),
    );
  } else if (req.url?.includes("/resources"))
    res.end(JSON.stringify({ resources: [], pagination: { has_more: false } }));
  else
    res.end(
      JSON.stringify({ hash: exhibition.vault_hash, purpose: "gallery" }),
    );
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const raw = process.env.FULLFRAME_ENCRYPTION_KEY;
const key = Buffer.from(raw, /^[0-9a-fA-F]{64}$/.test(raw) ? "hex" : "base64");
const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", key, iv);
const encrypted = Buffer.concat([
  cipher.update("dummy-close-key", "utf8"),
  cipher.final(),
]);
const sealed = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
  "base64",
);
async function close() {
  const r = await fetch(base + `/admin/${exhibition.id}/results`, {
    method: "POST",
    redirect: "manual",
    headers: {
      cookie,
      origin: base,
      "next-action": actionId,
      "content-type": "text/plain;charset=UTF-8",
    },
    body: JSON.stringify([exhibition.id, "selection"]),
  });
  assert.equal(r.status, 200);
  return await r.text();
}
try {
  db.prepare(
    "update exhibitions set phase='open',vault_base_url=?,write_vault_key=? where id=?",
  ).run(`http://127.0.0.1:${server.address().port}`, sealed, exhibition.id);
  const failed = await close();
  assert(failed.includes("Could not close the vault"));
  assert.equal(
    db.prepare("select phase from exhibitions where id=?").get(exhibition.id)
      .phase,
    "open",
  );
  assert.equal(closes, 1);
  console.log(
    "PASS close failures return visible action feedback and keep the exhibition open",
  );
  rejected = false;
  const success = await close();
  assert(success.includes('"ok":true'));
  const row = db
    .prepare("select phase,opened_at,writeback_at from exhibitions where id=?")
    .get(exhibition.id);
  assert.deepEqual(row, {
    phase: "selection",
    opened_at: null,
    writeback_at: null,
  });
  assert.equal(closes, 2);
  await close();
  assert.equal(closes, 2);
  console.log(
    "PASS successful close updates the phase and dates; repeating it does not write again",
  );
} finally {
  db.prepare(
    "update exhibitions set phase=?,vault_base_url=?,write_vault_key=?,opened_at=?,writeback_at=? where id=?",
  ).run(
    exhibition.phase,
    exhibition.vault_base_url,
    exhibition.write_vault_key,
    exhibition.opened_at,
    exhibition.writeback_at,
    exhibition.id,
  );
  db.close();
  server.close();
  server.closeAllConnections();
}
