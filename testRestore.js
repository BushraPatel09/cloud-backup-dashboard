const { runRestoreJob } = require("./engine/restore/restoreManager");
const { readDB } = require("./engine/metadata/db");

const db = readDB();

if (!db.snapshots.length) {
    console.log("❌ No snapshots found");
    process.exit(1);
}

// pick latest snapshot
const latestSnapshot = db.snapshots[db.snapshots.length - 1];

console.log("🆔 Restoring snapshot:", latestSnapshot.id);

runRestoreJob({
    snapshotId: latestSnapshot.id,
    restorePath: "./restored"
});