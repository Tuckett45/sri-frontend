/**
 * Budget Management Models
 * 
 * Models for job budget tracking, adjustments, and deductions
 */

/**
 * Budget status enum
 */
export enum BudgetStatus {
  OnTrack = 'on-track',
  Warning = 'warning',      // 80% consumed
  OverBudget = 'over-budget' // 100%+ consumed
}

/**
 * Job budget tracking model
 */
export interface JobBudget {
  id: string;
  jobId: string;
  allocatedHours: number;
  consumedHours: number;
  remainingHours: number;
  status: BudgetStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Budget adjustment record with full audit trail
 */
export interface BudgetAdjustment {
  id: string;
  jobId: string;
  amount: number;           // Positive = increase, negative = decrease
  reason: string;
  adjustedBy: string;       // User ID
  adjustedByName: string;   // User display name
  timestamp: Date;
  previousBudget: number;
  newBudget: number;
}

/**
 * Budget deduction record (from timecard entries)
 */
export interface BudgetDeduction {
  id: string;
  jobId: string;
  timecardEntryId: string;
  technicianId: string;
  technicianName: string;
  hoursDeducted: number;
  timestamp: Date;
}
