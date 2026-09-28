import "server-only";
import { redirect } from "next/navigation";
import { accessFor, studioSession, type StudioAccess } from "./admin";

/**
 * For a studio page: the session's access to this exhibition, or a redirect —
 * to sign in without a session, back to the list without access. (Apart from
 * admin.ts so that module stays free of Next's navigation, for unit tests.)
 */
export async function requireStudioAccess(exhibition: {
  organizationId: string | null;
}): Promise<StudioAccess> {
  const session = await studioSession();
  if (!session) redirect("/admin/login");
  const access = accessFor(session, exhibition.organizationId);
  if (!access) redirect("/admin");
  return access;
}
