/**
 * The gate for an author's upload routes: a live personal link, submissions
 * open, and a vault that accepts the photographs. Answers in the exhibition's
 * language, like the rest of what the author sees.
 */
import "server-only";
import { authorFromToken, submissionsOpen, type Author } from "./authors";
import type { Exhibition } from "./exhibitions";
import { uploadAccess } from "./uploads";
import { clientIp, rateLimit, tooManyRequests } from "./rateLimit";
import { exhibitionT } from "@/i18n/server";
import type { Translator } from "@/i18n/core";
import { log } from "./log";

export type AuthorGate =
  | { error: Response }
  | {
      t: Translator;
      author: Author;
      exhibition: Exhibition;
      /** Hashes TYDAL lists as added through this vault. */
      ingested: string[];
    };

export async function authorGate(
  request: Request,
  token: string,
): Promise<AuthorGate> {
  // Throttle token guessing and runaway clients alike.
  const limit = rateLimit(`author:${clientIp(request)}`, 60, 60_000);
  if (!limit.ok) return { error: tooManyRequests(limit) };
  const found = await authorFromToken(token);
  if (!found) {
    log.warn("author.door.miss", { ip: clientIp(request) });
    return { error: Response.json({ error: "Not found" }, { status: 404 }) };
  }
  const { author, exhibition } = found;
  const t = exhibitionT(exhibition);
  if (!submissionsOpen(exhibition))
    return {
      error: Response.json(
        { error: t("Submissions are closed.") },
        { status: 409 },
      ),
    };
  const { access, ingested } = await uploadAccess(exhibition);
  if (access !== "ready")
    return {
      error: Response.json(
        { error: t("Submissions are not available right now. Try again later.") },
        { status: 503 },
      ),
    };
  return { t, author, exhibition, ingested };
}
