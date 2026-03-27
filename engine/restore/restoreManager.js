const { emitRestoreEvent } = require("../realtime/restoreSocketServer");
const path = require("path");
const { readDB } = require("../metadata/db");
const LocalProvider = require("../providers/localProvider");

async function runRestoreJob({ snapshotId, restorePath }) {
    const db = readDB();

    console.log("🔍 Loading snapshot...");
    const snapshot = db.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) throw new Error("Snapshot not found");

    console.log("📄 Loading file mappings...");
    const files = db.files.filter(f => f.snapshotId === snapshotId);

    if (!files.length) {
        throw new Error("No files found for this snapshot");
    }

    const provider = new LocalProvider("storage");
    await provider.connect();

    console.log("♻️ Restoring files...");

    const totalFiles = files.length;
    let completedFiles = 0;

    for (const file of files) {

        if (!file.storagePath) {
            throw new Error(`❌ storagePath missing for file record: ${JSON.stringify(file)}`);
        }

        if (!file.path) {
            throw new Error(`❌ file.path missing in metadata: ${JSON.stringify(file)}`);
        }

        if (!restorePath) {
            throw new Error(`❌ restorePath not provided to restore job`);
        }

        const normalizedFilePath = file.path.replace(/\\/g, "/");

        const restoreFilePath = path.join(
            restorePath,
            normalizedFilePath
        );

        await provider.download(file.storagePath, restoreFilePath);

        completedFiles++;
        const percent = Math.floor((completedFiles / totalFiles) * 100);

        console.log(`📊 Restore Progress: ${percent}%`);

        // ✅ Emit progress ONLY
        emitRestoreEvent({
            event: "restoreProgress",
            snapshotId,
            percent,
            stage: "restoring",
            currentFile: file.path
        });
    }

    // ✅ Emit completion ONLY ONCE
    emitRestoreEvent({
        event: "restoreCompleted",
        snapshotId,
        percent: 100,
        stage: "completed"
    });

    console.log("✅ Restore completed");
}

module.exports = {
    runRestoreJob
};