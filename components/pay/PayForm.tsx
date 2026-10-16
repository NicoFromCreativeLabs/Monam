"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

// Publishable keys are meant to be public; null when it isn't configured so
// the page degrades to a message instead of throwing at import time.
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export function PayMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center">
      <h1 className="font-display text-2xl text-ciruela">{title}</h1>
      <p className="mt-3 font-body text-sm text-ciruela/70">{body}</p>
    </div>
  );
}

// Public counter-payment form (/pagar/<id>), opened from the QR Front Desk
// shows. Card details are typed into Stripe's own fields (an iframe), so they
// never reach our servers; Apple Pay / Google Pay appear automatically when the
// phone supports them. The sale is recorded by Front Desk's screen once Stripe
// reports the payment as succeeded.
export function PayForm({ clientSecret, amountMxn }: { clientSecret: string; amountMxn: number }) {
  if (!stripePromise) {
    return <PayMessage title="Pago no disponible" body="Pídele ayuda al personal del estudio." />;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        locale: "es-419",
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#3f0215",
            colorText: "#3f0215",
            colorBackground: "#faf6f3",
            borderRadius: "10px",
            fontFamily: "Inter, system-ui, sans-serif",
          },
        },
      }}
    >
      <CheckoutForm amountMxn={amountMxn} />
    </Elements>
  );
}

function CheckoutForm({ amountMxn }: { amountMxn: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      // Only used when the bank forces a redirect (3-D Secure); the page then
      // reloads and shows the paid state from the server.
      confirmParams: { return_url: `${window.location.origin}${window.location.pathname}` },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "No se pudo procesar el pago. Intenta de nuevo.");
      setSubmitting(false);
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      setDone(true);
      return;
    }
    setSubmitting(false);
  }

  if (done) {
    return <PayMessage title="Pago recibido" body="Gracias por tu compra. Ya puedes cerrar esta página." />;
  }

  return (
    <form onSubmit={onSubmit}>
      <PaymentElement options={{ defaultValues: { billingDetails: { address: { country: "MX" } } } }} />
      {error && <p className="mt-3 font-body text-xs text-[#b3392f]">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="mt-6 w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Procesando…" : `Pagar $${amountMxn} MXN`}
      </button>
      <p className="mt-3 text-center font-body text-[11px] text-ciruela/50">
        Pago seguro procesado por Stripe.
      </p>
    </form>
  );
}
