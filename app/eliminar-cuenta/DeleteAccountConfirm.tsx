"use client";

import { useActionState } from "react";
import { selfDeleteAccountAction, type DeleteAccountState } from "@/lib/actions/self-service";

export function DeleteAccountConfirm({
  clientId,
  token,
  clientName,
}: {
  clientId: string;
  token: string;
  clientName: string;
}) {
  const action = selfDeleteAccountAction.bind(null, clientId, token);
  const [state, formAction, pending] = useActionState<DeleteAccountState, FormData>(action, undefined);

  if (state && "ok" in state) {
    return (
      <p className="mt-5 font-body text-sm text-ciruela/70">
        Listo — tu cuenta y tus datos personales fueron eliminados. Gracias por avisarnos.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-5 space-y-4 text-left">
      <p className="font-body text-sm text-ciruela/70">
        Hola {clientName}. Esto elimina tu nombre, correo y teléfono de nuestro sistema para
        siempre — tu historial de compras se conserva, pero sin ningún dato que te identifique.
        No se puede deshacer.
      </p>
      {state && "error" in state && (
        <p className="rounded-lg bg-[#b3392f]/10 px-3 py-2 font-body text-xs text-[#b3392f]">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[#b3392f] px-5 py-3 font-body text-sm text-hueso disabled:opacity-50"
      >
        {pending ? "Eliminando…" : "Sí, eliminar mi cuenta y mis datos"}
      </button>
    </form>
  );
}
