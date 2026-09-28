import assert from "node:assert/strict";
import { test } from "node:test";
import { photoRows } from "../src/lib/photoRows";

test("mixed proportions fit complete rows without cropping, including mobile", () => {
  const ratios = [1.5, 0.67, 1, 2, 0.5, 1.3, 1.5, 0.7, 1];
  for (const width of [320, 640, 1440]) {
    const sizes = photoRows(ratios, width, 280, 4);
    assert.equal(sizes.length, ratios.length);
    let rowWidth = 0;
    let height = sizes[0].height;
    sizes.forEach((size, i) => {
      assert.ok(Math.abs(size.width / size.height - ratios[i]) < 0.000001);
      assert.ok(size.width > 0 && size.width <= width);
      if (
        Math.abs(size.height - height) > 0.000001 ||
        (rowWidth > 0 && rowWidth + 4 + size.width > width + 0.000001)
      ) {
        assert.ok(Math.abs(rowWidth - width) < 0.000001);
        rowWidth = 0;
        height = size.height;
      }
      rowWidth += (rowWidth ? 4 : 0) + size.width;
      assert.ok(rowWidth <= width + 0.000001);
    });
  }
});

test("sparse rows stay modest, invalid dimensions are safe, empty collections work", () => {
  assert.deepEqual(photoRows([0.5], 1400, 280, 4), [
    { width: 140, height: 280 },
  ]);
  assert.deepEqual(photoRows([], 1200, 280, 4), []);
  assert.deepEqual(photoRows([1], 0, 280, 4), []);
  for (const size of photoRows([NaN, 0, Infinity, -1], 320, 170, 4))
    assert.ok(Number.isFinite(size.width) && size.width > 0);
});
