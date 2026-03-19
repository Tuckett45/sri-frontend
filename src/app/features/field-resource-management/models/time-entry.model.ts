/**
 * Time entry and geolocation models for Field Resource Management
 */

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp?: Date;
}

export interface TimeEntry {
  id: string;
  jobId: string;
  technicianId: string;
  clockInTime: Date;
  clockOutTime?: Date;
  clockInLocation?: GeoLocation;
  clockOutLocation?: GeoLocation;
  totalHours?: number;
  regularHours?: number;
  overtimeHours?: number;
  mileage?: number;
  breakMinutes?: number;
  isManuallyAdjusted: boolean;
  adjustedBy?: string;
  adjustmentReason?: string;
  isLocked: boolean;
  lockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum TimecardStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  UnderReview = 'under_review',
  Approved = 'approved',
  Rejected = 'rejected',
  RequiresCorrection = 'requires_correction'
}

export enum ExpenseType {
  Mileage = 'mileage',
  Meals = 'meals',
  Lodging = 'lodging',
  Materials = 'materials',
  Tools = 'tools',
  Parking = 'parking',
  Other = 'other'
}

export interface Expense {
  id: string;
  timeEntryId?: string;
  jobId: string;
  technicianId: string;
  type: ExpenseType;
  amount: number;
  currency: string;
  date: Date;
  description: string;
  category: string;
  receiptUrl?: string;
  receiptThumbnailUrl?: string;
  isReimbursable: boolean;
  reimbursementStatus: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;
  approvedAt?: Date;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimecardPeriod {
  id: string;
  technicianId: string;
  startDate: Date;
  endDate: Date;
  periodType: 'weekly' | 'biweekly';
  status: TimecardStatus;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  totalExpenses: number;
  timeEntries: TimeEntry[];
  expenses: Expense[];
  submittedAt?: Date;
  submittedBy?: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
  rejectionReason?: string;
  notes?: string;
  isLocked: boolean;
  lockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimecardLockConfig {
  enabled: boolean;
  lockDay: 'Friday' | 'Saturday' | 'Sunday';
  lockTime: string; // HH:mm format
  gracePeriodHours: number;
  allowManagerUnlock: boolean;
  requireUnlockReason: boolean;
  autoRelockAfterHours: number;
}

export interface UnlockRequest {
  id: string;
  periodId: string;
  requestedBy: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
}

export interface DailyTimeSummary {
  date: Date;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  jobCount: number;
  totalExpenses: number;
  timeEntries: TimeEntry[];
  expenses: Expense[];
  isLocked: boolean;
}

export interface WeeklyTimeSummary {
  weekStart: Date;
  weekEnd: Date;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  totalMileage: number;
  totalExpenses: number;
  dailySummaries: DailyTimeSummary[];
  isLocked: boolean;
  locksIn?: Date;
}
