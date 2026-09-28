import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveAppearance, previewAppearance, DEFAULT_APPEARANCE } from "../src/lib/appearance";

test("view settings always resolve to an available default and at least one known view", () => {
  const album = resolveAppearance({
    enabledViews: ["album"],
    defaultView: "wall",
  });
  assert.equal(album.defaultView, "album");
  assert.deepEqual(album.enabledViews, ["album"]);
  const empty = resolveAppearance({ enabledViews: [] });
  assert.deepEqual(empty.enabledViews, ["salon"]);
  assert.equal(empty.defaultView, "salon");
  const unknown = resolveAppearance({
    enabledViews: ["__proto__", "constructor", "wall", "wall"] as never,
    defaultView: "__proto__" as never,
  });
  assert.deepEqual(unknown.enabledViews, ["wall"]);
  assert.equal(unknown.defaultView, "wall");
});

test("curator preview retains saved view settings unless explicitly overridden", () => {
  const saved = resolveAppearance({
    enabledViews: ["album"],
    defaultView: "album",
  });
  const styled = previewAppearance(
    saved,
    new URLSearchParams({ ffTheme: "dark" }),
  );
  assert.deepEqual(styled.enabledViews, ["album"]);
  assert.equal(styled.defaultView, "album");
  const changed = previewAppearance(
    saved,
    new URLSearchParams({ ffViews: "wall,album,invalid", ffDefault: "wall" }),
  );
  assert.deepEqual(changed.enabledViews, ["album", "wall"]);
  assert.equal(changed.defaultView, "wall");
  const empty = previewAppearance(
    saved,
    new URLSearchParams({ ffViews: "", ffDefault: "unknown" }),
  );
  assert.deepEqual(empty.enabledViews, ["salon"]);
  assert.equal(empty.defaultView, "salon");
});


test("missing or invalid appearance uses current defaults without changing explicit choices", () => {
  for (const value of [null, undefined, {}, {layout: "mosaic", defaultView: "missing"}, {layout: "__proto__"}]) {
    assert.deepEqual(resolveAppearance(value as never), DEFAULT_APPEARANCE);
  }
  assert.equal(resolveAppearance({layout: "grid"}).layout, "grid");
  assert.equal(resolveAppearance({defaultView: "album"}).defaultView, "album");
  assert.equal(resolveAppearance({enabledViews: ["wall"]}).defaultView, "wall");
});

test("typography is its own choice; saved exhibitions keep their look", () => {
  assert.equal(resolveAppearance({theme: "editorial"}).typography, "serif");
  assert.equal(resolveAppearance({theme: "dark"}).typography, "sans");
  assert.equal(resolveAppearance({theme: "dark", typography: "serif"}).typography, "serif");
  assert.equal(resolveAppearance({theme: "editorial", typography: "sans"}).typography, "sans");
  assert.equal(resolveAppearance({typography: "__proto__" as never}).typography, "sans");
  const saved = resolveAppearance({theme: "gallery"});
  assert.equal(previewAppearance(saved, new URLSearchParams({ffType: "serif"})).typography, "serif");
});
