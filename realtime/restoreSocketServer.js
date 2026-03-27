import { broadcastBackupUpdate } from "./socketServer.js";

export function emitRestoreEvent(data) {
    broadcastBackupUpdate({
        type: "restore-update",
        payload: data
    });
}