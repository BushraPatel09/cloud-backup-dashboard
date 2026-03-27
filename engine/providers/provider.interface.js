class StorageProvider {
    async connect() {
        throw new Error("connect() not implemented");
    }

    async upload(localPath, remotePath) {
        throw new Error("upload() not implemented");
    }

    async download(remotePath, localPath) {
        throw new Error("download() not implemented");
    }

    async list(remotePath) {
        throw new Error("list() not implemented");
    }

    async delete(remotePath) {
        throw new Error("delete() not implemented");
    }
}

module.exports = StorageProvider;