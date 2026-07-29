const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const http = require("http");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

let sock = null;
let connectionStatus = "disconnected"; // 'disconnected', 'connecting', 'qr', 'connected'
let lastQr = null;
let isResetting = false; // flag to abort auto-reconnect during manual reset
let reconnectDelay = 3000; // starts at 3s, doubles on each failure (max 60s)

function destroySocket() {
  if (sock) {
    try {
      sock.ev.removeAllListeners();
      sock.end();
    } catch (_) {}
    sock = null;
  }
}

function clearAuthFiles() {
  const authDir = path.join(__dirname, "auth_info_baileys");
  if (fs.existsSync(authDir)) {
    const entries = fs.readdirSync(authDir);
    for (const entry of entries) {
      const fullPath = path.join(authDir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          fs.unlinkSync(fullPath); // only delete files, skip dirs like lost+found
        }
      } catch (e) {
        console.error("Error removing auth entry:", fullPath, e.message);
      }
    }
  }
}

async function connectToWhatsApp() {
  if (isResetting) return; // do not start a new connection during reset

  const authDir = path.join(__dirname, "auth_info_baileys");
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on("connection.update", async (update) => {
    if (isResetting) return; // ignore events during reset

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      connectionStatus = "qr";
      try {
        lastQr = await QRCode.toDataURL(qr);
      } catch (err) {
        console.error("Failed to generate QR data URL:", err);
      }
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed, reconnecting: ", shouldReconnect, "| delay:", reconnectDelay, "ms");

      if (isResetting) return;

      connectionStatus = "disconnected";
      lastQr = null;

      if (shouldReconnect) {
        const delay = reconnectDelay;
        reconnectDelay = Math.min(reconnectDelay * 2, 60000); // exponential backoff, cap at 60s
        setTimeout(connectToWhatsApp, delay);
      } else {
        reconnectDelay = 3000; // reset backoff on clean logout
        console.log("Logged out from WhatsApp. Clearing auth info and generating new QR.");
        clearAuthFiles();
        setTimeout(connectToWhatsApp, 2000);
      }
    } else if (connection === "open") {
      reconnectDelay = 3000; // reset backoff on successful connection
      console.log("Opened connection successfully");
      connectionStatus = "connected";
      lastQr = null;
    } else if (connection === "connecting") {
      if (lastQr) {
        connectionStatus = "qr";
      } else {
        connectionStatus = "connecting";
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// Start WhatsApp socket connection
connectToWhatsApp().catch(err => console.error("Error in Baileys startup:", err));

// Start HTTP server on port 3529
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname.replace(/\/+/g, '/'); // Normalize multiple slashes to a single slash

  if (pathname === "/status" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: connectionStatus, qr: lastQr }));
    return;
  }

  if (pathname === "/logout" && req.method === "POST") {
    try {
      // Signal all active loops to stop
      isResetting = true;
      connectionStatus = "disconnected";
      lastQr = null;

      // Destroy the current socket completely
      destroySocket();

      // Wait a moment for pending events to drain
      await new Promise(resolve => setTimeout(resolve, 500));

      // Wipe saved credentials so next connection asks for a new QR
      clearAuthFiles();

      // Re-enable connection and start fresh (reset backoff too)
      reconnectDelay = 3000;
      isResetting = false;
      setTimeout(connectToWhatsApp, 500);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      isResetting = false;
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (pathname === "/send" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const { messages } = data; // Array details: { phone, text }

        if (!messages || !Array.isArray(messages)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid payload format" }));
          return;
        }

        if (connectionStatus !== "connected" || !sock) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "WhatsApp is not connected. Scan QR Code first." }));
          return;
        }

        const logs = [];
        for (const item of messages) {
          let formattedPhone = item.phone.replace(/\D/g, "");
          if (formattedPhone.length === 11 && !formattedPhone.startsWith("55")) {
            formattedPhone = "55" + formattedPhone;
          } else if (formattedPhone.length === 10) {
            formattedPhone = "55" + formattedPhone; // prefix country code
          } else if (formattedPhone.length === 9) {
            // Missing DDD, fallback or keep as is.
          }

          const jid = formattedPhone + "@s.whatsapp.net";
          console.log(`Sending message to: ${jid}`);
          await sock.sendMessage(jid, { text: item.text });
          logs.push({ phone: item.phone, status: "sent" });
          
          // delay to mitigate anti-spam restrictions
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, logs }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

const PORT = process.env.PORT || 3529;
server.listen(PORT, () => {
  console.log(`WhatsApp server listening on port ${PORT}`);
});
