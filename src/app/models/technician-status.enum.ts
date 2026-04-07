export enum TechnicianStatus {
  Available = 'Available',
  Busy = 'Busy',
  Offline = 'Offline',
  EnRoute = 'En Route',
  OnSite = 'On Site'
}

export enum WorkOrderStatus {
  Unassigned = 'Unassigned',
  Assigned = 'Assigned',
  Acknowledged = 'Acknowledged',
  EnRoute = 'En Route',
  InProgress = 'In Progress',
  Resolved = 'Resolved',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export enum WorkOrderPriority {
  Level1 = 1, // 4-hour MTTA
  Level2 = 2, // 24-hour
  Level3 = 3  // 5-day
}

export enum NotificationType {
  Push = 'Push',
  SMS = 'SMS',
  Email = 'Email'
}

