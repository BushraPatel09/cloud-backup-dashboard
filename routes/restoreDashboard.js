import express from "express";
import { buildRestoreAnalytics } from "../backup/analytics/restoreAnalyticsEngine.js";
import { getRestoreHistory } from "../backup/history/restoreHistoryStore.js";

const router = express.Router();

router.get("/dashboard", (req, res) => {
  const analytics = buildRestoreAnalytics();
  const history = getRestoreHistory();

  const riskLevel =
    analytics.health.systemHealth === "HEALTHY"
      ? "LOW"
      : analytics.health.systemHealth === "WARNING"
      ? "MEDIUM"
      : "HIGH";

  res.json({
    success: true,
    dashboard: {
      analytics,
      riskLevel,
      liveStatus: {
        restoreEngine: "ACTIVE",
        validationEngine: "ACTIVE",
        trustEngine: "ACTIVE",
        integrityEngine: "ACTIVE",
        historyRecords: history.length
      }
    }
  });
});

export default router;