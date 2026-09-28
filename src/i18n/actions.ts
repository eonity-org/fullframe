"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale } from "./core";
import { LOCALE_COOKIE } from "./server";

/** Save the viewer's language (home page and studio). */
export async function setViewerLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 365 * 24 * 3600,
  });
  revalidatePath("/", "layout");
}
