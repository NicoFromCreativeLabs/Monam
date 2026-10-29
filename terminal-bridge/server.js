// Local bridge between the staff tablet's browser and the PAX A910S card
// terminal. Runs on a machine on the same LAN as the terminal (e.g. the
// same tablet/PC used for checkout, or a small always-on device at the
// front desk) — NOT on Vercel/the cloud, which has no route to a local IP.
//
// The browser (StaffCheckoutView, via lib/terminal/bridge-client.ts) calls
// this over HTTP on the LAN; this process opens a raw TCP socket to the
// terminal and speaks the Redsys ECR-POS protocol (lib/terminal/redsys-ecr.ts
// — still a placeholder until BBVA hands over the real manual).
//
// Usage:
//   node terminal-bridge/server.js
// Config via env vars (all optional — can also be sent per-request from the
// browser using the values saved in Ajustes → Terminal de cobro):
//   BRIDGE_PORT        default 4321
//   TERMINAL_IP        PAX A910S LAN IP
//   TERMINAL_PORT      Redsys ECR-POS TCP port
//   TERMINAL_FUC       Redsys merchant code
//   TERMINAL_ID        Redsys terminal code
//   TERMINAL_TIMEOUT_MS default 30000 — card-present flows need time for the client to tap/insert

const http = require("http");
const net = require("net");

const BRIDGE_PORT = Number(process.env.BRIDGE_PORT) || 4321;
const TIMEOUT_MS = Number(process.env.TERMINAL_TIMEOUT_MS) || 30000;

// TODO(redsys-ecr-protocol): swap for the real message format once BBVA
// provides the ECR-POS manual — mirrors lib/terminal/redsys-ecr.ts, kept as
// a plain-JS copy here so this bridge has zero dependency on the Next app
// (it is not part of the `next build`/deploy, it ships and runs separately).
function buildChargeMessage({ amountMxn, ticketId, fuc, terminalId }) {
  const amountCentavos = Math.round(amountMxn * 100);
  return ["VENTA", String(amountCentavos).padStart(12, "0"), fuc, terminalId, ticketId].join("|");
}

function parseResponseMessage(raw) {
  const fields = raw.trim().split("|");
  const [status, authCode, ...rest] = fields;
  const approved = status === "OK" || status === "00";
  return {
    approved,
    authCode: authCode || undefined,
    message: approved ? "Pago aprobado por la terminal." : `Terminal rechazó el cobro (${rest.join(" ") || "sin detalle"}).`,
    rawResponse: raw,
  };
}

function chargeOverTcp({ terminalIp, terminalPort, amountMxn, ticketId, fuc, terminalId }) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let buffer = "";

    socket.setTimeout(TIMEOUT_MS);
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("La terminal no respondió a tiempo. Revisa que esté encendida y en la misma red."));
    });
    socket.once("error", (err) => {
      reject(new Error(`No se pudo conectar con la terminal (${terminalIp}:${terminalPort}): ${err.message}`));
    });
    socket.connect(terminalPort, terminalIp, () => {
      socket.write(buildChargeMessage({ amountMxn, ticketId, fuc, terminalId }));
    });
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      // TODO(redsys-ecr-protocol): the real protocol likely frames messages
      // (length prefix or a terminator byte) rather than closing the socket
      // per message — adjust once the manual specifies it.
    });
    socket.on("close", () => {
      if (buffer) resolve(parseResponseMessage(buffer));
      else reject(new Error("La terminal cerró la conexión sin responder."));
    });
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    // The bridge only needs to answer the staff tablet's own browser on the
    // same LAN — no third party should ever be able to reach it.
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && req.url === "/charge") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const input = JSON.parse(body || "{}");
        const terminalIp = input.terminalIp || process.env.TERMINAL_IP;
        const terminalPort = Number(input.terminalPort || process.env.TERMINAL_PORT);
        const fuc = input.fuc || process.env.TERMINAL_FUC;
        const terminalId = input.terminalId || process.env.TERMINAL_ID;
        const amountMxn = Number(input.amountMxn);
        const ticketId = String(input.ticketId || "");

        if (!terminalIp || !terminalPort || !fuc || !terminalId) {
          sendJson(res, 400, { error: "Falta configurar la terminal (IP, puerto, FUC o código de terminal) en Ajustes." });
          return;
        }
        if (!Number.isFinite(amountMxn) || amountMxn <= 0) {
          sendJson(res, 400, { error: "Monto inválido." });
          return;
        }

        const result = await chargeOverTcp({ terminalIp, terminalPort, amountMxn, ticketId, fuc, terminalId });
        sendJson(res, 200, result);
      } catch (err) {
        sendJson(res, 502, { error: err instanceof Error ? err.message : "Error desconocido al cobrar en la terminal." });
      }
    });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(BRIDGE_PORT, () => {
  console.log(`[terminal-bridge] escuchando en http://0.0.0.0:${BRIDGE_PORT} (ctrl+c para detener)`);
});
