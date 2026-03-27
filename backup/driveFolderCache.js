const folderCache = new Map();

function makeFolderCacheKey(folderName, parentId = "root") {
    return `${parentId}::${folderName}`;
}

function getCachedFolderId(folderName, parentId = "root") {
    const key = makeFolderCacheKey(folderName, parentId);
    return folderCache.get(key) || null;
}

function setCachedFolderId(folderName, parentId = "root", folderId) {
    const key = makeFolderCacheKey(folderName, parentId);
    folderCache.set(key, folderId);
}

function clearFolderCache() {
    folderCache.clear();
}

function getFolderCacheSize() {
    return folderCache.size;
}

export {
    getCachedFolderId,
    setCachedFolderId,
    clearFolderCache,
    getFolderCacheSize
};