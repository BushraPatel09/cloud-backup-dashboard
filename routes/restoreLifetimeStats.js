import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

// __dirname fix for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Restore history file path
const restoreHistoryFilePath = path.join(__dirname, "..", "backup", "restoreHistory.json");

// GET /api/restore/lifetime-stats
router.get("/api/restore/lifetime-stats", (req, res) => {
    try {
        // If file does not exist, create empty array file
        if (!fs.existsSync(restoreHistoryFilePath)) {
            fs.writeFileSync(restoreHistoryFilePath, "[]", "utf-8");
        }

        const rawData = fs.readFileSync(restoreHistoryFilePath, "utf-8");
        const restoreHistory = rawData ? JSON.parse(rawData) : [];

        const totalRestores = restoreHistory.length;

        const successfulRestores = restoreHistory.filter(
            (item) => item.status === "completed"
        ).length;

        const failedRestores = restoreHistory.filter(
            (item) => item.status === "failed"
        ).length;

        const totalFilesRestored = restoreHistory.reduce((sum, item) => {
            return sum + (Number(item.filesRestored) || 0);
        }, 0);

        res.json({
            success: true,
            stats: {
                totalRestores,
                successfulRestores,
                failedRestores,
                totalFilesRestored
            }
        });
    } catch (error) {
        console.error("Restore lifetime stats error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load restore lifetime stats"
        });
    }
});

export default router;