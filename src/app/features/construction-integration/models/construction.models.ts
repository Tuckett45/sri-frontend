export enum ProjectCategory {
  BULK_LABOR_SUPPORT = 'BULK_LABOR_SUPPORT',
  HYPERSCALE_DEPLOYMENT = 'HYPERSCALE_DEPLOYMENT'
}

export enum IssueSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum IssueStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  location: string;
  category: ProjectCategory;
  createdDate: string;
  updatedDate: string;
}

export interface ResourceAllocation {
  id: string;
  projectId: string;
  year: number;
  month: number; // 1-12
  headcount: number;
}

export interface Issue {
  id: string;
  projectId: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  assignedUserId: string | null;
  createdDate: string;
  updatedDate: string;
}

export interface IssueFilters {
  severity?: IssueSeverity;
  status?: IssueStatus;
  projectId?: string;
}

export const VALID_STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  [IssueStatus.OPEN]: [IssueStatus.IN_PROGRESS],
  [IssueStatus.IN_PROGRESS]: [IssueStatus.RESOLVED],
  [IssueStatus.RESOLVED]: [IssueStatus.CLOSED],
  [IssueStatus.CLOSED]: []
};
