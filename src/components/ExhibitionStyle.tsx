"use client";
import type { CSSProperties, ReactNode } from "react";
import { createContext, useContext } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  resolveAppearance,
  previewAppearance,
  appearanceTokens,
  type Appearance,
} from "@/lib/appearance";
const PreviewQuery = createContext("");
const GalleryAppearance = createContext(resolveAppearance(null));
export const useGalleryAppearance = () => useContext(GalleryAppearance);

/** View changes use browser navigation so a WebKit transition cannot swallow the first click. */
export function GalleryNavigationLink(props: React.ComponentProps<"a">) {
  const query = useContext(PreviewQuery);
  return <a {...props} href={props.href ? props.href + query : undefined} />;
}

export function GalleryLink(props: React.ComponentProps<typeof Link>) {
  const query = useContext(PreviewQuery);
  return (
    <Link
      {...props}
      href={typeof props.href === "string" ? props.href + query : props.href}
    />
  );
}
export function ExhibitionStyle({
  appearance,
  preview,
  lang,
  children,
}: {
  appearance: Appearance;
  preview: boolean;
  lang: string;
  children: ReactNode;
}) {
  const params = useSearchParams();
  const value = preview ? previewAppearance(appearance, params) : appearance;
  const query = new URLSearchParams();
  if (
    preview &&
    ["ffTheme", "ffType", "ffPalette", "ffLayout", "ffViews", "ffDefault"].some(
      (key) => params.has(key),
    )
  ) {
    query.set("ffTheme", value.theme);
    query.set("ffType", value.typography);
    query.set("ffPalette", value.palette);
    query.set("ffLayout", value.layout);
    query.set("ffViews", value.enabledViews.join(","));
    query.set("ffDefault", value.defaultView);
  }
  return (
    <PreviewQuery.Provider value={query.size ? `?${query}` : ""}>
      <GalleryAppearance.Provider value={value}>
        <div
          className="exhibition-surface"
          lang={lang}
          data-theme={value.theme}
          data-typography={value.typography}
          data-layout={value.layout}
          style={appearanceTokens(value) as CSSProperties}
        >
          {children}
        </div>
      </GalleryAppearance.Provider>
    </PreviewQuery.Provider>
  );
}
