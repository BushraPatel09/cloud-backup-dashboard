const LocalProvider = require("./engine/providers/localProvider");
const { runBackupJob } = require("./engine/jobs/backupJob");
const { readDB } = require("./engine/metadata/db");

(async () => {
    const provider = new LocalProvider("storage");
    await provider.connect();

    const db = readDB();
    const backupSet = db.backupSets[0];

    const snapshot = await runBackupJob({
        backupSetId: backupSet.id,
        rootPath: backupSet.rootPath,
        provider
    });

    console.log("✅ Real backup done:", snapshot);
})();