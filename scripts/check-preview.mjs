import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import Database from "better-sqlite3";
import fs from "node:fs";
const base = "http://localhost:3020";
const file = process.env.DATABASE_PATH;
if (!file?.endsWith("/preview.sqlite"))
  throw new Error("Run only inside the isolated preview service.");
const db = new Database(file);
const e = db.prepare("select * from exhibitions order by id limit 1").get();
assert(e, "The preview needs an exhibition to check.");
// Its public path — /{organization}/{exhibition} (src/lib/paths.ts).
const at = e.organization_slug ? `/${e.organization_slug}/${e.slug}` : `/${e.slug}`;
let checks = 0;
function passed(message) {
  console.log("PASS", message);
  checks++;
}
async function page(path, cookie = "") {
  const response = await fetch(base + path, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  return { response, html: await response.text() };
}
function assertRedirect(result, destination) {
  // App Router may have started streaming the parent layout before redirecting.
  if (result.response.status === 307)
    assert.equal(result.response.headers.get("location"), destination);
  else {
    assert.equal(result.response.status, 200);
    assert(
      result.html.includes(
        `http-equiv="refresh" content="1;url=${destination}"`,
      ),
    );
  }
  assert(!result.html.includes('aria-label="Next photograph"'));
}
const login = await page("/admin/login");
const action = login.html.match(/name="(\$ACTION_ID_[^"]+)"/)[1];
const form = new FormData();
form.set(action, "");
form.set("password", process.env.ADMIN_PASSWORD);
const signedIn = await fetch(base + "/admin/login", {
  method: "POST",
  body: form,
  redirect: "manual",
});
assert.equal(signedIn.status, 303);
const adminCookie = signedIn.headers
  .getSetCookie()
  .find((c) => c.startsWith("ff_studio="))
  .split(";")[0];
passed("curator sign-in");
for (const path of [
  "/admin",
  `/admin/${e.id}`,
  `/admin/${e.id}/theme`,
  `/admin/${e.id}/results`,
]) {
  const { response, html } = await page(path, adminCookie);
  assert.equal(response.status, 200, path);
  assert(!html.includes("Application error"), path);
  assert(
    !html.includes(e.read_vault_key ?? "never-match-secret") ||
      !e.read_vault_key,
    "encrypted credential leaked",
  );
  passed(path);
}
const index = await fetch(`${base}/api/vault/h/${e.vault_hash}/resources`, {
  headers: { cookie: adminCookie },
});
assert.equal(index.status, 200);
const { resources } = await index.json();
assert(resources.length > 0);
for (const card of resources) {
  assert(card.preview?.startsWith("/api/vault/h/"));
  const preview =
    card.preview_renditions?.find((r) => r.name === "medium")?.url ||
    card.preview;
  const response = await fetch(base + preview, {
    headers: { cookie: adminCookie },
  });
  assert.equal(response.status, 200);
  assert(response.headers.get("content-type")?.startsWith("image/"));
}
passed(`${resources.length} vault previews load`);
const themePage = await page(
  `${at}/salon?ffTheme=editorial&ffPalette=plum&ffLayout=salon`,
  adminCookie,
);
assert(themePage.html.includes('data-theme="editorial"'));
assert(themePage.html.includes('data-layout="salon"'));
assert(themePage.html.includes("photo-flow-salon"));
assert(themePage.html.includes("#5E3A62"));
passed("admin-only theme preview uses the requested theme and palette");
const publicBaseline = await page(`${at}/salon`);
const surface = html => html.match(/<div class="exhibition-surface"[^>]*>/)?.[0];
assert(surface(publicBaseline.html));
const alternateTheme = surface(publicBaseline.html).includes('data-theme="editorial"') ? "dark" : "editorial";
const alternateLayout = surface(publicBaseline.html).includes('data-layout="salon"') ? "grid" : "salon";
const publicTheme = await page(
  `${at}/salon?ffTheme=${alternateTheme}&ffPalette=plum&ffLayout=${alternateLayout}`,
);
assert.equal(surface(publicTheme.html), surface(publicBaseline.html));
passed("anonymous visitors cannot override the published style");
for (const reference of ["MissingPhotoHash", resources[0].slug, `${resources[0].id}/extra`].filter(Boolean)) {
  const unavailable = await page(`${at}/wall/${reference}?ffViews=wall&ffDefault=wall`, adminCookie);
  assert(unavailable.html.includes("Photograph unavailable"));
  assert(!unavailable.html.includes('aria-label="Next photograph"'));
  assert(unavailable.html.includes("Return to the exhibition"));
}
const validPhoto = await page(`${at}/wall/${resources[0].id}?ffViews=wall&ffDefault=wall`, adminCookie);
assert(!validPhoto.html.includes("Photograph unavailable"));
assert(validPhoto.html.includes('aria-label="Next photograph"'));
for (const route of ["browse", "indexes", `work/${resources[0].id}`])
  assert.equal((await page(`${at}/${route}`, adminCookie)).response.status, 404);
