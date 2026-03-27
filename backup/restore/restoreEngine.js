import fs from "fs";
import path from "path";

import { readBackupHistory } from "../backupHistoryManager.js";
import { emitRestoreEvent } from "../../realtime/restoreSocketServer.js";
import { saveRestoreHistory } from "../history/restoreHistoryStore.js";
import { normalizeProviderName } from "../providers/index.js";
import { createStorageProvider } from "../providers/index.js";

let stopRestoreRequested = false;
let isRestoreRunning = false;

export function requestStopRestore() {
    stopRestoreRequested = true;
}

export function resetStopRestoreFlag() {
    stopRestoreRequested = false;
}

export function getRestoreStatus() {
    return {
        stopRestoreRequested,
        isRestoreRunning
    };
}

export async function restoreBackup(accessToken, backupId, restoreType = "full", filePath = "") {
    const restoreId = `restore_${Date.now()}`;
    try {
        
        resetStopRestoreFlag();
isRestoreRunning = true;

        const history = readBackupHistory();


        let filesToRestore = history.filter(
    record => record.backupId === backupId
);

if (restoreType === "file") {
    filesToRestore = filesToRestore.filter(
        record => record.relativePath === filePath
    );
}

console.log("🧪 restoreType in engine:", restoreType);
console.log("🧪 filePath in engine:", filePath);
console.log("🧪 filesToRestore count:", filesToRestore.length);
console.log("🧪 filesToRestore paths:", filesToRestore.map(file => file.relativePath));

if (filesToRestore.length === 0) {
    throw new Error(
        restoreType === "file"
            ? "No file found for the selected file restore"
            : "No files found for this backupId"
    );
}

const providerName = normalizeProviderName(filesToRestore[0]?.provider);
const hasMixedProviders = filesToRestore.some(
    file => normalizeProviderName(file.provider) !== providerName
);

if (hasMixedProviders) {
    throw new Error(`Backup ${backupId} contains mixed providers, restore cannot continue`);
}

const provider = createStorageProvider(providerName, {
    accessToken
});
provider.validateConfig();

        

        const restoreRoot = path.join(process.cwd(), "restored");

        if (!fs.existsSync(restoreRoot)) {
            fs.mkdirSync(restoreRoot);
        }

        for (let i = 0; i < filesToRestore.length; i++) {
    if (stopRestoreRequested) {
        isRestoreRunning = false;

        const progress = Math.round((i / filesToRestore.length) * 100);

        emitRestoreEvent({
            file: "",
            progress,
            stage: "stopped",
            status: "stopped"
        });

        return {
            success: false,
            stopped: true,
            restoreId,
            backupId,
            filesRestored: i,
            location: null,
            message: "Restore stopped by user"
        };
    }

    const file = filesToRestore[i];
            if (!file.driveFileId) {
                console.log("Drive file missing, will try archive restore:", file.fileName);
            }

            const localPath = path.join(restoreRoot, file.relativePath);

            const localDir = path.dirname(localPath);

            if (!fs.existsSync(localDir)) {
                fs.mkdirSync(localDir, { recursive: true });
            }

            try {
    await provider.downloadFile({
        record: file,
        destinationPath: localPath
    });

} catch (err) {
                console.log("Drive restore failed, trying archive:", file.relativePath);

                const archivePath = path.join(
                    process.cwd(),
                    "backup",
                    "archive",
                    backupId,
                    file.relativePath
                );

                if (!fs.existsSync(archivePath)) {
                    throw new Error("File not found in Drive or archive: " + file.relativePath);
                }

                const archiveDir = path.dirname(localPath);
                if (!fs.existsSync(archiveDir)) {
                    fs.mkdirSync(archiveDir, { recursive: true });
                }

                fs.copyFileSync(archivePath, localPath);
            }

            console.log("Restored:", file.relativePath);

            const progress = Math.round(((i + 1) / filesToRestore.length) * 100);

            emitRestoreEvent({
                file: file.relativePath,
                progress,
                stage: "restoring",
                status: progress === 100 ? "completed" : "running"
            });
        }
        isRestoreRunning = false;

        saveRestoreHistory({
    restoreId,
    backupId,
    restoreType,
    filesRestored: filesToRestore.length,
    restoredAt: new Date().toISOString(),
    restorePath: restoreRoot,
    validation: {
        status: "VALID"
    },
    trustScore: 100
});

        return {
            success: true,
            filesRestored: filesToRestore.length,
            location: restoreRoot
        };
    } catch (error) {
    isRestoreRunning = false;

    saveRestoreHistory({
            restoreId,
            backupId,
            restoreType,
            filesRestored: 0,
            restoredAt: new Date().toISOString(),
            restorePath: null,
            validation: {
                status: "CORRUPTED"
            },
            trustScore: 0
        });

        throw error;
    }
}