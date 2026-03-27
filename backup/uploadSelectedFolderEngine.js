import fs from "fs";
import path from "path";
import {
    addBackupHistoryRecord,
    getBackupHistoryByBackupId,
    getCompletedBackupByRelativePath
} from "./backupHistoryManager.js";
import { broadcastBackupUpdate } from "../realtime/socketServer.js";
import { ensureArchiveFile, archiveRoot } from "./archiveManager.js";
import {
    createStorageProvider,
    getProviderOptionsFromRequest,
    normalizeProviderName
} from "./providers/index.js";
import { readOverviewStats, writeOverviewStats } from "./overviewStatsManager.js";


let stopFolderBackupRequested = false;
let isFolderBackupRunning = false;

export function requestStopFolderBackup() {
    stopFolderBackupRequested = true;
}

export function resetStopFolderBackupFlag() {
    stopFolderBackupRequested = false;
}

export function getFolderBackupStatus() {
    return {
        stopFolderBackupRequested,
        isFolderBackupRunning
    };
}

export async function uploadSelectedFolder(req, files, relativePaths, existingBackupId = null, providerName = null) {
    if (!files || files.length === 0) {
        throw new Error("No files received");
    }

    resetStopFolderBackupFlag();
    isFolderBackupRunning = true;

    

    const totalFiles = files.length;
    const backupId = existingBackupId || `backup_${Date.now()}`;
    const normalizedProvider = normalizeProviderName(providerName);

    const provider = createStorageProvider(
    normalizedProvider,
    getProviderOptionsFromRequest(req, normalizedProvider)
);
provider.validateConfig();

    const existingFiles = getBackupHistoryByBackupId(backupId);
    const existingProvider = existingFiles[0]?.provider;

    if (existingProvider && existingProvider !== normalizedProvider) {
        throw new Error(`Backup ${backupId} already belongs to provider ${existingProvider}`);
    }

    const uploadedFileSet = new Set(existingFiles.map((f) => f.relativePath));
    let uploadedCount = 0;
    let skippedCount = 0;
    const failedFiles = [];
    const snapshotDir = path.join(archiveRoot, backupId);

    if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
    }

    for (let i = 0; i < totalFiles; i++) {
        if (stopFolderBackupRequested) {
            isFolderBackupRunning = false;

            const progress = Math.round((i / totalFiles) * 100);

            broadcastBackupUpdate({
                file: "",
                progress,
                stage: "stopped",
                status: "stopped"
            });

            return {
                success: false,
                stopped: true,
                backupId,
                provider: normalizedProvider,
                totalFiles,
                uploadedCount,
                skippedCount,
                message: "Backup stopped by user"
            };
        }

        const file = files[i];
        const relativePath = Array.isArray(relativePaths)
            ? relativePaths[i]
            : relativePaths;
        const resolvedRelativePath = relativePath || file.originalname;

        const existingCompletedBackup = getCompletedBackupByRelativePath(resolvedRelativePath);

        if (uploadedFileSet.has(resolvedRelativePath) || existingCompletedBackup) {
            skippedCount++;

            const progress = Math.round(((i + 1) / totalFiles) * 100);
            broadcastBackupUpdate({
                file: resolvedRelativePath,
                progress,
                stage: "already backed up",
                status: "skipped"
            });

            continue;
        }

        ensureArchiveFile(backupId, resolvedRelativePath, file);

        try {
            const uploadResult = await provider.uploadFile({
                backupId,
                file,
                relativePath: resolvedRelativePath
            });

            addBackupHistoryRecord({
                backupId,
                provider: normalizedProvider,
                fileName: file.originalname,
                relativePath: resolvedRelativePath,
                size: file.size,
                uploadedAt: new Date().toISOString(),
                status: "completed",
                providerFileId: uploadResult.providerFileId || null,
                driveFileId: normalizedProvider === "google" ? uploadResult.providerFileId || null : null,
                storagePath: uploadResult.storagePath || resolvedRelativePath
            });

            uploadedCount++;
        } catch (error) {
            failedFiles.push({
                fileName: file.originalname,
                relativePath: resolvedRelativePath,
                reason: error.message
            });

            addBackupHistoryRecord({
                backupId,
                provider: normalizedProvider,
                fileName: file.originalname,
                relativePath: resolvedRelativePath,
                size: file.size,
                uploadedAt: new Date().toISOString(),
                status: "failed",
                reason: error.message,
                storagePath: normalizedProvider === "google" ? resolvedRelativePath : `${backupId}/${resolvedRelativePath}`.replace(/\\/g, "/")
            });
        }

        const progress = Math.round(((i + 1) / totalFiles) * 100);

        broadcastBackupUpdate({
            file: resolvedRelativePath,
            progress,
            stage: "uploading",
            status: "running"
        });
    }

    isFolderBackupRunning = false;

    const overviewStats = readOverviewStats();

    overviewStats.totalBackupJobs += 1;
    overviewStats.totalBackedUpFiles += uploadedCount;

    if (failedFiles.length === 0) {
        overviewStats.successfulBackupJobs += 1;
    } else {
        overviewStats.failedBackupJobs += 1;
    }

    writeOverviewStats(overviewStats);

    broadcastBackupUpdate({
        file: "",
        progress: 100,
        stage: "completed",
        status: "completed",
        totalFiles,
        uploadedCount,
        skippedCount
    });

    return {
        success: failedFiles.length === 0,
        backupId,
        provider: normalizedProvider,
        totalFiles,
        uploadedCount,
        skippedCount,
        failedFiles,
        status: failedFiles.length === 0 ? "completed" : "completed_with_failures"
    };
}
