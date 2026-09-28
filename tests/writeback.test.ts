import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { encryptSecret } from "../src/lib/crypto";
import { executeOpening, reverseOpening } from "../src/lib/writeback";
import type { Exhibition } from "../src/lib/exhibitions";
import { english } from "../src/i18n/core";

test("publication validates machine identity and reports partial writes truthfully", async () => {
  const previousKey = process.env.FULLFRAME_ENCRYPTION_KEY;
  process.env.FULLFRAME_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  const calls: Array<{ method: string; body: unknown }> = [];
  let failure = "";
  const server = createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.method === "GET") {
      response.end(
        JSON.stringify({
          resources: [
            { id: "PhotoHash01", slug: "a-human-title", name: "A photograph" },
          ],
          pagination: { has_more: false },
        }),
      );
      return;
    }
    let body = "";
    for await (const chunk of request) body += chunk;
    const method = request.url!.split("/").pop()!;
    calls.push({ method, body: body ? JSON.parse(body) : null });
    assert.equal(request.headers["x-vault-key"], "local-test-key");
    response.statusCode = failure === method ? 422 : 200;
    response.end(
      JSON.stringify(
        failure === method ? { message: "Test rejection" } : { ok: true },
      ),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as { port: number };
  const exhibition = {
    vaultHash: "VaultHash01",
    vaultBaseUrl: `http://127.0.0.1:${address.port}`,
    phase: "setup",
    readVaultKey: null,
    writeVaultKey: encryptSecret("local-test-key"),
  } as Exhibition;
  try {
    assert.equal(
      (await executeOpening(exhibition, ["a-human-title"])).ok,
      false,
    );
    assert.equal((await executeOpening(exhibition, ["ForeignHash"])).ok, false);
    assert.equal((await executeOpening(exhibition, [])).ok, false);
    assert.equal(
      (
        await executeOpening({ ...exhibition, writeVaultKey: null }, [
          "PhotoHash01",
        ])
      ).ok,
      false,
    );
    assert.equal(calls.length, 0);
    failure = "activate";
    assert.equal((await executeOpening(exhibition, ["PhotoHash01"])).ok, false);
    assert.deepEqual(
      calls.map((c) => c.method),
      ["activate"],
    );
    calls.length = 0;
    failure = "open";
    const partial = await executeOpening(exhibition, ["PhotoHash01"]);
    assert.equal(partial.ok, false);
    assert.match(partial.errors[0], /selection was saved in TYDAL/);
    assert.deepEqual(
      calls.map((c) => c.method),
      ["activate", "open"],
    );
    calls.length = 0;
    failure = "";
    assert.deepEqual(
      await executeOpening(exhibition, ["PhotoHash01", "PhotoHash01"]),
      { ok: true, errors: [], activated: 1 },
    );
    assert.deepEqual(calls, [
      { method: "activate", body: { resources: ["PhotoHash01"] } },
      { method: "open", body: {} },
    ]);
    assert.equal((await reverseOpening(exhibition)).ok, true);
    assert.equal(calls.at(-1)?.method, "close");
    failure = "close";
    const refused = await reverseOpening(exhibition);
    assert.equal(refused.ok, false);
    assert.match(
      english(refused.detail!),
      /^TYDAL answered 422: Test rejection/,
    );
    const unreachable = await reverseOpening({
      ...exhibition,
      vaultBaseUrl: "http://127.0.0.1:1",
    });
    assert.equal(unreachable.ok, false);
    assert.match(english(unreachable.detail!), /^TYDAL could not be reached/);
  } finally {
    server.close();
    server.closeAllConnections();
    if (previousKey === undefined) delete process.env.FULLFRAME_ENCRYPTION_KEY;
    else process.env.FULLFRAME_ENCRYPTION_KEY = previousKey;
  }
});
