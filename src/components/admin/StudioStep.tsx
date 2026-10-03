import type { ReactNode } from "react";

/**
 * One numbered box of the overview. The boxes follow the exhibition's course
 * (photographs → jury → choosing); the ones the current stage works with are
 * active, the others step back but stay readable — and usable, where their
 * controls still apply.
 */
export function StudioStep({
  number,
  id,
  eyebrow,
  title,
  active,
  status,
  action,
  children,
}: {
  number: number;
  id: string;
  eyebrow?: string;
  title: string;
  active: boolean;
  /** Why the box is waiting, when it isn't active; already translated. */
  status?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={active ? "panel studio-step active" : "panel studio-step"} id={id}>
      <div className="section-heading">
        <div className="step-title">
          <span className="step-number" aria-hidden="true">
            {number}
          </span>
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2>{title}</h2>
          </div>
        </div>
        {action}
      </div>
      {!active && status && <p className="hint step-status">{status}</p>}
      {children}
    </section>
  );
}
