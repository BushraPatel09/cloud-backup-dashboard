export function calculateTrustScore(status) {
  if (status === "VALID") return 100;
  if (status === "UNKNOWN") return 40;
  if (status === "CORRUPTED") return 0;
}