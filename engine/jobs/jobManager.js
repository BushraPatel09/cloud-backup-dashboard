const { scanDirectory } = require("../scanner");
const { initDB, readDB, writeDB } = require("../metadata/db");
const { createSnapshot, createBackupFile } = require("../metadata/models");
const path = require("path");

async function runBackupJob({ backupSetId, rootPath, provider }) {
    initDB();
    const db = readDB();

    console.log("🔄 Scanning files...");
    const files = await scanDirectory(rootPath);

    console.log("📸 Creating snapshot...");
    const snapshotId = `snap_${Date.now()}`;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    const snapshot = createSnapshot({
        id: snapshotId,
        backupSetId,
        totalFiles: files.length,
        totalSize
    });

    db.snapshots.push(snapshot);

    console.log("⚙️ Preparing backup files...");
    for (const file of files) {
        if (file.type === "file") {

            // Build relative path
            const relativePath = file.path.replace(rootPath, "");

            // Build storage path inside backups folder
            const remotePath = path.join(
                backupSetId,
                snapshotId,
                relativePath
            );

            // Create metadata record
            const backupFile = createBackupFile({
                id: `file_${Date.now()}_${Math.random()}`,
                snapshotId,
                path: file.path,
                size: file.size,
                hash: null,
                provider: provider.name,
                storagePath: remotePath
            });

            db.files.push(backupFile);

            // Upload to provider (REAL backup)
            await provider.upload(file.path, remotePath);
        }
    }

    writeDB(db);

    console.log("✅ Backup job completed");
    return snapshot;
}

module.exports = {
    runBackupJob
};