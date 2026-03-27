import express from "express";
import {
  getRestoreHistory,
  getRestoreByBackupId,
  getRestoreByStatus
} from "../backup/history/restoreHistoryStore.js";

const router = express.Router();

// 🔹 All restore history
router.get("/history", (req, res) => {
  const data = getRestoreHistory();
  res.json({
    success: true,
    total: data.length,
    data
  });
});

// 🔹 By backupId
router.get("/history/:backupId", (req, res) => {
  const { backupId } = req.params;
  const data = getRestoreByBackupId(backupId);

  res.json({
    success: true,
    total: data.length,
    data
  });
});

// 🔹 By validation status
router.get("/history/status/:status", (req, res) => {
  const { status } = req.params.toUpperCase();
  const data = getRestoreByStatus(status);

  res.json({
    success: true,
    total: data.length,
    data
  });
});

export default router;