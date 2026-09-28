import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import Database from "better-sqlite3";
import { encryptSecret, decryptSecret } from "../src/lib/crypto";
if (!process.env.DATABASE_PATH?.endsWith("/preview.sqlite"))
  throw new Error("Use only the isolated preview database.");
const db = new Database(process.env.DATABASE_PATH);
const e = db
  .prepare("select * from exhibitions order by id limit 1")
  .get() as Record<string, any>;
assert(e);
const base = "http://localhost:3020";
const login = await (await fetch(base + "/admin/login")).text();
const form = new FormData();
form.set(login.match(/name="(\$ACTION_ID_[^"]+)"/)![1], "");
form.set("password", process.env.ADMIN_PASSWORD!);
const auth = await fetch(base + "/admin/login", {
  method: "POST",
  body: form,
  redirect: "manual",
});
assert.equal(auth.status, 303);
const cookie = auth.headers
  .getSetCookie()
  .find((c) => c.startsWith("ff_studio="))!
  .split(";")[0];
const html = await (
  await fetch(base + `/admin/${e.id}`, { headers: { cookie } })
).text();
const bindingForm = html
  .match(/<form\b[^>]*>[\s\S]*?<\/form>/g)!
  .find((s) => s.includes('name="vaultUrl"'))!;
assert(bindingForm);
const decode = (s: string) =>
  s
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&");
const hidden = [
  ...bindingForm.matchAll(/<input\b[^>]*type="hidden"[^>]*>/g),
].map(([tag]) => [
  decode(tag.match(/name="([^"]*)"/)![1]),
  decode(tag.match(/value="([^"]*)"/)?.[1] || ""),
]);
assert(hidden.length);
let methods = ["activate"];
let hash = e.vault_hash;
let rejected = false;
const server = createServer((req, res) => {
  res.setHeader("content-type", "application/json");
  assert.equal(req.method, "GET", "Validation must not write to TYDAL");
  if (req.url?.endsWith("/w")) {
    assert.equal(req.headers["x-vault-key"], "dummy-write-key");
    res.statusCode = rejected ? 403 : 200;
    res.end(
      JSON.stringify(rejected ? { error: "Denied" } : { ok: true, methods }),
    );
  } else
    res.end(
      JSON.stringify({
        hash,
        purpose: "gallery",
        tiers: { binary: true },
        organization: "test",
        slug: "test",
        resource_count: 0,
        state: "public",
      }),
    );
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const vaultUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}/h/${e.vault_hash}`;
async function save(writeKey = "dummy-write-key") {
  const body = new FormData();
  for (const [name, value] of hidden) body.set(name, value);
  body.set("vaultUrl", vaultUrl);
  body.set("readVaultKey", "");
  body.set("writeVaultKey", writeKey);
  const response = await fetch(base + `/admin/${e.id}`, {
    method: "POST",
    redirect: "manual",
    headers: { cookie, origin: base },
    body,
  });
  assert.equal(response.status, 303);
  return response.headers.get("location")!;
}
try {
  db.prepare(
    "update exhibitions set write_vault_key=null,read_vault_key=? where id=?",
  ).run(encryptSecret("dummy-read-key"), e.id);
  const before = db.prepare("select * from exhibitions where id=?").get(e.id);
  const failed = await save();
  const detail = new URL(failed, base).searchParams.get("detail");
  assert.match(detail!, /missing permissions: w:open, w:close/);
  assert.deepEqual(
    db.prepare("select * from exhibitions where id=?").get(e.id),
    before,
  );
  const errorPage = await (
    await fetch(new URL(failed, base), { headers: { cookie } })
  ).text();
  assert(errorPage.includes("missing permissions: w:open, w:close"));
  console.log(
    "PASS incomplete key names missing permissions on the save page and preserves the binding",
  );
  methods = ["activate", "open", "close"];
  rejected = true;
  assert.match(
    new URL(await save(), base).searchParams.get("detail")!,
    /did not accept this write key/,
  );
  rejected = false;
  hash = "DifferentVault";
  assert.match(
    new URL(await save(), base).searchParams.get("detail")!,
    /different vault/,
  );
  hash = e.vault_hash;
  assert.equal(new URL(await save(), base).searchParams.get("saved"), "1");
  const row = db
    .prepare("select * from exhibitions where id=?")
    .get(e.id) as Record<string, any>;
  assert.equal(decryptSecret(row.write_vault_key), "dummy-write-key");
  assert.equal(decryptSecret(row.read_vault_key), "dummy-read-key");
  assert.equal(new URL(await save(""), base).searchParams.get("saved"), "1");
  const retained = db
    .prepare("select * from exhibitions where id=?")
    .get(e.id) as Record<string, any>;
  assert.equal(decryptSecret(retained.write_vault_key), "dummy-write-key");
  console.log(
    "PASS a complete write key can be added later; blank fields preserve saved keys; wrong-vault and rejected keys report distinct errors",
  );
} finally {
  db.prepare(
    "update exhibitions set vault_hash=?,vault_url=?,vault_base_url=?,read_vault_key=?,write_vault_key=? where id=?",
  ).run(
    e.vault_hash,
    e.vault_url,
    e.vault_base_url,
    e.read_vault_key,
    e.write_vault_key,
    e.id,
  );
  db.close();
  server.close();
  server.closeAllConnections();
}
