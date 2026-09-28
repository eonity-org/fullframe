"use client";

/**
 * Mint a juror: the personal URL is shown exactly once — only its hash is
 * stored. Losing it means revoke + mint again.
 */
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
    <div>
      {result && "url" in result && (
        <p className="mint-result">
          {t.rich("Personal URL for {name}:", {
            name: <strong>{result.name}</strong>,
          })}
          <code>{result.url}</code>
        </p>
      )}
      {result && "error" in result && <p className="error">{result.error}</p>}
      <form action={action} className="admin-form grid">
        <label>
          {t("Name")}
          <input name="name" required />
        </label>
        <label>
          {t("Email")}
          <input name="email" type="email" />
        </label>
        <button type="submit" disabled={pending}>
          {pending ? t("Creating…") : t("Create invitation link")}
        </button>
      </form>
    </div>
  );
}
