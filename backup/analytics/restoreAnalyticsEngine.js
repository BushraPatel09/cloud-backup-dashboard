import { getRestoreHistory } from "../history/restoreHistoryStore.js";

export function buildRestoreAnalytics() {
  const history = getRestoreHistory();

  const total = history.length;

  const valid = history.filter(r => r.validation.status === "VALID").length;
  const corrupted = history.filter(r => r.validation.status === "CORRUPTED").length;
  const unknown = history.filter(r => r.validation.status === "UNKNOWN").length;

  const avgTrust =
    total === 0
      ? 0
      : Math.round(
          history.reduce((sum, r) => sum + (r.trustScore || 0), 0) / total
        );

  const successRate = total === 0 ? 0 : Math.round((valid / total) * 100);
  const corruptionRate = total === 0 ? 0 : Math.round((corrupted / total) * 100);

  const lastRestore = total === 0 ? null : history[history.length - 1];

  return {
    totals: {
      totalRestores: total,
      validRestores: valid,
      corruptedRestores: corrupted,
      unknownRestores: unknown
    },
    trust: {
      averageTrustScore: avgTrust
    },
    health: {
      successRatePercent: successRate,
      corruptionRatePercent: corruptionRate,
      systemHealth:
        successRate > 90
          ? "HEALTHY"
          : successRate > 70
          ? "WARNING"
          : "CRITICAL"
    },
    activity: {
      lastRestoreTime: lastRestore?.restoredAt || null,
      lastRestoreStatus: lastRestore?.validation?.status || null,
      lastRestoreTrust: lastRestore?.trustScore || null
    }
  };
}