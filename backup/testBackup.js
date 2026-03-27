import { broadcastBackupUpdate } from "../realtime/backupSocketServer.js";

export function startTestBackup() {

    console.log("📦 Test Backup Started");

    const steps = [
        { progress: 10, stage: "scanning", status: "running" },
        { progress: 25, stage: "scanning", status: "running" },
        { progress: 45, stage: "uploading", status: "running" },
        { progress: 70, stage: "uploading", status: "running" },
        { progress: 90, stage: "verifying", status: "running" },
        { progress: 100, stage: "completed", status: "completed" }
    ];

    let index = 0;

    const interval = setInterval(() => {

        const update = {
            file: "test-file.zip",
            progress: steps[index].progress,
            stage: steps[index].stage,
            status: steps[index].status
        };

        console.log("Backup Update:", update);

        broadcastBackupUpdate({
            type: "backup",
            data: update
        });

        index++;

        if (index >= steps.length) {
            clearInterval(interval);
        }

    }, 2000);

}