// backup/workers/googleDriveWorker.js

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

// -------------------------
// DRIVE CLIENT BUILDER
// -------------------------
function getDriveClient(accessToken) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.drive({
    version: "v3",
    auth: oauth2Client
  });
}

// -------------------------
// FOLDER UTIL
// -------------------------
async function getOrCreateFolder(drive, folderName, parentId = null) {
  const q = parentId
    ? `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
    spaces: "drive"
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const fileMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: parentId ? [parentId] : []
  };

  const folder = await drive.files.create({
    resource: fileMetadata,
    fields: "id"
  });

  return folder.data.id;
}

// -------------------------
// FILE UPLOADER
// -------------------------
async function uploadFile(drive, localFilePath, parentFolderId) {
  const fileName = path.basename(localFilePath);

  const fileMetadata = {
    name: fileName,
    parents: [parentFolderId]
  };

  const media = {
    mimeType: "application/octet-stream",
    body: fs.createReadStream(localFilePath)
  };

  const res = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: "id, name, size"
  });

  return res.data;
}

// -------------------------
// DIRECTORY WALKER
// -------------------------
function walkDirectory(dirPath) {
  let results = [];

  const list = fs.readdirSync(dirPath);
  list.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat && stat.isDirectory()) {
      results = results.concat(walkDirectory(fullPath));
    } else {
      results.push(fullPath);
    }
  });

  return results;
}

// -------------------------
// MAIN EXECUTION FUNCTION
// -------------------------
async function executeGoogleDriveBackup({
  accessToken,
  sourcePath,
  backupRootFolder = "nilmay_backups",
  backupSessionId
}) {
  const drive = getDriveClient(accessToken);

  // 1. Root backup folder
  const rootFolderId = await getOrCreateFolder(drive, backupRootFolder);

  // 2. Session folder
  const sessionFolderId = await getOrCreateFolder(
    drive,
    backupSessionId,
    rootFolderId
  );

  // 3. Collect files
  const files = walkDirectory(sourcePath);

  if (files.length === 0) {
    throw new Error("Source folder is empty");
  }

  const uploadedFiles = [];

  // 4. Upload files
  for (const filePath of files) {
    const result = await uploadFile(drive, filePath, sessionFolderId);

    uploadedFiles.push({
      localPath: filePath,
      driveFileId: result.id,
      name: result.name,
      size: result.size || null
    });
  }

  // 5. Execution report
  return {
    provider: "google_drive",
    backupSessionId,
    rootFolder: backupRootFolder,
    uploadedCount: uploadedFiles.length,
    uploadedFiles,
    completedAt: new Date().toISOString()
  };
}

module.exports = {
  executeGoogleDriveBackup
};