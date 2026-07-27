/** Time category for a time entry */
export enum TimeCategory {
  DriveTime = 'DriveTime',
  OnSite = 'OnSite'
}

/** Pay type classification */
export enum PayType {
  Regular = 'Regular',
  Overtime = 'Overtime',
  Holiday = 'Holiday',
  PTO = 'PTO'
}

/** Sync status for ATLAS API synchronization */
export enum SyncStatus {
  Synced = 'Synced',
  Pending = 'Pending',
  Failed = 'Failed',
  Conflict = 'Conflict'
}
