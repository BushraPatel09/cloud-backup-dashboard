export class BaseStorageProvider {
    constructor(name) {
        this.name = name;
    }

    validateConfig() {
        throw new Error(`${this.name} provider must implement validateConfig()`);
    }

    async uploadFile({ backupId, file, relativePath }) {
    throw new Error(`${this.name} provider must implement uploadFile({ backupId, file, relativePath })`);
}

    async downloadFile() {
        throw new Error(`${this.name} provider must implement downloadFile()`);
    }
}
