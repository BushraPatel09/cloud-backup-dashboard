// backup/providers.js

const Providers = {
  GOOGLE_DRIVE: {
    id: "google_drive",
    name: "Google Drive",

    type: "cloud", // cloud | local | hybrid

    storageModel: "file", // file | object | block

    auth: {
      type: "oauth",
      provider: "google",
      tokenType: "access_token"
    },

    capabilities: {
      versioning: true,
      deltaSync: true,
      snapshot: false,
      realtimeSync: true,
      encryption: true,
      compression: false,
      multiDevice: true,
      apiAccess: true
    },

    limits: {
      maxFileSize: "5TB",
      rateLimited: true,
      quotaBased: true
    },

    supportedBackupTypes: [
      "full",
      "incremental",
      "differential",
      "realtime"
    ]
  },

  LOCAL_DISK: {
    id: "local_disk",
    name: "Local Disk",

    type: "local",

    storageModel: "file",

    auth: {
      type: "filesystem",
      provider: "os",
      tokenType: null
    },

    capabilities: {
      versioning: false,
      deltaSync: false,
      snapshot: false,
      realtimeSync: false,
      encryption: false,
      compression: false,
      multiDevice: false,
      apiAccess: false
    },

    limits: {
      maxFileSize: "OS_LIMIT",
      rateLimited: false,
      quotaBased: false
    },

    supportedBackupTypes: [
      "full"
    ]
  }
};

module.exports = Providers;