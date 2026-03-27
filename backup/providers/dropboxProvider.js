import axios from "axios";
import { BaseStorageProvider } from "./baseProvider.js";

function buildDropboxPath(backupId, relativePath, originalname) {
    const normalizedPath = (relativePath || originalname || "file").replace(/\\/g, "/");
    return `/${backupId}/${normalizedPath}`;
}

export class DropboxProvider extends BaseStorageProvider {
    constructor({ accessToken }) {
        super("dropbox");
        this.accessToken = accessToken || process.env.DROPBOX_ACCESS_TOKEN || "";
    }

    validateConfig() {
        if (!this.accessToken) {
            throw new Error("Dropbox access token not found");
        }
    }

    async uploadFile({ backupId, file, relativePath }) {
        this.validateConfig();
        const dropboxPath = buildDropboxPath(backupId, relativePath, file.originalname);
try{
        const response = await axios.post(
            "https://content.dropboxapi.com/2/files/upload",
            file.buffer,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "Content-Type": "application/octet-stream",
                    "Dropbox-API-Arg": JSON.stringify({
                        path: dropboxPath,
                        mode: "overwrite",
                        autorename: false,
                        mute: true
                    })
                },
                maxBodyLength: Infinity
            }
        );

        return {
            providerFileId: response.data.id,
            storagePath: response.data.path_display || dropboxPath
        };
    }catch (error) {
        console.error("Dropbox upload failed:");
        console.error("dropboxPath:", dropboxPath);
        console.error("status:", error.response?.status);
        console.error("data:", error.response?.data || error.message);

        throw error;
    }
}

    async downloadFile({ record, destinationPath }) {
        this.validateConfig();
        const fs = await import("fs");
        const response = await axios.post(
            "https://content.dropboxapi.com/2/files/download",
            null,
            {
                responseType: "stream",
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "Dropbox-API-Arg": JSON.stringify({
                        path: record.storagePath
                    })
                }
            }
        );

        const dest = fs.createWriteStream(destinationPath);
        await new Promise((resolve, reject) => {
            response.data.pipe(dest).on("finish", resolve).on("error", reject);
        });
    }
}
