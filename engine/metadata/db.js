const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "db.json");

function initDB() {
    if (!fs.existsSync(DB_PATH)) {
        const initData = {
            backupSets: [],
            snapshots: [],
            files: []
        };
        fs.writeFileSync(DB_PATH, JSON.stringify(initData, null, 2));
    }
}

function readDB() {
    initDB();
    return JSON.parse(fs.readFileSync(DB_PATH));
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
    initDB,
    readDB,
    writeDB
};