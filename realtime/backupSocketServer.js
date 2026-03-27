import { WebSocketServer } from "ws";

let backupClients = [];

export function initBackupSocket(server) {

    const wss = new WebSocketServer({ server });

    wss.on("connection", (ws) => {

        console.log("📦 Backup dashboard connected");

        backupClients.push(ws);

        ws.on("close", () => {
            backupClients = backupClients.filter(c => c !== ws);
        });

    });

}

export function broadcastBackupUpdate(data) {

    backupClients.forEach(client => {

        if (client.readyState === 1) {
            client.send(JSON.stringify(data));
        }

    });

}