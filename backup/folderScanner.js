// backup/folderScanner.js
import fs from "fs";
import path from "path";

function scanFolderRecursive(folderPath, basePath = folderPath, collectedFiles = []) {
  const items = fs.readdirSync(folderPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(folderPath, item.name);

    if (item.isDirectory()) {
      scanFolderRecursive(fullPath, basePath, collectedFiles);
    } else if (item.isFile()) {
      const stats = fs.statSync(fullPath);

      collectedFiles.push({
        name: item.name,
        path: fullPath,
        relativePath: path.relative(basePath, fullPath).replace(/\\/g, "/"),
        size: stats.size
      });
    }
  }

  return collectedFiles;
}

export function scanFolder(folderPath) {
  if (!folderPath) {
    throw new Error("Folder path is required");
  }

  if (!fs.existsSync(folderPath)) {
    throw new Error("Folder does not exist");
  }

  const stats = fs.statSync(folderPath);

  if (!stats.isDirectory()) {
    throw new Error("Provided path is not a folder");
  }

  const files = scanFolderRecursive(folderPath);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return {
    totalFiles: files.length,
    totalSize,
    files
  };
}