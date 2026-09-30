import assert from "node:assert/strict";
import { test } from "node:test";
import {
  directoryPathFor,
  exhibitionPath,
  isExhibitionBase,
  isReservedOrganizationSlug,
  organizationPath,
} from "../src/lib/paths";

test("an exhibition lives under its organization", () => {
  const e = { organizationSlug: "lucila", slug: "semana-42" };
  assert.equal(exhibitionPath(e), "/lucila/semana-42");
  assert.equal(exhibitionPath(e, "wall", "Ab12"), "/lucila/semana-42/wall/Ab12");
  assert.equal(organizationPath("lucila"), "/lucila");
});

test("an exhibition that doesn't know its organization yet keeps its old address", () => {
  assert.equal(exhibitionPath({ organizationSlug: null, slug: "semana-42" }, "salon"), "/semana-42/salon");
});

test("FullFrame's own top-level routes can't be an organization", () => {
  for (const slug of ["admin", "api", "e", "j", "Admin", "sitemap.xml"])
    assert.ok(isReservedOrganizationSlug(slug), slug);
  for (const slug of ["lucila", "administracion", "jj"])
    assert.ok(!isReservedOrganizationSlug(slug), slug);
});

test("only an exhibition path is accepted as a redirect target", () => {
  assert.ok(isExhibitionBase("/lucila/semana-42"));
  assert.ok(isExhibitionBase("/semana-42"));
  for (const path of ["//evil.example", "/lucila/semana-42/wall", "https://evil.example", "/a/../b", ""])
    assert.ok(!isExhibitionBase(path), path);
});

test("inside an exhibition the logo leads to its organization's directory", () => {
  assert.equal(directoryPathFor({ organizationSlug: "lucila" }), "/lucila");
  assert.equal(directoryPathFor({ organizationSlug: null }), "/");
});
