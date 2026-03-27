import express from "express";
import { scanFolder } from "../backup/folderScanner.js";

const router = express.Router();

router.post("/scan-folder", (req, res) => {
    try {
        console.log("req.body =", req.body);

        if (!req.body || !req.body.folderPath) {
            return res.status(400).json({
                success: false,
                message: "folderPath is required"
            });
        }

        const { folderPath } = req.body;
        const result = scanFolder(folderPath);

        res.json({
            success: true,
            message: "Folder scanned successfully",
            ...result
        });
    } catch (error) {
        console.error("Scan folder error:", error.message);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

export default router;