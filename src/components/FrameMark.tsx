/**
 * The FullFrame mark: a square frame with a viewfinder corner inside it.
 * Drawn on the 23 px grid it was designed on (2 px frame, 1 px corner 4 px
 * in); the strokes keep that weight at any size, so a large mark (the cover
 * placeholder) stays fine-lined. Colour follows `currentColor`.
 * Standalone copies: `public/fullframe-mark.svg`, favicon `src/app/icon.svg`.
 */
export function FrameMark({ className = "frame-mark" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 23 23"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="1"
        y="1"
        width="21"
        height="21"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M6 6.5H16.5V17"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
