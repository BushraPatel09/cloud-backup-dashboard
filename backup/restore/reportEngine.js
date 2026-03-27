export function generateValidationReport(data) {
  return {
    file: data.file,
    backupId: data.backupId,
    restoredHash: data.restoredHash,
    storedHash: data.storedHash,
    status: data.status,
    reason: data.reason,
    verifiedAt: new Date().toISOString()
  };
}