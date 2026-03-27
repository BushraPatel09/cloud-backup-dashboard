const { initDB, readDB, writeDB } = require("./engine/metadata/db");
const { createBackupSet } = require("./engine/metadata/models");

initDB();

const db = readDB();

const backupSet = createBackupSet({
    id: "set_1",
    name: "Test Backup",
    rootPath: "./testFolder"
});

db.backupSets.push(backupSet);
writeDB(db);

console.log("Saved:", backupSet);