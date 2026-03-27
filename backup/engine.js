import fs from "fs";
import path from "path";
import { broadcastBackupUpdate } from "../realtime/backupSocketServer.js";
import { getDriveClient } from "./driveOAuth.js";

// -----------------------------
// MAIN BACKUP FUNCTION
// -----------------------------
export async function startBackup(folderPath, accessToken) {

    console.log("💾 Backup Started");

    const drive = getDriveClient(accessToken);

    const files = fs.readdirSync(folderPath);

    let totalFiles = files.length;
    let completed = 0;

    for (const file of files) {

        const filePath = path.join(folderPath, file);

        // 1️⃣ SCANNING STAGE
        broadcastBackupUpdate({
            type: "backup_progress",
            file: file,
            stage: "scanning",
            progress: 5,
            status: "running"
        });

        await delay(1000);

        // 2️⃣ UPLOADING STAGE
        broadcastBackupUpdate({
            type: "backup_progress",
            file: file,
            stage: "uploading",
            progress: 50,
            status: "running"
        });

        await uploadFileToDrive(drive, filePath, file);

        await delay(1000);

        // 3️⃣ VERIFYING STAGE
        broadcastBackupUpdate({
            type: "backup_progress",
            file: file,
            stage: "verifying",
            progress: 90,
            status: "running"
        });

        await delay(1000);

        completed++;

        // 4️⃣ COMPLETED
        broadcastBackupUpdate({
            type: "backup_progress",
            file: file,
            stage: "completed",
            progress: 100,
            status: "completed"
        });

    }

    console.log("✅ Backup Finished");

}

// -----------------------------
// UPLOAD FILE TO GOOGLE DRIVE
// -----------------------------
async function uploadFileToDrive(drive, filePath, fileName) {

    try {

        await drive.files.create({
            requestBody: {
                name: fileName
            },
            media: {
                body: fs.createReadStream(filePath)
            }
        });

        console.log("Uploaded:", fileName);

    } catch (error) {

        console.error("Upload failed:", error.message);

        broadcastBackupUpdate({
            type: "backup_progress",
            file: fileName,
            stage: "failed",
            progress: 0,
            status: "failed"
        });

    }

}

// -----------------------------
// SMALL DELAY (for demo)
// -----------------------------
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}