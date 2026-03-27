import { emitRestoreEvent } from "../../realtime/restoreSocketServer.js";
import { generateFileHash } from "./hashEngine.js";
import { validateRestore } from "./validationEngine.js";
import { buildRestoreStatus } from "./statusEngine.js";
import { generateValidationReport } from "./reportEngine.js";
import { logIntegrity } from "./integrityLogger.js";
import { calculateTrustScore } from "./trustLayer.js";
import { saveRestoreHistory } from "../history/restoreHistoryStore.js"; // history layer

/**
 * Core restore flow with validation + trust + logging + history
 */
export async function restoreWithValidation({
  restoreFunction,        // your existing restore logic function
  restoredFilePath,       // path where file is restored
  backupHash,             // hash stored in DB/metadata
  file,                   // filename
  backupId                // backup reference id
}) {

  // 🟢 STEP 0 — Restore file physically
  const restoreResult = await restoreFunction();

  // 🟢 STEP 1 — Hash restored file
  const restoredHash = await generateFileHash(restoredFilePath);

  // 🟢 STEP 2 — Validate integrity
  const validation = validateRestore({
    restoredHash,
    storedHash: backupHash
  });

  // 🟢 STEP 3 — Build status
  const statusObj = buildRestoreStatus(validation);

  // 🟢 STEP 4 — Build report
  const report = generateValidationReport({
    file,
    backupId,
    restoredHash,
    storedHash: backupHash,
    status: validation.status,
    reason: validation.reason
  });

  // 🟢 STEP 5 — Integrity logging
  logIntegrity(report);

  // 🟢 STEP 6 — Trust score
  const trustScore = calculateTrustScore(validation.status);

  // 🟢 STEP 7 — Save restore history
  saveRestoreHistory({
    backupId,
    file,
    restorePath: restoredFilePath,
    validation,
    status: statusObj,
    trustScore,
    report,
    restoredAt: new Date().toISOString()
  });

  // 🟢 FINAL RESPONSE
  return {
    restore: restoreResult,
    validation,
    status: statusObj,
    trustScore,
    report
  };
}
  // 🟢 STEP 8 — Emit real-time restore event
  emitRestoreEvent({
    backupId,
    file,
    validation,
    status: statusObj,
    trustScore,
    restoredAt: new Date().toISOString()
  });