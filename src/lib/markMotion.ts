/**
 * The mark in motion (BRAND.md, "Motion"). At rest the mark is one view: a
 * single viewfinder corner. Motion is the only place a second view arrives.
 * The arriving corner stops short of the resting one, so the two never join
 * and the eye closes the frame, as in a real viewfinder. The temporary
 * corners are removed when the animation ends; the resting mark is untouched.
 * Browser-only.
 */
import { isReservedOrganizationSlug } from "./paths";

/**
 * `many`: many views gather (coming home, where the many exhibitions are).
 * `frame`: another view frames the picture (entering an organization).
 * `shutter`: another view frames it and takes the shot (entering an
 * exhibition).
 */
export type MarkMotion = "many" | "frame" | "shutter";

const SVG = "http://www.w3.org/2000/svg";
/** The opposite corner, 1.5 units short of the resting one at both ends. */
const OTHER = "M15 16.5H6.5V8";
const OWN = "M6 6.5H16.5V17";
const EASE = "cubic-bezier(.3,0,.2,1)";

function corner(svg: SVGSVGElement, d: string): SVGPathElement {
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", d);
  path.setAttribute("stroke-width", "1");
  path.setAttribute("vector-effect", "non-scaling-stroke");
  path.setAttribute("opacity", "0");
  path.style.transformOrigin = "11.5px 11.5px";
  svg.appendChild(path);
  return path;
}

/** Play a motion on a FrameMark's svg, once. */
export function playMarkMotion(svg: SVGSVGElement, motion: MarkMotion) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // One other view (frame, shutter): the opposite corner comes in along the
  // diagonal, holds (frame) or clicks into place (shutter), and leaves.
  const views =
    motion !== "many"
      ? [{ d: OTHER, from: [-5, 5, 1] }]
      : // Many views: corners of different sizes, different crops of the
        // same picture, drift in and settle on the two places, then fade.
        [
          { d: OTHER, from: [-6, 4, 0.6] },
          { d: OWN, from: [3, -5, 1.25] },
          { d: OTHER, from: [4, 6, 0.8] },
          { d: OWN, from: [-4, -3, 0.7] },
          { d: OTHER, from: [-3, -6, 1.2] },
        ];
  views.forEach(({ d, from: [x, y, s] }, i) => {
    const path = corner(svg, d);
    const away = `translate(${x}px, ${y}px) scale(${s})`;
    const home = "translate(0, 0) scale(1)";
    const frames: Keyframe[] =
      motion === "frame"
        ? [
            { transform: away, opacity: 0 },
            { transform: home, opacity: 1, offset: 0.32 },
            { transform: home, opacity: 1, offset: 0.68 },
            { transform: away, opacity: 0 },
          ]
        : motion === "shutter"
        ? [
            // Frame: a slow drift, slowing as if finding the picture.
            { transform: away, opacity: 0, easing: "cubic-bezier(.2,.7,.3,1)" },
            {
              transform: "translate(-0.9px, 0.9px)",
              opacity: 1,
              offset: 0.6,
              easing: "cubic-bezier(.8,0,1,.6)",
            },
            // Click: the last stretch in about 110 ms, a hair past, home.
            {
              transform: "translate(0.25px, -0.25px)",
              opacity: 1,
              offset: 0.66,
              easing: "ease-out",
            },
            { transform: home, opacity: 1, offset: 0.7 },
            // Release: open and leave, quickly.
            {
              transform: home,
              opacity: 1,
              offset: 0.76,
              easing: "cubic-bezier(.5,0,1,1)",
            },
            { transform: away, opacity: 0 },
          ]
        : [
            { transform: away, opacity: 0 },
            {
              transform: `translate(${x * 0.4}px, ${y * 0.4}px) scale(${1 + (s - 1) * 0.4})`,
              opacity: 0.45,
              offset: 0.25,
            },
            { transform: home, opacity: 1, offset: 0.55 },
            { transform: home, opacity: 1, offset: 0.75 },
            { transform: home, opacity: 0 },
          ];
    path
      .animate(frames, {
        duration: { frame: 2400, shutter: 1800, many: 3000 }[motion],
        delay: i * 90,
        // The shutter sets its own easing per step.
        easing: motion === "shutter" ? "linear" : EASE,
        fill: "both",
      })
      .finished.then(
        () => path.remove(),
        () => path.remove(),
      );
  });
}

/**
 * Where a public path sits in the trail: `""` home, `"org"` or
 * `"org/exhibition"`; null for paths outside it (studio, jury, invitations).
 */
export function trailKey(path: string): string | null {
  const [org, exhibition] = path.split("?")[0].split("/").filter(Boolean);
  if (!org) return "";
  if (isReservedOrganizationSlug(org)) return null;
  return exhibition ? `${org}/${exhibition}` : org;
}

/**
 * Which motion the mark plays on arriving at `current` from `previous`:
 * many views on coming home from an organization or an exhibition, a framing
 * view on entering an organization, the shutter on entering an exhibition
 * (moving between an exhibition's own views is not entering it).
 */
export function motionFor(
  previous: string | null,
  current: string,
): MarkMotion | null {
  const to = trailKey(current);
  const from = previous === null ? null : trailKey(previous);
  if (to === null) return null;
  if (to === "") return from ? "many" : null;
  if (from === to) return null;
  return to.includes("/") ? "shutter" : "frame";
}
