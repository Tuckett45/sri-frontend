/**
 * State Management Barrel Export
 * Provides centralized exports for all state management modules
 */

// Technician State
export * from './technicians/technician.state';
export * from './technicians/technician.actions';
export * from './technicians/technician.reducer';
export * from './technicians/technician.selectors';
export * from './technicians/technician.effects';

// Job State
export * from './jobs/job.state';
export * from './jobs/job.actions';
export * from './jobs/job.reducer';
export * from './jobs/job.selectors';
export * from './jobs/job.effects';

// Assignment State
export * from './assignments/assignment.state';
export * from './assignments/assignment.actions';
export * from './assignments/assignment.reducer';
export * from './assignments/assignment.selectors';
export * from './assignments/assignment.effects';

// Time Entry State
export * from './time-entries/time-entry.state';
export * from './time-entries/time-entry.actions';
export * from './time-entries/time-entry.reducer';
export * from './time-entries/time-entry.selectors';
export * from './time-entries/time-entry.effects';

// Notification State
export * from './notifications/notification.state';
export * from './notifications/notification.actions';
export * from './notifications/notification.reducer';
export * from './notifications/notification.selectors';
export * from './notifications/notification.effects';

// UI State
export * from './ui/ui.state';
export * from './ui/ui.actions';
export * from './ui/ui.reducer';
export * from './ui/ui.selectors';

// Reporting State
export * from './reporting/reporting.state';
export * from './reporting/reporting.actions';
export * from './reporting/reporting.reducer';
export * from './reporting/reporting.selectors';
export * from './reporting/reporting.effects';

/**
 * Root State Interface
 * Combines all feature state slices
 */
import { TechnicianState } from './technicians/technician.state';
import { JobState } from './jobs/job.state';
import { AssignmentState } from './assignments/assignment.state';
import { TimeEntryState } from './time-entries/time-entry.state';
import { NotificationState } from './notifications/notification.state';
import { UIState } from './ui/ui.state';
import { ReportingState } from './reporting/reporting.state';

export interface FieldResourceManagementState {
  technicians: TechnicianState;
  jobs: JobState;
  assignments: AssignmentState;
  timeEntries: TimeEntryState;
  notifications: NotificationState;
  ui: UIState;
  reporting: ReportingState;
}
