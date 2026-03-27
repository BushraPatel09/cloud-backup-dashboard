import { broadcastBackupUpdate } from "../realtime/socketServer.js";
let stopBackupRequested = false;
let isBackupRunning = false;
export function requestStopBackup() {
    stopBackupRequested = true;
}

export function resetStopBackupFlag() {
    stopBackupRequested = false;
}

export function getStopBackupStatus() {
    return {

        stopBackupRequested,
        isBackupRunning
    };
}
export function startBackup() {
    resetStopBackupFlag();
    isBackupRunning = true;

    console.log("📦 Backup Engine Started");

    let percent = 0;

    const interval = setInterval(() => {
        if (stopBackupRequested) {
            clearInterval(interval);
            isBackupRunning = false;

            const stoppedUpdate = {
                file: "example.txt",
                progress: percent,
                stage: "stopped",
                status: "stopped"
            };

            console.log("🛑 Backup Stopped:", stoppedUpdate);
            broadcastBackupUpdate(stoppedUpdate);
            return;
        }

        percent += 10;

        const update = {
            file: "example.txt",
            progress: percent,
            stage: "uploading",
            status: percent >= 100 ? "completed" : "running"
        };

        console.log("Backup Update:", update);
        broadcastBackupUpdate(update);

        if (percent >= 100) {
            clearInterval(interval);
            isBackupRunning = false;
        }

    }, 1000);
}