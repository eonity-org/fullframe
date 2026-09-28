import assert from "node:assert/strict";
import { test } from "node:test";
import { galleryImages } from "../src/lib/galleryImages";

const preview = "http://tydal.test/h/VaultHash/PhotoHash/preview";
const card = {
  preview,
  url: "http://tydal.test/h/VaultHash/PhotoHash",
  preview_renditions: ["original", "thumbnail", "small", "medium", "large"].map(
    (name) => ({
      name,
      url: name === "original" ? preview : `${preview}?rendition=${name}`,
    }),
  ),
};
test("Gallery previews use 800px and full view uses 1600px through the vault proxy", () => {
  assert.deepEqual(galleryImages(card, "VaultHash"), {
    preview: "/api/vault/h/VaultHash/PhotoHash/preview?rendition=medium",
    url: "/api/vault/h/VaultHash/PhotoHash/preview?rendition=large",
  });
});
test("missing conversions fall back to available sizes and the designated original", () => {
  const selected = galleryImages(
    {
      ...card,
      preview_renditions: card.preview_renditions.filter(
        (r) => r.name === "small",
      ),
    },
    "VaultHash",
  );
  assert(selected.preview?.endsWith("?rendition=small"));
  assert.equal(selected.url, "/api/vault/h/VaultHash/PhotoHash/preview");
  assert.deepEqual(galleryImages({ preview }, "VaultHash"), {
    preview: "/api/vault/h/VaultHash/PhotoHash/preview",
    url: "/api/vault/h/VaultHash/PhotoHash/preview",
  });
});
test("rendition metadata cannot send image requests to storage or another vault", () => {
  const selected = galleryImages(
    {
      ...card,
      preview_renditions: [
        null,
        { name: "medium", url: "http://tydal.test/storage/image.webp" },
        {
          name: "large",
          url: "http://tydal.test/h/OtherVault/PhotoHash/preview",
        },
      ],
    },
    "VaultHash",
  );
  assert.deepEqual(selected, {
    preview: "/api/vault/h/VaultHash/PhotoHash/preview",
    url: "/api/vault/h/VaultHash/PhotoHash/preview",
  });
});
