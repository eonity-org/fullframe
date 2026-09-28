import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { encryptSecret } from "../src/lib/crypto";
import {
  ingestPhotograph,
  updatePhotograph,
  uploadAccess,
  withdrawPhotograph,
} from "../src/lib/uploads";
import { detailsFrom, missingFields } from "../src/lib/photoFields";
import type { Exhibition } from "../src/lib/exhibitions";
import { english } from "../src/i18n/core";

test("photograph details keep only known, non-blank fields", () => {
  const form = new FormData();
  form.set("name", "  Morning at the Pier ");
  form.set("technique", "Silver gelatin print");
  form.set("dimensions", "   ");
  form.set("secret", "not a field");
  assert.deepEqual(detailsFrom(form), {
    name: "Morning at the Pier",
    technique: "Silver gelatin print",
  });
});

test("curator uploads go through the vault's ingest/update/withdraw ops", async () => {
  const previousKey = process.env.FULLFRAME_ENCRYPTION_KEY;
  process.env.FULLFRAME_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  const calls: Array<{ method: string; type: string; body: string }> = [];
  let methods = ["activate", "open", "close", "ingest", "update", "withdraw"];
  let refuse: { status: number; error: string } | null = null;
  const server = createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    assert.equal(request.headers["x-vault-key"], "local-test-key");
    if (request.method === "GET") {
      response.end(
        JSON.stringify({ ok: true, methods, ingested: ["NewHash01"], max_upload_bytes: 5_000_000 }),
      );
      return;
    }
    let body = "";
    for await (const chunk of request) body += chunk;
    const method = request.url!.split("?")[0].split("/").pop()!;
    calls.push({ method, type: request.headers["content-type"] || "", body });
    if (refuse) {
      response.statusCode = refuse.status;
      response.end(JSON.stringify({ ok: false, error: refuse.error }));
      return;
    }
    response.end(
      JSON.stringify({ ok: true, result: method === "ingest" ? { hash: "NewHash01" } : {} }),
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
  const image = new File([new Uint8Array([1, 2, 3])], "IMG_0001.jpg", {
    type: "image/jpeg",
  });

  try {
    // Access: only during setup, with a key that carries all three ops; the
    // photographs added here come from TYDAL, not a local record.
    assert.deepEqual(await uploadAccess(exhibition), {
      access: "ready",
      ingested: ["NewHash01"],
      maxUploadBytes: 5_000_000,
    });
    assert.equal((await uploadAccess({ ...exhibition, phase: "judging" })).access, "not-setup");
    assert.equal((await uploadAccess({ ...exhibition, writeVaultKey: null })).access, "no-key");
    methods = ["activate", "open", "close", "ingest"];
    assert.deepEqual(await uploadAccess(exhibition), {
      access: "no-permission",
      ingested: [],
      maxUploadBytes: null,
    });

    // ingest is multipart; every detail travels in the metadata document.
    const added = await ingestPhotograph(exhibition, image, {
      name: "Morning at the Pier",
      technique: "Silver gelatin print",
    });
    assert.deepEqual(added, { ok: true, hash: "NewHash01" });
    assert.equal(calls[0].method, "ingest");
    assert.match(calls[0].type, /^multipart\/form-data/);
    assert.match(
      calls[0].body,
      /name="metadata"\r\n\r\n\{"name":"Morning at the Pier","technique":"Silver gelatin print"\}/,
    );

    // update sends every field; blanks as null so TYDAL removes them.
    assert.deepEqual(
      await updatePhotograph(exhibition, "NewHash01", { name: "Evening", author: "Ana Ruiz" }),
      { ok: true },
    );
    assert.deepEqual(JSON.parse(calls[1].body), {
      resource: "NewHash01",
      metadata: {
        name: "Evening",
        author: "Ana Ruiz",
        technique: null,
        dimensions: null,
        description: null,
      },
    });

    assert.deepEqual(await withdrawPhotograph(exhibition, "NewHash01"), { ok: true });
    assert.deepEqual(JSON.parse(calls[2].body), { resource: "NewHash01" });

    // TYDAL's refusals come back as messages the studio can translate.
    refuse = { status: 403, error: "Forbidden" };
    const forbidden = await ingestPhotograph(exhibition, image, { name: "x" });
    assert.match(english(!forbidden.ok ? forbidden.error : { key: "" }), /w:ingest/);

    // A web server in front of TYDAL cut the upload off.
    refuse = { status: 413, error: "Request Entity Too Large" };
    const cutOff = await ingestPhotograph(exhibition, image, { name: "x" });
    assert.equal(!cutOff.ok && english(cutOff.error), "The file is larger than TYDAL accepts.");

    refuse = { status: 400, error: "File type image/tiff is not accepted." };
    const rejected = await ingestPhotograph(exhibition, image, { name: "x" });
    assert.equal(
      !rejected.ok && english(rejected.error),
      "TYDAL refused it: File type image/tiff is not accepted.",
    );
  } finally {
    server.close();
    process.env.FULLFRAME_ENCRYPTION_KEY = previousKey;
  }
});

test("a photograph is ready once it has a title and an author", () => {
  const complete = {
    name: "Morning at the Pier",
    author: "Ana Ruiz",
    technique: "Silver gelatin print",
    dimensions: "50 × 70 cm",
    description: "Printed for the 1990 salon.",
  };
  assert.deepEqual(missingFields(complete), []);
  // Technique, dimensions and description are optional — blank or absent.
  assert.deepEqual(missingFields({ ...complete, dimensions: "  " }), []);
  assert.deepEqual(missingFields({ name: "Morning at the Pier", author: "Ana Ruiz" }), []);
  // Title and author are not.
  assert.deepEqual(missingFields({ name: "Only a title" }), ["author"]);
  assert.deepEqual(missingFields({ ...complete, name: " ", author: "" }), ["name", "author"]);
});
