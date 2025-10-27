export type Id = string;

/* -------------------------
   Issue Status Enum
-------------------------- */
export enum IssueStatus {
  Open = 0,
  InProgress = 1,
  Resolved = 2,
  Closed = 3
}

/* -------------------------
   Issue Priority Enum
-------------------------- */
export enum IssuePriority {
  Low = 0,
  Medium = 1,
  High = 2,
  Critical = 3
}

/* -------------------------
   User Role Enum (matching backend)
-------------------------- */
export enum UserRole {
  User = 0,
  Technician = 1,
  DeploymentEngineer = 2,
  ProjectManager = 3,
  ConstructionManager = 4,
  Admin = 5
}

/* ============================================================
   Issue Models
   ============================================================ */
export interface Issue {
  id: Id;
  deploymentId: Id;
  deploymentName: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  reportedBy: string;
  reportedByName: string;
  assignedTo?: string;
  assignedToName?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  media: IssueMedia[];
}

export interface IssueMedia {
  id: Id;
  fileName: string;
  url: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
}

/* ============================================================
   Issue DTOs for API Communication
   ============================================================ */
export interface IssueCreateDto {
  deploymentId: Id;
  title: string;
  description: string;
  priority?: IssuePriority;
  assignedTo?: string;
}

export interface IssueUpdateDto {
  title?: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  assignedTo?: string;
  resolutionNotes?: string;
}

export interface IssueQueryDto {
  deploymentId?: Id;
  status?: IssueStatus;
  priority?: IssuePriority;
  assignedTo?: string;
  reportedBy?: string;
  page?: number;
  pageSize?: number;
}

export interface IssueStatsDto {
  totalIssues: number;
  openIssues: number;
  inProgressIssues: number;
  resolvedIssues: number;
  closedIssues: number;
  criticalIssues: number;
  highPriorityIssues: number;
  averageResolutionTimeHours: number;
}

/* ============================================================
   Helper Functions and Constants
   ============================================================ */
export const IssueStatusLabels: Record<IssueStatus, string> = {
  [IssueStatus.Open]: 'Open',
  [IssueStatus.InProgress]: 'In Progress',
  [IssueStatus.Resolved]: 'Resolved',
  [IssueStatus.Closed]: 'Closed'
};

export const IssuePriorityLabels: Record<IssuePriority, string> = {
  [IssuePriority.Low]: 'Low',
  [IssuePriority.Medium]: 'Medium',
  [IssuePriority.High]: 'High',
  [IssuePriority.Critical]: 'Critical'
};

export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.User]: 'User',
  [UserRole.Technician]: 'Technician',
  [UserRole.DeploymentEngineer]: 'Deployment Engineer',
  [UserRole.ProjectManager]: 'Project Manager',
  [UserRole.ConstructionManager]: 'Construction Manager',
  [UserRole.Admin]: 'Admin'
};

export const IssueStatusColors: Record<IssueStatus, string> = {
  [IssueStatus.Open]: 'danger',
  [IssueStatus.InProgress]: 'warn',
  [IssueStatus.Resolved]: 'success',
  [IssueStatus.Closed]: 'secondary'
};

export const IssuePriorityColors: Record<IssuePriority, string> = {
  [IssuePriority.Low]: 'secondary',
  [IssuePriority.Medium]: 'info',
  [IssuePriority.High]: 'warn',
  [IssuePriority.Critical]: 'danger'
};

export function getIssueStatusLabel(status: IssueStatus): string {
  return IssueStatusLabels[status] || 'Unknown';
}

export function getIssuePriorityLabel(priority: IssuePriority): string {
  return IssuePriorityLabels[priority] || 'Unknown';
}

export function getUserRoleLabel(role: UserRole): string {
  return UserRoleLabels[role] || 'Unknown';
}

export function getIssueStatusColor(status: IssueStatus): string {
  return IssueStatusColors[status] || 'secondary';
}

export function getIssuePriorityColor(priority: IssuePriority): string {
  return IssuePriorityColors[priority] || 'secondary';
}

export function isIssueOpen(issue: Issue): boolean {
  return issue.status === IssueStatus.Open;
}

export function isIssueResolved(issue: Issue): boolean {
  return issue.status === IssueStatus.Resolved || issue.status === IssueStatus.Closed;
}

export function isIssueCritical(issue: Issue): boolean {
  return issue.priority === IssuePriority.Critical;
}

export function canUserResolveIssue(userRole: UserRole): boolean {
  return userRole === UserRole.DeploymentEngineer || userRole === UserRole.Admin;
}

export function canUserAssignIssue(userRole: UserRole): boolean {
  return userRole === UserRole.DeploymentEngineer || userRole === UserRole.Admin;
}

export function canUserDeleteIssue(userRole: UserRole, issue: Issue, currentUserId: string): boolean {
  return userRole === UserRole.Admin || issue.reportedBy === currentUserId;
}
