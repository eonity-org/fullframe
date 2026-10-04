import { msg } from "@/i18n/core";

/**
 * Palette names and accents follow TYDAL. Media surfaces stay neutral.
 * Labels are English translation keys — render them with `t(label)`.
 */
export const PALETTES = {
  /**
   * The values of TYDAL's own `tydal` theme (the logo's blues), under the
   * plainer name "Blue": here it's one exhibition style among others, not the
   * tool's brand. The default for new exhibitions; the key stays `blue`
   * because saved appearances store it.
   */
  blue: {
    label: msg("Blue"),
    accent: "#1A5D7D",
    dark: "#08435E",
    soft: "#E8F2F7",
  },
  william: {
    label: msg("William"),
    accent: "#35686D",
    dark: "#224B4F",
    soft: "#E4F5F6",
  },
  plum: {
    label: msg("Plum"),
    accent: "#5E3A62",
    dark: "#462749",
    soft: "#F4EEF5",
  },
  graphite: {
    label: msg("Graphite"),
    accent: "#3D4A57",
    dark: "#293642",
    soft: "#EEF1F4",
  },
  copper: {
    label: msg("Copper"),
    accent: "#7A4A3C",
    dark: "#63382C",
    soft: "#F8EFED",
  },
} as const;

export const THEMES = {
  gallery: {
    label: msg("White Gallery"),
    description: msg("Quiet space. Clean lines. Room to look."),
  },
  dark: {
    label: msg("Dark Gallery"),
    description: msg("A dark room with the photographs in focus."),
  },
  editorial: {
    label: msg("Editorial"),
    description: msg("Warm paper, expressive type, a slower rhythm."),
  },
} as const;

/**
 * Typography is its own choice, independent of the theme. Exhibitions saved
 * before it existed keep their look: Editorial resolves to serif, the rest
 * to sans (see `resolveAppearance`).
 */
export const TYPOGRAPHY = {
  sans: {
    label: msg("Modern"),
    description: msg("Clean sans-serif titles. Quiet and contemporary."),
  },
  serif: {
    label: msg("Classic"),
    description: msg(
      "Serif titles and captions, with an italic collection title.",
    ),
  },
} as const;

export const LAYOUTS = {
  salon: {
    label: msg("Flowing rows"),
    description: msg("Flowing rows, natural proportions, captions beneath."),
  },
  grid: {
    label: msg("Grid"),
    description: msg("Uniform frames with titles and numbers."),
  },
} as const;

export const GALLERY_VIEWS = {
  album: {
    label: msg("Mosaic"),
    description: msg(
      "Close-set photographs in flowing rows. Open a picture to look closer.",
    ),
  },
  salon: {
    label: msg("Gallery"),
    description: msg("Photographs with captions and space to pause."),
  },
  wall: {
    label: msg("Wall"),
    description: msg(
      "One photograph at a time, with slideshow and optional details.",
    ),
  },
} as const;
export type GalleryView = keyof typeof GALLERY_VIEWS;

export type Appearance = {
  palette: keyof typeof PALETTES;
  theme: keyof typeof THEMES;
  typography: keyof typeof TYPOGRAPHY;
  layout: keyof typeof LAYOUTS;
  enabledViews: GalleryView[];
  defaultView: GalleryView;
};
export const DEFAULT_APPEARANCE: Appearance = {
  palette: "blue",
  theme: "gallery",
  typography: "sans",
  layout: "salon",
  enabledViews: ["album", "salon", "wall"],
  defaultView: "salon",
};
export function resolveAppearance(
  value: Partial<Appearance> | null | undefined,
): Appearance {
  const requested = Array.isArray(value?.enabledViews)
    ? value.enabledViews
    : DEFAULT_APPEARANCE.enabledViews;
  const enabledViews = (Object.keys(GALLERY_VIEWS) as GalleryView[]).filter(
    (view) => requested.includes(view),
  );
  if (!enabledViews.length) enabledViews.push(DEFAULT_APPEARANCE.defaultView);
  const preferred = value?.defaultView || DEFAULT_APPEARANCE.defaultView;
  const theme =
    value?.theme && Object.hasOwn(THEMES, value.theme)
      ? value.theme
      : DEFAULT_APPEARANCE.theme;
  return {
    enabledViews,
    defaultView: enabledViews.includes(preferred)
      ? preferred
      : enabledViews.includes(DEFAULT_APPEARANCE.defaultView)
        ? DEFAULT_APPEARANCE.defaultView
        : enabledViews[0],
    layout:
      value?.layout && Object.hasOwn(LAYOUTS, value.layout)
        ? value.layout
        : DEFAULT_APPEARANCE.layout,
    palette:
      value?.palette && Object.hasOwn(PALETTES, value.palette)
        ? value.palette
        : DEFAULT_APPEARANCE.palette,
    theme,
    typography:
      value?.typography && Object.hasOwn(TYPOGRAPHY, value.typography)
        ? value.typography
        : theme === "editorial"
          ? "serif"
          : "sans",
  };
}

/** Called only after the curator session has been verified. */
export function previewAppearance(
  appearance: Appearance,
  params: Pick<URLSearchParams, "get" | "has">,
): Appearance {
  return resolveAppearance({
    ...appearance,
    theme: (params.get("ffTheme") || appearance.theme) as Appearance["theme"],
    typography: (params.get("ffType") ||
      appearance.typography) as Appearance["typography"],
    palette: (params.get("ffPalette") ||
      appearance.palette) as Appearance["palette"],
    layout: (params.get("ffLayout") ||
      appearance.layout) as Appearance["layout"],
    enabledViews: params.has("ffViews")
      ? (params.get("ffViews")!.split(",") as GalleryView[])
      : appearance.enabledViews,
    defaultView: (params.get("ffDefault") ||
      appearance.defaultView) as GalleryView,
  });
}
export function appearanceTokens(value: Appearance): Record<string, string> {
  const p = PALETTES[value.palette];
  return {
    "--accent": p.accent,
    "--accent-dark": p.dark,
    "--accent-soft": p.soft,
  };
}
