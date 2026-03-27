export function buildRestoreStatus(validationResult) {
  return {
    status: validationResult.status,
    verified: validationResult.status === "VALID",
    timestamp: Date.now()
  };
}