import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import {
  accessFor,
  decodeSession,
  encodeSession,
  managedOrganizations,
  type StudioSession,
} from "../src/lib/admin";
import { identify } from "../src/lib/tydalIdentity";

const curator: StudioSession = {
  kind: "curator",
  id: "u1",
  name: "Ana",
  email: "ana@example.org",
  organizations: [
    { id: "org-edit", slug: "lucila", name: "Lucila", role: "editor" },
    { id: "org-look", slug: "otra", name: "Otra", role: "viewer" },
  ],
};

test("a studio session survives the cookie only intact and unexpired", () => {
  const exp = Date.now() + 60_000;
  const value = encodeSession(curator, exp, "secret");
  assert.deepEqual(decodeSession(value, "secret"), curator);

  assert.equal(decodeSession(value, "other secret"), null, "signed with another key");
  const [data, , mac] = value.split(".");
  assert.equal(decodeSession(`${data}.${exp + 1}.${mac}`, "secret"), null, "tampered expiry");
  assert.equal(decodeSession(value, "secret", exp + 1), null, "expired");
  const forged = Buffer.from(JSON.stringify({ kind: "admin" })).toString("base64url");
  assert.equal(decodeSession(`${forged}.${exp}.${mac}`, "secret"), null, "swapped payload");
});

test("access follows the TYDAL organization role", () => {
  assert.equal(accessFor(curator, "org-edit"), "manage");
  assert.equal(accessFor(curator, "org-look"), "view");
  assert.equal(accessFor(curator, "someone-else"), null);
  assert.equal(accessFor(curator, null), null, "an exhibition without organization is admin-only");
  assert.equal(accessFor({ kind: "admin" }, null), "manage");
  assert.equal(accessFor(null, "org-edit"), null);
  assert.deepEqual(managedOrganizations(curator).map((o) => o.id), ["org-edit"]);
});

test("TYDAL identify: who someone is, and nothing to keep", async () => {
  const previous = process.env.TYDAL_BASE_URL;
  let status = 200;
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    assert.equal(request.url, "/api/v1/auth/identify");
    assert.deepEqual(JSON.parse(body), { email: "ana@example.org", password: "pw" });
    response.statusCode = status;
    response.setHeader("Content-Type", "application/json");
    response.end(
      JSON.stringify({
        success: status === 200,
        data: {
          user: { id: "u1", name: "Ana", email: "ana@example.org", is_superadmin: false },
          organizations: [{ id: "org-edit", slug: "lucila", name: "Lucila", role: "editor" }],
        },
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  process.env.TYDAL_BASE_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const ok = await identify("ana@example.org", "pw");
    assert.ok(ok.ok);
    assert.deepEqual(ok.identity.organizations, [
      { id: "org-edit", slug: "lucila", name: "Lucila", role: "editor" },
    ]);
    for (const [code, reason] of [[401, "invalid"], [403, "disabled"], [429, "throttled"], [500, "unavailable"]] as const) {
      status = code;
      assert.deepEqual(await identify("ana@example.org", "pw"), { ok: false, reason });
    }
  } finally {
    server.close();
    process.env.TYDAL_BASE_URL = previous;
  }
});
