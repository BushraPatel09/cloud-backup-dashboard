import { WebSocketServer } from "ws";
let wss;

// Store connected clients
const clients = new Set();

export function initSocketServer(server) {
  wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("✅ New WebSocket client connected!");
    clients.add(ws);

    ws.on("close", () => {
      clients.delete(ws);
      console.log("❌ WebSocket client disconnected");
    });

    ws.on("message", (message) => {
      console.log("Received from client:", message);
    });
  });
}

// Function to broadcast backup updates to all connected clients
export function broadcastBackupUpdate(update) {
  if (!clients.size) return;
  const data = JSON.stringify({ type: "backup-update", payload: update });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}