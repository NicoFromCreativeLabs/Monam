# terminal-bridge

HTTP→TCP bridge that lets the staff checkout (running in a browser) talk to
the PAX A910S card terminal over the shop's local network.

## Why this exists

The PAX A910S, once BBVA activates **modo ECR / integración POS** on it,
speaks Redsys's ECR-POS protocol over a **raw TCP socket on the local
network** — not a cloud API. A browser tab can't open a raw TCP socket, and
if MONAM OS is deployed to Vercel/the cloud, the Next.js server has no route
to a device on the shop's LAN either. So a small always-on process has to
sit on the same LAN as the terminal, exposed over plain HTTP (which the
browser *can* call), and translate each request into the TCP protocol.

```
Staff tablet (browser)  --HTTP (LAN)-->  terminal-bridge  --TCP (LAN)-->  PAX A910S
```

## Running it

Needs only Node.js (no dependencies — uses `http`/`net` from the standard
library).

```bash
cd terminal-bridge
node server.js
```

It listens on `http://<bridge-host>:4321` by default (`BRIDGE_PORT` to
change it). Point **Ajustes → Terminal de cobro → URL del puente** at
whatever address the staff tablet can reach it on (e.g.
`http://192.168.1.50:4321` if it runs on a separate always-on device, or
`http://localhost:4321` if it runs on the same machine as the browser).

Terminal connection details (IP, port, FUC, código de terminal) can either
be set as env vars on this process, or saved in **Ajustes → Terminal de
cobro** and sent with every request — the settings UI is the source of
truth; env vars are only a fallback for running the bridge standalone.

## Status

The actual Redsys ECR-POS message format in `server.js`
(`buildChargeMessage`/`parseResponseMessage`) is a **placeholder** — BBVA
has not yet handed over the ECR-POS integration manual for this merchant.
Once you have it:

1. Ask your BBVA TPV account manager to activate **modo ECR** on the PAX
   A910S and confirm the terminal's local IP/port, FUC, and código de
   terminal.
2. Replace `buildChargeMessage`/`parseResponseMessage` in `server.js` (and
   the mirrored copy in `../lib/terminal/redsys-ecr.ts`) with the real
   message format from the manual.
3. Fill in the connection details in **Ajustes → Terminal de cobro**.

Until then, "Tarjeta (terminal BBVA)" in checkout falls back to the manual
flow (vendedora cobra en la terminal física por separado y da clic en
Cobrar) — see `useTerminalSettings().settings.enabled`.
