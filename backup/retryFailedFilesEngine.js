import fs from "fs";
import {
    addBackupHistoryRecord,
    getBackupProviderByBackupId,
    getFailedFilesByBackupId,
    markFailedFileAsRetried,
    updateFailedFileRetryAttempt
} from "./backupHistoryManager.js";
import { getArchivePath } from "./archiveManager.js";
import { createStorageProvider, getProviderOptionsFromRequest } from "./providers/index.js";

export async function retryFailedFiles(req, backupId) {
    if (!backupId) {
        throw new Error("backupId is required");
    }

    const failedRecords = getFailedFilesByBackupId(backupId);

    if (failedRecords.length === 0) {
        return {
            success: false,
            backupId,
            status: "no_failed_files",
            retryStatus: "retry_not_available",
            message: "No failed files found for retry",
            failedCount: 0,
            totalRetryFiles: 0,
            retriedCount: 0,
            retryableFiles: []
        };
    }

    const providerName = getBackupProviderByBackupId(backupId);
    const provider = createStorageProvider(providerName, getProviderOptionsFromRequest(req));
    provider.validateConfig();

    const retryableFiles = failedRecords.map((item) => ({
        fileName: item.fileName,
        relativePath: item.relativePath,
        size: item.size || 0
    }));

    let retriedCount = 0;
    const retryFailedAgain = [];

    for (const retryFile of retryableFiles) {
        try {
            const archiveFilePath = getArchivePath(backupId, retryFile.relativePath);

            if (!fs.existsSync(archiveFilePath)) {
                updateFailedFileRetryAttempt(
                    backupId,
                    retryFile.relativePath,
                    "Retry file not found in archive"
                );

                retryFailedAgain.push({
                    fileName: retryFile.fileName,
                    relativePath: retryFile.relativePath,
                    reason: "Retry file not found in archive"
                });
                continue;
            }

            const fileBuffer = fs.readFileSync(archiveFilePath);
            const uploadResult = await provider.uploadFile({
                backupId,
                file: {
                    originalname: retryFile.fileName,
                    mimetype: "application/octet-stream",
                    buffer: fileBuffer,
                    size: retryFile.size
                },
                relativePath: retryFile.relativePath
            });

            addBackupHistoryRecord({
                backupId,
                provider: providerName,
                fileName: retryFile.fileName,
                relativePath: retryFile.relativePath,
                size: retryFile.size,
                uploadedAt: new Date().toISOString(),
                status: "completed",
                providerFileId: uploadResult.providerFileId || null,
                driveFileId: providerName === "google" ? uploadResult.providerFileId || null : null,
                storagePath: uploadResult.storagePath || retryFile.relativePath
            });

            markFailedFileAsRetried(backupId, retryFile.relativePath);
            retriedCount++;
        } catch (error) {
            updateFailedFileRetryAttempt(
                backupId,
                retryFile.relativePath,
                error.message
            );

            retryFailedAgain.push({
                fileName: retryFile.fileName,
                relativePath: retryFile.relativePath,
                reason: error.message
            });
        }
    }

    return {
        success: retriedCount > 0,
        backupId,
        provider: providerName,
        status: retriedCount === retryableFiles.length ? "completed" : "completed_with_failures",
        retryStatus: retriedCount === retryableFiles.length ? "retry_completed" : "retry_partial",
        message:
            retriedCount === retryableFiles.length
                ? "All failed files retried successfully"
                : "Some failed files were retried successfully",
        failedCount: retryableFiles.length,
        totalRetryFiles: retryableFiles.length,
        retriedCount,
        retryFailedAgain,
        retryableFiles,
        retrySummary: {
            total: retryableFiles.length,
            succeeded: retriedCount,
            failedAgain: retryFailedAgain.length
        }
    };
}
