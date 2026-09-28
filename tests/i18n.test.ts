import assert from "node:assert/strict";
import { test } from "node:test";
import { check, TRANSLATED_LOCALES } from "../scripts/i18n";
import { msgv, negotiateLocale, translator } from "../src/i18n/core";

test("every translation key in the code is translated, and nothing else", () => {
  for (const locale of TRANSLATED_LOCALES) {
    const report = check(locale);
    assert.deepEqual(
      report,
      { missing: [], unused: [], empty: [], mismatched: [] },
      `${locale}: run \`npm run i18n\` to see what to fix`,
    );
  }
});

test("English is the key, Spanish comes from the dictionary, unknown text falls back", () => {
  const en = translator("en");
  const es = translator("es");
  assert.equal(en("Saved"), "Saved");
  assert.equal(es("Saved"), "Guardado");
  assert.equal(es("Not a translated sentence"), "Not a translated sentence");
  assert.equal(
    es("Score must be 1–{max}.", { max: 5 }),
    "La puntuación debe estar entre 1 y 5.",
  );
  assert.equal(
    es(msgv("TYDAL answered {status}: {message}", { status: 404, message: "x" })),
    "TYDAL respondió 404: x",
  );
});

test("plurals pick the singular only for exactly one", () => {
  const es = translator("es");
  const n = (count: number) =>
    es.n(count, "{count} photograph", "{count} photographs");
  assert.equal(n(1), "1 fotografía");
  assert.equal(n(0), "0 fotografías");
  assert.equal(n(7), "7 fotografías");
});

test("the browser language picks a supported locale, else English", () => {
  assert.equal(negotiateLocale("es-ES,es;q=0.9,en;q=0.8"), "es");
  assert.equal(negotiateLocale("fr-FR,fr;q=0.9,es;q=0.5"), "es");
  assert.equal(negotiateLocale("fr-FR,de;q=0.9"), "en");
  assert.equal(negotiateLocale(null), "en");
});
