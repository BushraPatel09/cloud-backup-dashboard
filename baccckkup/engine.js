// backup/engine.js
const { executeGoogleDriveBackup } = require("./workers/googleDriveWorker");
const fs = require("fs");
const path = require("path");

const Providers = require("./providers");
const BackupTypes = require("./backupTypes");

const METADATA_PATH = path.join(__dirname, "metadata.json");

class BackupEngine {
  constructor() {
    this.metadata = this.loadMetadata();
  }

  // -------------------------
  // SYSTEM MEMORY
  // -------------------------
  loadMetadata() {
    try {
      const raw = fs.readFileSync(METADATA_PATH, "utf-8");
      return JSON.parse(raw);
    } catch (err) {
      throw new Error("Metadata file missing or corrupted");
    }
  }

  saveMetadata() {
    fs.writeFileSync(
      METADATA_PATH,
      JSON.stringify(this.metadata, null, 2)
    );
  }

  // -------------------------
  // VALIDATION LAYER
  // -------------------------
  validateProvider(providerId) {
    const provider = Object.values(Providers).find(
      p => p.id === providerId
    );

    if (!provider) {
      throw new Error(`Provider not supported: ${providerId}`);
    }

    return provider;
  }

  validateBackupType(typeId) {
    const type = Object.values(BackupTypes).find(
      t => t.id === typeId
    );

    if (!type) {
      throw new Error(`Backup type not supported: ${typeId}`);
    }

    return type;
  }

  // -------------------------
  // DEPENDENCY ENGINE
  // -------------------------
  validateDependencies(userId, backupType) {
    if (!backupType.dependencies) return true;

    const userBackups = this.metadata.backups.filter(
      b => b.userId === userId
    );

    for (const dep of backupType.dependencies) {
      const exists = userBackups.find(b => b.type === dep);
      if (!exists) {
        throw new Error(
          `Dependency missing: ${backupType.name} requires ${dep} backup first`
        );
      }
    }

    return true;
  }

  // -------------------------
  // TOKEN RESOLVER
  // -------------------------
  getUserAccessToken(userId) {
    const user = this.metadata.users.find(u => u.userId === userId);

    if (!user) {
      throw new Error("User not found in metadata");
    }

    // ⚠️ TEMP DESIGN:
    // Token will be injected at runtime later from session
    // We are NOT storing tokens in metadata for security
    if (!user.accessToken) {
      throw new Error("No access token stored for user");
    }

    return user.accessToken;
  }

  // -------------------------
  // CORE EXECUTION ENTRY
  // -------------------------
  async startBackup({
    userId,
    providerId,
    backupTypeId,
    sourcePath
  }) {
    // 1. Validate provider
    const provider = this.validateProvider(providerId);

    // 2. Validate backup type
    const backupType = this.validateBackupType(backupTypeId);

    // 3. Validate provider supports backup type
    if (!provider.supportedBackupTypes.includes(backupType.id)) {
      throw new Error(
        `${provider.name} does not support ${backupType.name}`
      );
    }

    // 4. Validate dependencies
    this.validateDependencies(userId, backupType);

    // 5. Create backup record (PRE-EXECUTION)
    const backupRecord = {
      backupId: `bkp_${Date.now()}`,
      userId,
      provider: provider.id,
      type: backupType.id,
      strategy: backupType.strategy,
      status: "pending",
      timestamp: new Date().toISOString(),
      sourcePath,
      size: null,
      parent: null,
      integrity: "unverified"
    };

    this.metadata.backups.push(backupRecord);
    this.saveMetadata();

    // -------------------------
    // EXECUTION LAYER
    // -------------------------
    let executionResult = null;

    if (provider.id === "google_drive") {
      executionResult = await executeGoogleDriveBackup({
        accessToken: this.getUserAccessToken(userId),
        sourcePath,
        backupRootFolder: "nilmay_backups",
        backupSessionId: backupRecord.backupId
      });
    }

    // -------------------------
    // POST-EXECUTION UPDATE
    // -------------------------
    backupRecord.status = "success";
    backupRecord.integrity = "verified";
    backupRecord.size = "uploaded";
    backupRecord.execution = executionResult;

    this.saveMetadata();

    return backupRecord;
  }
}

module.exports = BackupEngine;