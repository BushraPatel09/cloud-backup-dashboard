import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const overviewStatsPath = path.join(__dirname, "overviewStats.json");

export function readOverviewStats() {
    try {
        if (!fs.existsSync(overviewStatsPath)) {
            const defaultStats = {
                totalBackupJobs: 0,
                successfulBackupJobs: 0,
                failedBackupJobs: 0,
                totalRestoreJobs: 0,
                successfulRestoreJobs: 0,
                totalBackedUpFiles: 0
            };

            fs.writeFileSync(
                overviewStatsPath,
                JSON.stringify(defaultStats, null, 2),
                "utf-8"
            );

            return defaultStats;
        }

        const raw = fs.readFileSync(overviewStatsPath, "utf-8");

        return raw
            ? JSON.parse(raw)
            : {
                totalBackupJobs: 0,
                successfulBackupJobs: 0,
                failedBackupJobs: 0,
                totalRestoreJobs: 0,
                successfulRestoreJobs: 0,
                totalBackedUpFiles: 0
            };
    } catch (error) {
        console.error("Failed to read overview stats:", error.message);
        return {
            totalBackupJobs: 0,
            successfulBackupJobs: 0,
            failedBackupJobs: 0,
            totalRestoreJobs: 0,
            successfulRestoreJobs: 0,
            totalBackedUpFiles: 0
        };
    }
}

export function writeOverviewStats(stats) {
    try {
        fs.writeFileSync(
            overviewStatsPath,
            JSON.stringify(stats, null, 2),
            "utf-8"
        );
    } catch (error) {
        console.error("Failed to write overview stats:", error.message);
    }
}