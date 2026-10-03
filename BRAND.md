# FullFrame brand

What the FullFrame identity means and the rules that keep it consistent. The
code is the source of the values; this page says why they are what they are.

## The mark

```
┌──────────┐
│  ──────┐ │
│        │ │
│        │ │
└──────────┘
```

**Meaning.** The outer square is the frame of a picture hanging in a gallery:
the work everyone is looking at. The corner inside it is part of a viewfinder,
one person's view of that work. It is only part of a viewfinder because every
person sees the work in their own way. The *full* frame only comes together
when the personal views are put together.

The geometry says the same thing. One corner cannot define a rectangle; the
opposite corner, a second view, fixes the whole frame. That is FullFrame's
work: curators, jurors, authors and visitors each bring a view, and the
exhibition is the sum of them. The brand line says it in words: *Make room for
a different view.* (*Deja sitio a otra mirada.*)

In motion the mark has a second reading: the click of a camera. Framing is
choosing a view; the click is the moment of committing to it. The arriving
corner is the shutter, closing on the picture for an instant and opening
again.

**Rules.**

- The mark is deliberately incomplete. Don't add corners to it, fill it, or
  turn the viewfinder into a closed rectangle. A second corner appears only in
  motion, as the moment another view meets this one (see "Motion").
- The mark always stands with the name FullFrame, never with an
  organization's or exhibition's name. Alone, without the name, it still
  means FullFrame: the favicon, the header on a phone, the cover placeholder.
- One colour: the text colour of the surface (`currentColor`): ink
  `#202b2c` on light, `#dadbd4` on dark. It is never tinted with an
  exhibition's palette.

**Drawing.** `src/components/FrameMark.tsx`, on a 23-unit grid:

| Part | Geometry | Stroke |
|---|---|---|
| Frame | square 1–22 (centre line), 23 outer | 2 |
| Viewfinder corner | top-right, from (6, 6.5) to (16.5, 6.5) to (16.5, 17) | 1 |

The strokes don't scale (`vector-effect: non-scaling-stroke`), so a large mark
keeps the same fine line. Standalone file: `public/fullframe-mark.svg`.

**Favicon.** `src/app/icon.svg`: the same drawing on a 32-unit grid with
strokes thickened to 4 and 3, so the corner survives at 16 px. It switches to
`#dadbd4` in dark mode.

## Motion

Motion is the one place a second view arrives. The resting mark never
changes; the arriving corners are drawn on top for the length of the
animation and removed after it.

- **The arriving corner never touches the resting one.** It stops 1.5 units
  short at both ends, so the frame stays open, as the frame lines in a real
  viewfinder do, and the eye closes it. Two corners that joined would draw a
  second, closed frame inside the first.

Three motions, one per level of the header trail:

| Arriving at | Motion | What happens |
|---|---|---|
| Home, from an organization or exhibition | **Many views** (`many`, 3 s) | Five corners of different sizes, different crops of the same picture, drift in, settle on the two places and fade. The many exhibitions. |
| An organization | **Frame** (`frame`, 2.4 s) | The opposite corner comes in along the diagonal, holds, and leaves, smoothly. Another view frames the picture. |
| An exhibition | **Shutter** (`shutter`, 1.8 s) | The opposite corner drifts in, slowing as it frames (about 1.1 s), clicks into place in about 110 ms (a hair past and back), then releases and leaves quickly. The shot is taken. |

- The click belongs only to the exhibition: the moment one view takes its
  shot of the work. Moving between an exhibition's own views doesn't replay
  it.
- Each plays once per arrival, in the header, and not at all with reduced
  motion. On a fresh page load the referrer decides where you came from.
- Code: `src/lib/markMotion.ts`, started by `HeaderTrail`; the rules for
  when each plays are tested in `tests/markMotion.test.ts`.

## The name

- **FullFrame**, one word with two capitals, in every language. Never "Full
  Frame".
- Always set in **Manrope 750, letter-spacing −0.06em**, through the `--brand`
  token in `src/app/globals.css`. Themes and an exhibition's typography change
  `--display`, never `--brand`. Classes: `.wordmark` (the header lockup) and
  `.brand-name` (the footer credit).
- Lockup: mark, 12 px gap, name. Name at 21 px in headers (19 px on phones).

## The header trail

The header's left side names where you are, top level first:

```
▢ FullFrame                         home: every exhibition on view
▢ FullFrame · ABEJAROJA             an organization's exhibitions
▢ FullFrame · ABEJAROJA · expo      an exhibition
▢ FullFrame · Studio                the studio (Taller)
```

- Each level links to its own page; the current one is plain text (inside
  an exhibition's views it links back to the entrance).
- FullFrame keeps its brand setting; the organization is quiet (muted, 500);
  the current page leads (ink, 600).
- Levels are split by a **middle dot**, in the muted colour, 10 px each
  side, hidden from screen readers. The dot is the site's one separator
  ("01 · On view", the footer credits), so no vertical bars or slashes.
- All names share one **baseline**; only the mark is centred on them.
- On phones (under 640 px), when levels follow, the mark alone stands for
  FullFrame.
- Component: `src/components/HeaderTrail.tsx`.
- One page column everywhere (home, exhibitions, studio, jury): sides padded
  by `--page-inline` (5%, content at most 1440 px, 18 px on phones), headers
  `--header-height` (92 px) high. The logo and the page content always start
  at the same left edge, and the header never changes width between pages.

## Colour

FullFrame's interface uses TYDAL's blues (sRGB): accent `#1a5d7d`, dark
`#08435e`, tint `#e8f2f7`. Exhibitions choose their own palette; the mark and
the name never take it.

## Voice

Short, plain, editorial. The Spanish is written as original copy, not
translated word for word: *comisario* for the curator, *Taller* for the
Studio, and FullFrame unchanged.
