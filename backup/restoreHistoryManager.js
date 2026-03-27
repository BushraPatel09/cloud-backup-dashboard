import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "backup", "restoreHistory.json");

// Read history
export function getRestoreHistory() {
    try {
        const data = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(data || "[]");
    } catch (err) {
        console.error("Error reading restore history:", err);
        return [];
    }
}

// Save new restore record
export function addRestoreHistoryRecord(record) {
    try {
        const history = getRestoreHistory();
        history.push(record);

        fs.writeFileSync(filePath, JSON.stringify(history, null, 2));

        console.log("✅ Restore history saved");
    } catch (err) {
        console.error("Error saving restore history:", err);
    }
}

export function updateRestoreHistoryRecord(restoreId, updatedFields) {
    try {
        const history = getRestoreHistory();

        const updatedHistory = history.map((record) => {
            if (record.restoreId === restoreId) {
                return {
                    ...record,
                    ...updatedFields
                };
            }
            return record;
        });

        fs.writeFileSync(filePath, JSON.stringify(updatedHistory, null, 2));

        console.log("✅ Restore history updated");
    } catch (err) {
        console.error("Error updating restore history:", err);
    }
}