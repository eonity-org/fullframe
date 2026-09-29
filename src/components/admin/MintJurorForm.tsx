"use client";

/** Invite a juror: the new line in the list above carries the link to copy. */
import { useActionState } from "react";
import { mintJuror, type MintResult } from "@/lib/actions";
import { useT } from "@/i18n/client";

export function MintJurorForm({ exhibitionId }: { exhibitionId: number }) {
  const t = useT();
  const [result, action, pending] = useActionState<MintResult, FormData>(
    (previous, formData) => mintJuror(exhibitionId, previous, formData),
    null,
  );

  return (
    <form action={action} className="invite-form">
      <label>
        {t("Name")}
        <input name="name" required />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? t("Creating…") : t("Invite juror")}
      </button>
      {result && "error" in result && <p className="error">{result.error}</p>}
    </form>
  );
}
