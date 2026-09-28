import assert from "node:assert/strict";
import { test } from "node:test";
import { parseVaultUrl, serverVaultBase } from "../src/lib/vaultConnection";
import { resolveAppearance, appearanceTokens } from "../src/lib/appearance";

test("discovers both shared address forms without treating resource URLs as vaults", () => {
  assert.deepEqual(parseVaultUrl("https://example.test/h/AbC012/meta").vault, {
    hash: "AbC012",
  });
  assert.deepEqual(parseVaultUrl("https://example.test/v/acme/summer/").vault, {
    org: "acme",
    slug: "summer",
  });
  assert.equal(
    parseVaultUrl("https://example.test/tydal/h/AbC012").baseUrl,
    "https://example.test/tydal",
  );
  for (const url of [
    "https://example.test/h/AbC012/aPhoto",
    "https://example.test/admin",
    "file:///h/AbC012",
    "https://user:secret@example.test/h/AbC012",
    "https://example.test/h/AbC012?sig=secret&exp=12",
  ])
    assert.throws(() => parseVaultUrl(url));
});

test("maps only the configured local TYDAL origin to its Docker address", () => {
  assert.equal(
    serverVaultBase(
      "http://localhost:8080",
      "http://host.docker.internal:8080",
    ),
    "http://host.docker.internal:8080",
  );
  assert.equal(
    serverVaultBase(
      "https://photos.example",
      "http://tydal:80",
      "https://photos.example",
    ),
    "http://tydal:80",
  );
  assert.equal(
    serverVaultBase(
      "https://another.example",
      "http://tydal:80",
      "https://photos.example",
    ),
    "https://another.example",
  );
  assert.equal(
    serverVaultBase(
      "http://localhost:9000",
      "http://host.docker.internal:8080",
    ),
    "http://localhost:9000",
  );
});

test("untrusted preview parameters cannot inject CSS or unknown themes", () => {
  assert.deepEqual(
    resolveAppearance({
      theme: "invalid" as never,
      palette: "__proto__" as never,
    }),
    {
      theme: "gallery",
      typography: "sans",
      palette: "william",
      layout: "salon",
      enabledViews: ["album", "salon", "wall"],
      defaultView: "salon",
    },
  );
  assert.equal(
    appearanceTokens(
      resolveAppearance({ theme: "dark", palette: "plum", layout: "salon" }),
    )["--accent"],
    "#5E3A62",
  );
});
