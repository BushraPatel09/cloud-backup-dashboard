// Core metadata models

function createBackupSet({ id, name, rootPath }) {
    return {
        id,
        name,
        rootPath,
        createdAt: Date.now()
    };
}

function createSnapshot({ id, backupSetId, totalFiles, totalSize }) {
    return {
        id,
        backupSetId,
        timestamp: Date.now(),
        totalFiles,
        totalSize
    };
}

function createBackupFile({ id, snapshotId, path, size, hash, provider, storagePath }) {
    return {
        id,
        snapshotId,
        path,
        size,
        hash,
        provider,
        storagePath
    };
}

module.exports = {
    createBackupSet,
    createSnapshot,
    createBackupFile
};