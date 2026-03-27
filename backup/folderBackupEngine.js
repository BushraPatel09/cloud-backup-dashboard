import path from "path";
import { scanFolder } from "./folderScanner.js";
import { uploadFileToDrive, ensureDriveFolder } from "./googleDriveUploader.js";
import { broadcastBackupUpdate } from "../realtime/socketServer.js";

async function ensureNestedFolders(accessToken, rootFolderId, relativePath) {
  const folderParts = relativePath.split("/").slice(0, -1);

  let currentParentId = rootFolderId;

  for (const folderName of folderParts) {
    const folder = await ensureDriveFolder(accessToken, folderName, currentParentId);
    currentParentId = folder.id;
  }

  return currentParentId;
}

export async function startFolderBackup(accessToken, folderPath) {
  const scanResult = scanFolder(folderPath);
  const files = scanResult.files;

  const totalFiles = files.length;

  if (totalFiles === 0) {
    throw new Error("No files found in folder");
  }

  const rootBackupFolder = await ensureDriveFolder(accessToken, "LaptopBackups");
  const sourceFolderName = path.basename(folderPath);
  const sourceFolder = await ensureDriveFolder(accessToken, sourceFolderName, rootBackupFolder.id);

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];

    const targetParentId = await ensureNestedFolders(
      accessToken,
      sourceFolder.id,
      file.relativePath
    );

    const uploaded = await uploadFileToDrive(
      accessToken,
      file.path,
      file.name,
      targetParentId
    );

    const progress = Math.round(((i + 1) / totalFiles) * 100);

    broadcastBackupUpdate({
      file: file.relativePath,
      progress,
      stage: "uploading",
      status: "running",
      driveId: uploaded.id
    });
  }

  broadcastBackupUpdate({
    file: "",
    progress: 100,
    stage: "completed",
    status: "completed"
  });

  return {
    success: true,
    totalFiles
  };
}