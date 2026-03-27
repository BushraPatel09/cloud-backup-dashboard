import fs from "fs";

export function logIntegrity(report) {
  const log = JSON.stringify(report, null, 2) + "\n";
  fs.appendFileSync("./backup/logs/integrity.log", log);
}