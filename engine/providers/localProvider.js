const fs = require("fs");
const path = require("path");
const StorageProvider = require("./provider.interface");

class LocalProvider extends StorageProvider {
    constructor(basePath = "storage") {  
        // ✅ unified storage root (no backups/storage confusion)
        super();
        this.basePath = path.isAbsolute(basePath)
            ? basePath
            : path.join(process.cwd(), basePath);
    }

    async connect() {
        if (!fs.existsSync(this.basePath)) {
            fs.mkdirSync(this.basePath, { recursive: true });
        }
    }

    async upload(localPath, remotePath) {
        const fullRemotePath = path.join(this.basePath, remotePath);

        // Ensure directory exists
        const dir = path.dirname(fullRemotePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Copy file
        await fs.promises.copyFile(localPath, fullRemotePath);
    }

    async download(remotePath, localPath) {
        const fullRemotePath = path.join(this.basePath, remotePath);

        // Ensure restore directory exists
        const dir = path.dirname(localPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Safety check
        if (!fs.existsSync(fullRemotePath)) {
            throw new Error(`❌ Backup file not found: ${fullRemotePath}`);
        }

        await fs.promises.copyFile(fullRemotePath, localPath);
    }

    async list(remotePath = "") {
        const fullPath = path.join(this.basePath, remotePath);
        if (!fs.existsSync(fullPath)) return [];
        return fs.promises.readdir(fullPath);
    }

    async delete(remotePath) {
        const fullPath = path.join(this.basePath, remotePath);
        if (fs.existsSync(fullPath)) {
            await fs.promises.unlink(fullPath);
        }
    }
}

module.exports = LocalProvider;