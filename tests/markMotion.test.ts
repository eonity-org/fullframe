import assert from "node:assert/strict";
import { test } from "node:test";
import { motionFor, trailKey } from "../src/lib/markMotion";

test("a path's place in the header trail", () => {
  assert.equal(trailKey("/"), "");
  assert.equal(trailKey("/lucila"), "lucila");
  assert.equal(trailKey("/lucila/semana-42/wall/Ab12"), "lucila/semana-42");
  assert.equal(trailKey("/admin/3/publish"), null);
});

test("many views coming home from an organization or an exhibition", () => {
  assert.equal(motionFor("/lucila", "/"), "many");
  assert.equal(motionFor("/lucila/semana-42/salon", "/"), "many");
  assert.equal(motionFor(null, "/"), null);
  assert.equal(motionFor("/admin", "/"), null);
});

test("the other view entering an organization or an exhibition", () => {
  assert.equal(motionFor("/", "/lucila"), "arrive");
  assert.equal(motionFor(null, "/lucila/semana-42"), "arrive");
  assert.equal(motionFor("/lucila", "/lucila/semana-42"), "arrive");
  // Moving between an exhibition's own views is not entering it.
  assert.equal(motionFor("/lucila/semana-42", "/lucila/semana-42/wall"), null);
});
