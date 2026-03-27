import fs from "fs";
import path from "path";
import mime from "mime-types";
import { getDriveClient } from "./driveOAuth.js";

async function findFolderByName(drive, folderName, parentId = null) {
    let query = `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    if (parentId) {
        query += ` and '${parentId}' in parents`;
    }

    const response = await drive.files.list({
        q: query,
        fields: "files(id, name)",
        spaces: "drive"
    });

    return response.data.files[0] || null;
}

export async function ensureDriveFolder(accessToken, folderName, parentId = null) {
    if (!accessToken) {
        throw new Error("Google access token is required");
    }

    const drive = getDriveClient(accessToken);

    const existingFolder = await findFolderByName(drive, folderName, parentId);

    if (existingFolder) {
        return existingFolder;
    }

    const createdFolder = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: parentId ? [parentId] : undefined
        },
        fields: "id, name"
    });

    return createdFolder.data;
}

export async function uploadFileToDrive(accessToken, filePath, fileName, parentId = null) {
    if (!accessToken) {
        throw new Error("Google access token is required");
    }

    if (!filePath) {
        throw new Error("filePath is required");
    }

    if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
    }

    const drive = getDriveClient(accessToken);
    const resolvedName = fileName || path.basename(filePath);
    const mimeType = mime.lookup(filePath) || "application/octet-stream";

    const response = await drive.files.create({
        requestBody: {
            name: resolvedName,
            parents: parentId ? [parentId] : undefined
        },
        media: {
            mimeType,
            body: fs.createReadStream(filePath)
        },
        fields: "id, name, webViewLink"
    });

    return response.data;
}