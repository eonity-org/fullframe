import assert from "node:assert/strict";
import { test } from "node:test";
import {
  exhibitionPath,
  isExhibitionBase,
  isReservedOrganizationSlug,
  organizationLink,
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

test("an exhibition names its organization in the header trail", () => {
  assert.deepEqual(
    organizationLink({ organizationSlug: "lucila", organizationName: "Lucila" }),
    { href: "/lucila", label: "Lucila" },
  );
  // Name not stored yet: the slug names it.
  assert.deepEqual(organizationLink({ organizationSlug: "lucila" }), {
    href: "/lucila",
    label: "lucila",
  });
  // Organization unknown: no level.
  assert.deepEqual(organizationLink({ organizationSlug: null }), {
    href: "/",
    label: null,
  });
});
