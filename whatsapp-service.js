const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const http = require("http");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

let sock = null;
let connectionStatus = "disconnected"; // 'disconnected', 'connecting', 'qr', 'connected'
let lastQr = null;

async function connectToWhatsApp() {
  const authDir = path.join(__dirname, "auth_info_baileys");
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on("connection.update", async (update) => {
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
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed, reconnecting: ", shouldReconnect);
      connectionStatus = "disconnected";
      lastQr = null;
      
      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 3000);
      } else {
        console.log("Logged out from WhatsApp. Clearing auth info and generating new QR.");
        try {
          const authDir = path.join(__dirname, "auth_info_baileys");
          if (fs.existsSync(authDir)) {
            const files = fs.readdirSync(authDir);
            for (const file of files) {
              fs.unlinkSync(path.join(authDir, file));
            }
          }
        } catch (e) {
          console.error("Error clearing auth info:", e);
        }
        setTimeout(connectToWhatsApp, 2000);
      }
    } else if (connection === "open") {
      console.log("Opened connection successfully");
      connectionStatus = "connected";
      lastQr = null;
    } else if (connection === "connecting") {
      connectionStatus = "connecting";
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
      if (sock) {
        await sock.logout().catch(e => console.log("Logout error ignored", e));
      }
      const authDir = path.join(__dirname, "auth_info_baileys");
      if (fs.existsSync(authDir)) {
        const files = fs.readdirSync(authDir);
        for (const file of files) {
          fs.unlinkSync(path.join(authDir, file));
        }
      }
      connectionStatus = "disconnected";
      lastQr = null;
      setTimeout(connectToWhatsApp, 1000);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
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
