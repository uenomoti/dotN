// server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
const app = express();

const PORT = 8080;
const SAVE_FILE = "canvas.json";

// 永続化キャンバス
let canvasData = {};
if (fs.existsSync(SAVE_FILE)) {
  try {
    canvasData = JSON.parse(fs.readFileSync(SAVE_FILE, "utf8"));
  } catch {
    canvasData = {};
  }
}

app.use(express.static("."));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  // 接続時に全データ送信
  ws.send(JSON.stringify({ type: "init", data: canvasData }));

  ws.on("message", (msg) => {
    const m = JSON.parse(msg);
    if (m.type === "dot") {
      const key = `${m.x},${m.y}`;
      canvasData[key] = m.color;
      // 全員に配信
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "dot", x: m.x, y: m.y, color: m.color }));
        }
      });
    }
  });
});

// 定期保存
setInterval(() => {
  fs.writeFileSync(SAVE_FILE, JSON.stringify(canvasData));
}, 5000);

server.listen(PORT, () => console.log(`dotN running → http://localhost:${PORT}`));
