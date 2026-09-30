"use client";

/**
 * The submit button of a server-rendered form that saves in place: enabled
 * only while the form differs from what was last saved, so a just-saved form
 * doesn't keep inviting another save. The baseline is the form as rendered,
 * then as submitted.
 */
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

function snapshot(form: HTMLFormElement): string {
  return JSON.stringify([...new FormData(form).entries()].map(([k, v]) => [k, String(v)]));
}

export function SaveChangesButton({
  label,
  savingLabel,
  savedLabel,
}: {
  label: string;
  savingLabel: string;
  savedLabel: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const baseline = useRef("");
  const [dirty, setDirty] = useState(false);
  const { pending } = useFormStatus();

  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    baseline.current = snapshot(form);
    const check = () => setDirty(snapshot(form) !== baseline.current);
    form.addEventListener("input", check);
    form.addEventListener("change", check);
    return () => {
      form.removeEventListener("input", check);
      form.removeEventListener("change", check);
    };
  }, []);

  // A save just finished: what's in the form now is what's saved.
  const wasPending = useRef(false);
  useEffect(() => {
    const form = ref.current?.form;
    if (wasPending.current && !pending && form) {
      baseline.current = snapshot(form);
      setDirty(false);
    }
    wasPending.current = pending;
  }, [pending]);

  return (
    <button ref={ref} className="primary" disabled={!dirty || pending}>
      {pending ? savingLabel : dirty ? label : savedLabel}
    </button>
  );
}
