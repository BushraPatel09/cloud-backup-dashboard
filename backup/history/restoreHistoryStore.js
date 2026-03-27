import fs from "fs";

const HISTORY_PATH = "./backup/history/restoreHistory.json";

function ensureStore() {
  if (!fs.existsSync("./backup/history")) {
    fs.mkdirSync("./backup/history", { recursive: true });
  }

  if (!fs.existsSync(HISTORY_PATH)) {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify([]));
  }
}

export function saveRestoreHistory(record) {
  ensureStore();
  const data = JSON.parse(fs.readFileSync(HISTORY_PATH));
  data.push(record);
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(data, null, 2));
}

export function getRestoreHistory() {
  ensureStore();
  return JSON.parse(fs.readFileSync(HISTORY_PATH));
}

export function getRestoreByBackupId(backupId) {
  ensureStore();
  const data = JSON.parse(fs.readFileSync(HISTORY_PATH));
  return data.filter(r => r.backupId === backupId);
}

export function getRestoreByStatus(status) {
  ensureStore();
  const data = JSON.parse(fs.readFileSync(HISTORY_PATH));
  return data.filter(r => r.validation.status === status);
}