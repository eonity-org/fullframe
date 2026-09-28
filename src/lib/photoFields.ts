import { msg } from "@/i18n/core";

/**
 * The details a curator gives each photograph they add. Title and author are
 * required (the same two TYDAL's photo scheme requires: every caption and
 * credit needs them); technique, dimensions and description are optional and
 * simply don't appear when left blank. Each key is sent
 * as-is in the vault `ingest`/`update` metadata document: TYDAL puts `name`
 * and `description` on the resource and keeps the rest as its metadata
 * (`author`, `technique`, `dimensions` — `author` and `technique` are fields
 * of the photo scheme, so they index and facet). Add a field here and it
 * appears in the upload and edit forms.
 */
export const PHOTO_FIELDS = [
  { key: "name", label: msg("Title"), required: true },
  { key: "author", label: msg("Author"), required: true },
  {
    key: "technique",
    label: msg("Technique"),
    placeholder: msg("e.g. Silver gelatin print"),
  },
  {
    key: "dimensions",
    label: msg("Dimensions"),
    placeholder: msg("e.g. 50 × 70 cm"),
  },
  { key: "description", label: msg("Description"), multiline: true },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  multiline?: boolean;
}>;

/** Whether a field must be filled in before the photograph can be sent. */
export function isRequired(field: (typeof PHOTO_FIELDS)[number]): boolean {
  return "required" in field && field.required;
}

export type PhotoFieldKey = (typeof PHOTO_FIELDS)[number]["key"];
export type PhotoDetails = Partial<Record<PhotoFieldKey, string>>;

/** Pick the known fields from form data, trimmed; blanks become absent. */
export function detailsFrom(source: FormData | Record<string, unknown>): PhotoDetails {
  const read = (key: string) =>
    source instanceof FormData ? source.get(key) : source[key];
  const details: PhotoDetails = {};
  for (const { key } of PHOTO_FIELDS) {
    const value = read(key);
    if (typeof value === "string" && value.trim()) details[key] = value.trim();
  }
  return details;
}

/** The required fields still empty — none means the photograph is ready to send. */
export function missingFields(details: PhotoDetails): PhotoFieldKey[] {
  return PHOTO_FIELDS.filter(isRequired)
    .map((f) => f.key)
    .filter((key) => !details[key]?.trim());
}
