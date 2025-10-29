export interface DailyUpdate {
  id: string;
  bugNumber: string;
  endOfDay: Date;
  site: string;
  pmNames: string[];
  sow: string;
  siteRackLocation: string;
  installBegin: Date | null;
  googleExpectedCompleteDate: Date | null;
  trackingCompleteDate: Date | null;
  installPercentComplete: ScopeProgress[];
  testPercentComplete: ScopeProgress[];
  completedActivity: string;
  plannedActivity: string;
  activeBlockers: Blocker[];
  openRMA: RMAEntry[];
  notes: string;
  resolvedBlockers: ResolvedBlocker[];
  rmaLog: CompletedRMAEntry[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScopeProgress {
  scope: string;
  percentage: number;
  description?: string;
}

export interface Blocker {
  id: string;
  description: string;
  ticketNumber?: string;
  category: BlockerCategory;
  severity: BlockerSeverity;
  reportedDate: Date;
}

export interface ResolvedBlocker {
  id: string;
  originalBlockerId: string;
  description: string;
  mitigationDate: Date;
  resolution: string;
}

export interface RMAEntry {
  id: string;
  equipmentType: string;
  serialNumber?: string;
  failureDescription: string;
  reportedDate: Date;
  status: RMAStatus;
}

export interface CompletedRMAEntry {
  id: string;
  originalRMAId: string;
  equipmentType: string;
  serialNumber?: string;
  completionDate: Date;
  rmaNumber: string;
  replacementSerialNumber?: string;
}

export enum BlockerCategory {
  MATERIAL = 'Material Not On Site',
  ADDITIONAL_SCOPE = 'Additional Scope',
  OTHER_ACTIVITIES = 'Other Activities',
  TECHNICAL = 'Technical Issue',
  WEATHER = 'Weather',
  ACCESS = 'Site Access',
  COORDINATION = 'Coordination'
}

export enum BlockerSeverity {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export enum RMAStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  SHIPPED = 'Shipped',
  RECEIVED = 'Received',
  INSTALLED = 'Installed',
  CANCELLED = 'Cancelled'
}

export interface DailyUpdateSummary {
  totalReports: number;
  activeBlockers: number;
  openRMAs: number;
  averageInstallProgress: number;
  averageTestProgress: number;
  sitesWithIssues: number;
  completedToday: number;
}

export interface DailyUpdateFilter {
  dateRange?: {
    start: Date;
    end: Date;
  };
  sites?: string[];
  pmNames?: string[];
  hasBlockers?: boolean;
  hasOpenRMAs?: boolean;
  installProgressRange?: {
    min: number;
    max: number;
  };
}

