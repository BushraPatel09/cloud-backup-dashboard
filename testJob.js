const { runBackupJob } = require("./engine/jobs/jobManager");

const fakeProvider = {
    name: "local-fake",
    upload: async (filePath) => {
        console.log("⬆️ Uploading:", filePath);
    }
};

(async () => {
    const snapshot = await runBackupJob({
        backupSetId: "set_1",
        rootPath: "./testFolder",
        provider: fakeProvider
    });

    console.log("Snapshot created:", snapshot);
})();