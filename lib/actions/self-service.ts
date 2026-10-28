"use server";

import { prisma } from "@/lib/prisma";
import { verifyLinkToken } from "@/lib/signed-link-token";
import { anonymizeClient } from "@/lib/actions/clients";

// Reached from "eliminar tu cuenta" in the welcome/receipt email — the
// client has no password yet, so this can't sit behind requireClient().
// Authorized entirely by the signed token (clientId + token must match what
// was minted into that email), re-verified here server-side rather than
// trusted from the page that rendered the confirm button.
export type DeleteAccountState = { error: string } | { ok: true } | undefined;

export async function selfDeleteAccountAction(
  clientId: string,
  token: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's (prevState, formData) shape; everything needed arrives via the bound clientId/token instead
  _prevState: DeleteAccountState, _formData: FormData,
): Promise<DeleteAccountState> {
  if (!verifyLinkToken("delete-account", clientId, token)) {
    return { error: "Este enlace ya no es válido." };
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.anonymizedAt) {
    return { error: "Esta cuenta ya fue eliminada o no existe." };
  }

  const deleted = await anonymizeClient(clientId, {
    userId: null,
    role: null,
    reason: "Solicitud ARCO — la clienta pidió eliminar su cuenta desde el correo de su ticket.",
  });
  if (!deleted) return { error: "No se pudo eliminar la cuenta. Intenta de nuevo." };

  return { ok: true };
}
