"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function ConfirmationDialog({
  open,
  title,
  pending,
  onCancel,
  children,
  className,
}: {
  open: boolean;
  title: string;
  pending: boolean;
  onCancel: () => void;
  children: ReactNode;
  /** Extra class for a variant, e.g. the wider photo viewer. */
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className={className ? `confirmation-dialog ${className}` : "confirmation-dialog"}
      aria-labelledby={titleId}
      aria-busy={pending}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
    >
      {open && (
        <>
          <h2 id={titleId}>{title}</h2>
          {children}
        </>
      )}
    </dialog>
  );
}
