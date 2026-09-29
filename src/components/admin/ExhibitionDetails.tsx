import { saveExhibitionDetails } from "@/lib/actions";
import type { Exhibition } from "@/lib/exhibitions";
import type { GalleryWork } from "@/lib/gallery";
import { viewerT } from "@/i18n/server";
import { LOCALES, LOCALE_NAMES } from "@/i18n/core";

/**
 * The exhibition's public details — title, language, texts, cover. Lives on
 * Selection & publish, beside the choice of photographs, so everything the
 * public will see is settled in one place before publishing.
 */
export async function ExhibitionDetails({
  exhibition: e,
  works,
}: {
  exhibition: Exhibition;
  works: GalleryWork[];
}) {
  const t = await viewerT();
  const id = e.id;
  return (
    <section className="panel exhibition-details">
      <div className="section-heading">
        <h2>{t("The exhibition")}</h2>
        <span className="muted">{t("Public details")}</span>
      </div>
      <form action={saveExhibitionDetails.bind(null, id)} className="stack-form">
        <div className="form-grid">
          <label>
            {t("Title")}
            <input name="title" defaultValue={e.title} required />
          </label>
          <label>
            {t("Exhibition language")}
            <select name="locale" defaultValue={e.locale}>
              {LOCALES.map((l) => (
                <option key={l} value={l} lang={l}>
                  {LOCALE_NAMES[l]}
                </option>
              ))}
            </select>
            <small className="muted">
              {t(
                "Visitors, invited authors and jurors see FullFrame in this language. Write the texts below in it too.",
              )}
            </small>
          </label>
          <label>
            {t("Introduction")}
            <input
              name="subtitle"
              defaultValue={e.subtitle || ""}
              placeholder={t("A sentence to set the scene")}
            />
          </label>
          <label>
            {t("Cover photograph")}
            <select name="coverImage" defaultValue={e.coverImage || ""}>
              <option value="">{t("First photograph")}</option>
              {works
                .filter((w) => w.preview)
                .map((w) => (
                  <option key={w.id} value={w.preview!}>
                    {w.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <label>
          {t("About this exhibition")}
          <textarea
            name="content"
            rows={4}
            defaultValue={e.welcomeContent || ""}
            placeholder={t("Share the story behind the photographs.")}
          />
        </label>
        <button className="primary">{t("Save details")}</button>
      </form>
    </section>
  );
}