passed("Wall rejects unavailable hashes, human slugs and extra path segments; removed V1 routes return 404");
// Exercise the same server actions used by the connection and appearance UI.
const manifest = JSON.parse(
  fs.readFileSync(".next/server/server-reference-manifest.json", "utf8"),
);
async function invoke(name, args) {
  const id = Object.entries(manifest.node).find(
    ([, v]) => v.exportedName === name,
  )?.[0];
  assert(id, name);
  const response = await fetch(base + "/admin", {
    method: "POST",
    redirect: "manual",
    headers: {
      cookie: adminCookie,
      "next-action": id,
      "content-type": "text/plain;charset=UTF-8",
    },
    body: JSON.stringify(args),
  });
  return { response, body: await response.text() };
}
const sharedUrl =
  (process.env.TYDAL_LINK_BASE_URL || process.env.TYDAL_BASE_URL).replace(
    /\/$/,
    "",
  ) +
  "/h/" +
  e.vault_hash;
const connected = await invoke("previewConnection", [sharedUrl, "", ""]);
assert.equal(connected.response.status, 200);
assert(connected.body.includes('"ok":true'), connected.body);
passed("shared vault URL resolves live, without organization or slug fields");
try {
  const styled = await invoke("saveAppearance", [
    e.id,
    {
      theme: "dark",
      palette: "copper",
      layout: "salon",
      enabledViews: ["album", "salon"],
      defaultView: "album",
    },
  ]);
  assert.equal(styled.response.status, 200);
  assert.deepEqual(
    JSON.parse(
      db.prepare("select appearance from exhibitions where id=?").get(e.id)
        .appearance,
    ),
    {
      theme: "dark",
      palette: "copper",
      layout: "salon",
      enabledViews: ["album", "salon"],
      defaultView: "album",
    },
  );
  const live = await page(`${at}/salon`);
  assert(live.html.includes('data-theme="dark"'));
  assert(live.html.includes('data-layout="salon"'));
  assert(live.html.includes("photo-flow-salon"));
  assert(live.html.includes("#7A4A3C"));
  passed(
    "applying a style persists the palette/theme and updates public pages",
  );
  const album = await page(`${at}/album`);
  assert.equal(album.response.status, 200);
  assert(album.html.includes("photo-flow-mosaic"));
  assert(
    [...album.html.matchAll(/<a\b[^>]*>/g)].some(
      ([tag]) =>
        tag.includes(`href="${at}/album"`) &&
        tag.includes('aria-current="page"'),
    ),
  );
  assert(!album.html.includes(`href="${at}/wall"`));
  const about = await page(`${at}`);
  assert(
    [...about.html.matchAll(/<a\b[^>]*>/g)].some(
      ([tag]) =>
        tag.includes(`href="${at}/album"`) &&
        tag.includes('class="button primary"'),
    ),
  );
  const hiddenWall = await page(`${at}/wall`);
  assertRedirect(hiddenWall, `${at}/album`);
  const spoofed = await page(`${at}/wall?ffViews=wall&ffDefault=wall`);
  assertRedirect(spoofed, `${at}/album`);
  const previewWall = await page(
    `${at}/wall?ffViews=wall&ffDefault=wall`,
    adminCookie,
  );
  assert.equal(previewWall.response.status, 200);
  assert(previewWall.html.includes('aria-label="Next photograph"'));
  const sitemap = await page("/sitemap.xml");
  assert(sitemap.html.includes(`${at}/album`));
  assert(!sitemap.html.includes(`${at}/wall`));
  passed(
    "Mosaic navigation, default entry, disabled routes, curator preview and sitemap agree",
  );
  db.prepare("update exhibitions set phase='selection' where id=?").run(e.id);
  const selected = await invoke("saveCuratedSelection", [
    e.id,
    [resources[0].id, resources[1].id],
  ]);
  assert.equal(selected.response.status, 200);
  assert.deepEqual(
    JSON.parse(
      db.prepare("select selected_hashes from exhibitions where id=?").get(e.id)
        .selected_hashes,
    ),
    [resources[0].id, resources[1].id],
  );
  const wrong = await invoke("saveCuratedSelection", [e.id, ["NotAValidHash"]]);
  assert.equal(wrong.response.status, 500);
  assert.deepEqual(
    JSON.parse(
      db.prepare("select selected_hashes from exhibitions where id=?").get(e.id)
        .selected_hashes,
    ),
    [resources[0].id, resources[1].id],
  );
  passed(
    "curators select by vault hash without jury scores; invalid selections leave the saved set intact",
  );
} finally {
  db.prepare(
    "update exhibitions set phase=?,appearance=?,selected_hashes=? where id=?",
  ).run(e.phase, e.appearance, e.selected_hashes, e.id);
}
let jurorId;
const token = randomBytes(24).toString("base64url");
const time = Math.floor(Date.now() / 1000);
try {
  db.prepare("update exhibitions set phase='judging' where id=?").run(e.id);
  const id = db
    .prepare(
      "insert into jurors (exhibition_id,name,token_hash,created_at,updated_at) values (?,?,?,?,?)",
    )
    .run(
      e.id,
      "Preview regression juror",
      createHash("sha256").update(token).digest("hex"),
      time,
      time,
    ).lastInsertRowid;
  jurorId = Number(id);
  const anon = await fetch(`${base}/api/vault/h/${e.vault_hash}/resources`);
  assert.equal(anon.status, 404);
  passed("private exhibition blocks anonymous vault reads");
  const privateAlbum = await page(`${at}/album`);
  assert(!privateAlbum.html.includes("photo-flow-mosaic"));
  assert(!privateAlbum.html.includes(resources[0].id));
  passed("private Mosaic does not expose photographs");
  const door = await fetch(`${base}/j/${token}`, { redirect: "manual" });
  assert.equal(door.status, 303);
  assert.equal(door.headers.get("location"), `${at}/jury`);
  const juryCookie = door.headers
    .getSetCookie()
    .find((c) => c.startsWith("ff_jury="))
    .split(";")[0];
  const jury = await page(`${at}/jury`, juryCookie);
  assert.equal(jury.response.status, 200);
  assert(jury.html.includes("What do you see?"));
  passed("personal jury link lands on the simplified scoring screen");
  const criterion = db
    .prepare("select id,scale_max from criteria where exhibition_id=? limit 1")
    .get(e.id);
  assert(criterion);
  async function post(path, body) {
    return fetch(base + "/api/jury/" + path, {
      method: "POST",
      headers: { cookie: juryCookie, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  for (const score of [2, Math.min(5, criterion.scale_max)]) {
    const response = await post("votes", {
      resourceHash: resources[0].id,
      criterionId: criterion.id,
      score,
    });
    assert.equal(response.status, 200, await response.text());
  }
  const saved = db.prepare("select * from votes where juror_id=?").all(jurorId);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].resource_hash, resources[0].id);
  assert.equal(
    (
      await post("votes", {
        resourceHash: "NotAValidHash",
        criterionId: criterion.id,
        score: 2,
      })
    ).status,
    409,
  );
  assert(
    [400, 409].includes(
      (
        await post("votes", {
          resourceHash: resources[0].slug,
          criterionId: criterion.id,
          score: 2,
        })
      ).status,
    ),
  );
  passed(
    "votes use verified vault hashes, reject slugs/unknown references and update without duplicates",
  );
  assert.equal(
    (
      await post("comments", {
        resourceHash: resources[0].id,
        body: "Temporary regression note",
      })
    ).status,
    200,
  );
  assert.equal(
    (await post("comments", { resourceHash: resources[0].id, body: "" }))
      .status,
    200,
  );
  assert.equal(
    db.prepare("select count(*) n from comments where juror_id=?").get(jurorId)
      .n,
    0,
  );
  passed("private notes save and clear");
  db.prepare("update exhibitions set phase='selection' where id=?").run(e.id);
  assert.equal(
    (
      await post("votes", {
        resourceHash: resources[0].id,
        criterionId: criterion.id,
        score: 2,
      })
    ).status,
    409,
  );
  const review = await page(`${at}/jury`, juryCookie);
  assert.equal(review.response.status, 200);
  assert(review.html.includes("Judging has closed. Thank you."));
  passed("closing judging freezes votes and preserves read-only review");
} finally {
  if (jurorId) {
    db.prepare("delete from votes where juror_id=?").run(jurorId);
    db.prepare("delete from comments where juror_id=?").run(jurorId);
    db.prepare("delete from jurors where id=?").run(jurorId);
  }
  db.prepare("update exhibitions set phase=? where id=?").run(e.phase, e.id);
  db.close();
}
console.log(
  `${checks} checks passed. Temporary jury records removed; original preview phase restored.`,
);
