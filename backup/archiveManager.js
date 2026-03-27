import fs from "fs";
import path from "path";

export const archiveRoot = path.join(process.cwd(), "backup", "archive");

export function ensureArchiveFile(backupId, relativePath, file) {
    const archivePath = path.join(archiveRoot, backupId, relativePath || file.originalname);
    const archiveDir = path.dirname(archivePath);

    if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
    }

    fs.writeFileSync(archivePath, file.buffer);
    return archivePath;
}

export function getArchivePath(backupId, relativePath) {
    return path.join(archiveRoot, backupId, relativePath);
}
