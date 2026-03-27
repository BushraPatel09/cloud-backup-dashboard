const fs = require("fs");
const path = require("path");

/**
 * Recursively scan directory and return file structure
 */
async function scanDirectory(rootPath) {
    const results = [];

    async function walk(currentPath) {
        const items = await fs.promises.readdir(currentPath, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(currentPath, item.name);
            const stats = await fs.promises.stat(fullPath);

            const node = {
                path: fullPath,
                name: item.name,
                type: item.isDirectory() ? "folder" : "file",
                size: item.isFile() ? stats.size : 0,
                lastModified: stats.mtimeMs
            };

            results.push(node);

            // If folder → go deeper (recursion)
            if (item.isDirectory()) {
                await walk(fullPath);
            }
        }
    }

    await walk(rootPath);
    return results;
}

module.exports = {
    scanDirectory
};