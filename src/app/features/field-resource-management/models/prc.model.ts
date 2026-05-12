/**
 * PRC (Performance Review Cycle) models for tracking 60-day review cycles
 * and associated goals for technicians.
 */

export type PRCRecordStatus = 'upcoming' | 'overdue' | 'completed';
export type PRCGoalStatus = 'not_started' | 'in_progress' | 'completed';

export interface PRCGoal {
  id: string;
  prcId: string;
  description: string;
  targetDate: string;        // ISO date
  status: PRCGoalStatus;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PRC {
  id: string;
  technicianId: string;
  dueDate: string;           // ISO date
  completionDate?: string;   // ISO date, optional
  status: PRCRecordStatus;
  goals: PRCGoal[];
  createdAt: string;
  updatedAt: string;
}
