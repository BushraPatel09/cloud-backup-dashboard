import path from "path";
import { Readable } from "stream";
import { BaseStorageProvider } from "./baseProvider.js";
import { getDriveClient } from "../driveOAuth.js";
import { getCachedFolderId, setCachedFolderId } from "../driveFolderCache.js";
import { DEFAULT_PROVIDER } from "./index.js";

async function ensureDriveFolder(drive, folderName, parentId = "root") {
    const cachedFolderId = getCachedFolderId(folderName, parentId);
    if (cachedFolderId) {
        return cachedFolderId;
    }

    const query =
        parentId === "root"
            ? `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
            : `'${parentId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    const existingFolders = await drive.files.list({
        q: query,
        fields: "files(id, name)",
        spaces: "drive"
    });

    if (existingFolders.data.files.length > 0) {
        const folderId = existingFolders.data.files[0].id;
        setCachedFolderId(folderName, parentId, folderId);
        return folderId;
    }

    const createdFolder = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            ...(parentId !== "root" ? { parents: [parentId] } : {})
        },
        fields: "id, name"
    });

    const folderId = createdFolder.data.id;
    setCachedFolderId(folderName, parentId, folderId);
    return folderId;
}

async function ensureFolderPath(drive, relativePath) {
    if (!relativePath) {
        return "root";
    }

    const pathParts = relativePath.split("/");
    pathParts.pop();

    if (pathParts.length === 0) {
        return "root";
    }

    let currentParentId = "root";

    for (const folderName of pathParts) {
        currentParentId = await ensureDriveFolder(drive, folderName, currentParentId);
    }

    return currentParentId;
}

export class GoogleDriveProvider extends BaseStorageProvider {
    constructor({ accessToken }) {
        super(DEFAULT_PROVIDER);
        this.accessToken = accessToken;
    }

    validateConfig() {
        if (!this.accessToken) {
            throw new Error("Google access token not found in session");
        }
    }

    getClient() {
        this.validateConfig();
        return getDriveClient(this.accessToken);
    }

    async uploadFile({ backupId, file, relativePath }) {
        const drive = this.getClient();
        const parentFolderId = await ensureFolderPath(drive, relativePath);
        const uploadedFile = await drive.files.create({
            requestBody: {
                name: path.basename(relativePath || file.originalname),
                ...(parentFolderId !== "root" ? { parents: [parentFolderId] } : {})
            },
            media: {
                mimeType: file.mimetype || "application/octet-stream",
                body: Readable.from(file.buffer)
            },
            fields: "id, name"
        });

        return {
            providerFileId: uploadedFile.data.id,
            storagePath: relativePath || file.originalname
        };
    }

    async downloadFile({ record, destinationPath }) {
        if (!record.driveFileId && !record.providerFileId) {
            throw new Error("Google Drive file id missing");
        }

        const drive = this.getClient();
        const response = await drive.files.get(
            {
                fileId: record.driveFileId || record.providerFileId,
                alt: "media"
            },
            { responseType: "stream" }
        );

        const fs = await import("fs");
        const dest = fs.createWriteStream(destinationPath);

        await new Promise((resolve, reject) => {
            response.data.pipe(dest).on("finish", resolve).on("error", reject);
        });
    }
}
