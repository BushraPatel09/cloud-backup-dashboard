import fs from "fs";
import path from "path";

const restoreHistoryPath = path.join(
  process.cwd(),
  "backup",
  "history",
  "restoreHistory.json"
);

// Read restore history
export function readRestoreHistory() {
  if (!fs.existsSync(restoreHistoryPath)) {
    fs.writeFileSync(
      restoreHistoryPath,
      JSON.stringify({ restoreJobs: [] }, null, 2)
    );
  }

  const data = fs.readFileSync(restoreHistoryPath, "utf-8");
  const parsed = JSON.parse(data);

  return parsed.restoreJobs || [];
}

// Save restore history
export function writeRestoreHistory(restoreJobs) {
  fs.writeFileSync(
    restoreHistoryPath,
    JSON.stringify({ restoreJobs }, null, 2)
  );
}

// Add new restore job
export function addRestoreJob(job) {
  const restoreJobs = readRestoreHistory();

  restoreJobs.unshift(job);

  writeRestoreHistory(restoreJobs);
}