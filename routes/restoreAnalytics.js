import express from "express";
import { buildRestoreAnalytics } from "../backup/analytics/restoreAnalyticsEngine.js";

const router = express.Router();

router.get("/analytics", (req, res) => {
  const analytics = buildRestoreAnalytics();

  res.json({
    success: true,
    analytics
  });
});

export default router;