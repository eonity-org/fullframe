import assert from "node:assert/strict";
import { test } from "node:test";
import { computeScores } from "../src/lib/scoring";

test("jury averages retain coverage and deterministic ties while excluding revoked jurors", () => {
  const ranked = computeScores({
    criteria: [{id: 1, name: "Overall impression", scale_max: 5, weight: 1}],
    jurors: [{id: 1, name: "A", revoked: false}, {id: 2, name: "B", revoked: false}, {id: 3, name: "C", revoked: true}],
    votes: [
      {juror_id: 1, criterion_id: 1, resource_hash: "PhotoA", score: 5},
      {juror_id: 2, criterion_id: 1, resource_hash: "PhotoA", score: 3},
      {juror_id: 1, criterion_id: 1, resource_hash: "PhotoB", score: 4},
      {juror_id: 3, criterion_id: 1, resource_hash: "PhotoA", score: 1},
      {juror_id: 3, criterion_id: 1, resource_hash: "RevokedOnly", score: 5},
    ],
  });
  assert.deepEqual(ranked.map(w => [w.hash, w.score * 5, w.coverage]), [["PhotoA", 4, 1], ["PhotoB", 4, 0.5]]);
  assert.deepEqual(ranked[0].byCriterion, {1: 4});
  assert.deepEqual(ranked[0].byJuror, {1: 1, 2: 0.6});
});
