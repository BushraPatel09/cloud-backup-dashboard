import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// __dirname fix for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const historyFilePath = path.join(__dirname, "backupHistory.json");

// Read backup history
export function readBackupHistory() {
    try {
        if (!fs.existsSync(historyFilePath)) {
            fs.writeFileSync(historyFilePath, "[]", "utf-8");
        }

        const rawData = fs.readFileSync(historyFilePath, "utf-8");
        return JSON.parse(rawData);
    } catch (error) {
        console.error("Error reading backup history:", error.message);
        return [];
    }
}

// Write full backup history
export function writeBackupHistory(historyData) {
    try {
        fs.writeFileSync(
            historyFilePath,
            JSON.stringify(historyData, null, 2),
            "utf-8"
        );
    } catch (error) {
        console.error("Error writing backup history:", error.message);
    }
}

// Add one backup record
export function addBackupHistoryRecord(record) {
    try {
        const history = readBackupHistory();

        const newRecord = {
            failedFiles: [],
            provider: "google",
            ...record
        };

        history.unshift(newRecord); // newest first
        writeBackupHistory(history);

    } catch (error) {
        console.error("Error adding backup history record:", error.message);
    }
}

export function getBackupHistoryByBackupId(backupId) {
    try {
        const history = readBackupHistory();
        return history.filter((item) => item.backupId === backupId);
    } catch (error) {
        console.error("Error getting backup history by backupId:", error.message);
        return [];
    }
}
export function getFailedFilesByBackupId(backupId) {
    try {
        const history = readBackupHistory();

        return history.filter(
            (item) =>
                item.backupId === backupId &&
                item.status === "failed"
        );
    } catch (error) {
        console.error("Error getting failed files by backupId:", error.message);
        return [];
    }
}
export function hasFailedFilesForRetry(backupId) {
    try {
        const failedFiles = getFailedFilesByBackupId(backupId);
        return failedFiles.length > 0;
    } catch (error) {
        console.error("Error checking failed files for retry:", error.message);
        return false;
    }
}
export function getRetryableFailedFilesByBackupId(backupId) {
    try {
        const failedFiles = getFailedFilesByBackupId(backupId);

        return failedFiles.map((item) => ({
            fileName: item.fileName,
            relativePath: item.relativePath,
            size: item.size || 0
        }));
    } catch (error) {
        console.error("Error getting retryable failed files:", error.message);
        return [];
    }
}
export function markFailedFileAsRetried(backupId, relativePath) {
    try {
        const history = readBackupHistory();

        const updatedHistory = history.map((item) => {
            if (
                item.backupId === backupId &&
                item.relativePath === relativePath &&
                item.status === "failed"
            ) {
                return {
                    ...item,
                    status: "retried",
                    retriedAt: new Date().toISOString()
                };
            }

            return item;
        });

        writeBackupHistory(updatedHistory);
    } catch (error) {
        console.error("Error marking failed file as retried:", error.message);
    }
}
export function updateFailedFileRetryAttempt(backupId, relativePath, reason) {
    try {
        const history = readBackupHistory();

        const updatedHistory = history.map((item) => {
            if (
                item.backupId === backupId &&
                item.relativePath === relativePath &&
                item.status === "failed"
            ) {
                return {
                    ...item,
                    lastRetryAt: new Date().toISOString(),
                    lastRetryReason: reason || "Retry failed again"
                };
            }

            return item;
        });

        writeBackupHistory(updatedHistory);
    } catch (error) {
        console.error("Error updating failed file retry attempt:", error.message);
    }
}

export function getBackupRecordsByBackupId(backupId) {
    return getBackupHistoryByBackupId(backupId);
}

export function getBackupProviderByBackupId(backupId) {
    try {
        const history = readBackupHistory();
        const matchingRecord = history.find((item) => item.backupId === backupId);
        return matchingRecord?.provider || "google";
    } catch (error) {
        console.error("Error getting backup provider by backupId:", error.message);
        return "google";
    }
}

export function getCompletedBackupByRelativePath(relativePath) {
    try {
        const history = readBackupHistory();

        return history.find(
            (item) =>
                item.relativePath === relativePath &&
                item.status === "completed"
        );
    } catch (error) {
        console.error("Error finding backup by relative path:", error.message);
        return null;
    }
}