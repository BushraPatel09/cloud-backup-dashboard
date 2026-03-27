export function validateRestore({ restoredHash, storedHash }) {
  if (!storedHash || !restoredHash) {
    return {
      status: "UNKNOWN",
      reason: "Missing hash data"
    };
  }

  if (restoredHash === storedHash) {
    return {
      status: "VALID",
      reason: "Integrity verified"
    };
  }

  return {
    status: "CORRUPTED",
    reason: "Hash mismatch detected"
  };
}