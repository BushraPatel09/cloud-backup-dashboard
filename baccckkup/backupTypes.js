// backup/backupTypes.js

const BackupTypes = {
  FULL: {
    id: "full",
    name: "Full Backup",
    description: "Creates a complete copy of all selected data every time",

    strategy: "complete_copy",

    dataScope: "all", // all | changed | delta | snapshot

    dependencies: null, // no dependency on previous backups

    storageImpact: "high", // low | medium | high

    speed: "slow",

    recoveryType: "direct", // direct restore possible

    produces: {
      baseline: true,
      deltaChain: false,
      snapshot: false
    },

    useCases: [
      "first_time_backup",
      "baseline_creation",
      "disaster_recovery_base",
      "data_migration",
      "system_initialization"
    ]
  },

  INCREMENTAL: {
    id: "incremental",
    name: "Incremental Backup",
    description: "Backs up only data changed since last backup (full or incremental)",

    strategy: "change_tracking",

    dataScope: "changed",

    dependencies: ["full", "incremental"],

    storageImpact: "low",

    speed: "fast",

    recoveryType: "chain", // requires full + all incrementals

    produces: {
      baseline: false,
      deltaChain: true,
      snapshot: false
    },

    useCases: [
      "frequent_backups",
      "low_storage_usage",
      "fast_sync",
      "cloud_optimization"
    ]
  },

  DIFFERENTIAL: {
    id: "differential",
    name: "Differential Backup",
    description: "Backs up data changed since last full backup",

    strategy: "baseline_delta",

    dataScope: "delta",

    dependencies: ["full"],

    storageImpact: "medium",

    speed: "medium",

    recoveryType: "partial_chain", // full + last differential

    produces: {
      baseline: false,
      deltaChain: false,
      snapshot: false
    },

    useCases: [
      "balanced_storage",
      "faster_restore_than_incremental",
      "simpler_restore_chain"
    ]
  },

  REALTIME: {
    id: "realtime",
    name: "Realtime Backup",
    description: "Continuously syncs changes as they happen",

    strategy: "event_stream",

    dataScope: "live",

    dependencies: ["full"],

    storageImpact: "continuous",

    speed: "instant",

    recoveryType: "state_sync",

    produces: {
      baseline: false,
      deltaChain: true,
      snapshot: false
    },

    useCases: [
      "zero_data_loss",
      "high_availability",
      "live_sync",
      "enterprise_systems"
    ]
  },

  SNAPSHOT: {
    id: "snapshot",
    name: "Snapshot Backup",
    description: "Captures system state at a point in time",

    strategy: "state_capture",

    dataScope: "system_state",

    dependencies: null,

    storageImpact: "high",

    speed: "fast",

    recoveryType: "image_restore",

    produces: {
      baseline: false,
      deltaChain: false,
      snapshot: true
    },

    useCases: [
      "system_restore",
      "rollback",
      "testing",
      "vm_restore",
      "instant_recovery"
    ]
  }
};

module.exports = BackupTypes;
// backup/backupTypes.js

module.exports = {
  FULL: {
    id: "full",
    name: "Full Backup",
    description: "Complete backup of all selected data",
    strategy: "snapshot",
    dependencies: [], // no dependency
    chainable: true,  // can be base for other backups
    level: 0
  },

  INCREMENTAL: {
    id: "incremental",
    name: "Incremental Backup",
    description: "Backs up only data changed since last backup",
    strategy: "delta",
    dependencies: ["full"], // requires full backup first
    chainable: true,
    level: 1
  },

  DIFFERENTIAL: {
    id: "differential",
    name: "Differential Backup",
    description: "Backs up changes since last full backup",
    strategy: "delta-from-full",
    dependencies: ["full"], // requires full backup
    chainable: true,
    level: 1
  },

  REALTIME: {
    id: "realtime",
    name: "Realtime Backup",
    description: "Continuous background backup",
    strategy: "stream",
    dependencies: ["full"],
    chainable: false,
    level: 2
  },

  SNAPSHOT: {
    id: "snapshot",
    name: "Snapshot Backup",
    description: "Point-in-time state capture",
    strategy: "point-in-time",
    dependencies: [],
    chainable: true,
    level: 0
  }
};