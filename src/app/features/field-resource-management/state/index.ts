/**
 * State Management Barrel Export
 * Provides centralized exports for all state management modules
 */

// Technician State
export * from './technicians/technician.state';
export * from './technicians/technician.actions';
export { technicianReducer, initialState as technicianInitialState } from './technicians/technician.reducer';
export * from './technicians/technician.selectors';
export * from './technicians/technician.effects';

// Job State
export * from './jobs/job.state';
export * from './jobs/job.actions';
export { jobReducer, initialState as jobInitialState } from './jobs/job.reducer';
export * from './jobs/job.selectors';
export * from './jobs/job.effects';

// Assignment State
export * from './assignments/assignment.state';
export * from './assignments/assignment.actions';
export { assignmentReducer, initialState as assignmentInitialState } from './assignments/assignment.reducer';
export * from './assignments/assignment.selectors';
export * from './assignments/assignment.effects';

// Time Entry State
export * from './time-entries/time-entry.state';
export * from './time-entries/time-entry.actions';
export { timeEntryReducer, initialState as timeEntryInitialState } from './time-entries/time-entry.reducer';
export * from './time-entries/time-entry.selectors';
export * from './time-entries/time-entry.effects';

// Notification State
export * from './notifications/notification.state';
export * from './notifications/notification.actions';
export { notificationReducer, initialState as notificationInitialState } from './notifications/notification.reducer';
export * from './notifications/notification.selectors';
export * from './notifications/notification.effects';

// UI State
export * from './ui/ui.state';
export * from './ui/ui.actions';
export { uiReducer, initialState as uiInitialState } from './ui/ui.reducer';
export * from './ui/ui.selectors';

// Reporting State
export * from './reporting/reporting.state';
export * from './reporting/reporting.actions';
export { reportingReducer, initialState as reportingInitialState } from './reporting/reporting.reducer';
export * from './reporting/reporting.selectors';
export * from './reporting/reporting.effects';

// Timecard State
export * from './timecards/timecard.actions';
export { timecardReducer, initialState as timecardInitialState } from './timecards/timecard.reducer';
export * from './timecards/timecard.selectors';

// Budget State
export * from './budgets/budget.state';
export * from './budgets/budget.actions';
export { budgetReducer, initialState as budgetInitialState } from './budgets/budget.reducer';
export * from './budgets/budget.selectors';
export * from './budgets/budget.effects';

// Inventory State
export * from './inventory/inventory.state';
export * from './inventory/inventory.actions';
export { inventoryReducer, initialState as inventoryInitialState } from './inventory/inventory.reducer';
export * from './inventory/inventory.selectors';
export * from './inventory/inventory.effects';

// Materials State
export * from './materials/materials.state';
export * from './materials/materials.actions';
export { materialsReducer, initialState as materialsInitialState } from './materials/materials.reducer';
export * from './materials/materials.selectors';
export * from './materials/materials.effects';

// Deployment Checklist State
export * from './deployment-checklist/checklist.state';
export * from './deployment-checklist/checklist.actions';
export { checklistReducer } from './deployment-checklist/checklist.reducer';
export * from './deployment-checklist/checklist.selectors';
export * from './deployment-checklist/checklist.effects';

// Quote State
export * from './quotes/quote.state';
export * from './quotes/quote.actions';
export { quoteReducer } from './quotes/quote.reducer';
export * from './quotes/quote.selectors';
export * from './quotes/quote.effects';

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
import { TimecardState } from './timecards/timecard.reducer';
import { BudgetState } from './budgets/budget.state';
import { InventoryState } from './inventory/inventory.state';
import { MaterialsState } from './materials/materials.state';
import { ChecklistState } from './deployment-checklist/checklist.state';
import { QuoteState } from './quotes/quote.state';

export interface FieldResourceManagementState {
  technicians: TechnicianState;
  jobs: JobState;
  assignments: AssignmentState;
  timeEntries: TimeEntryState;
  notifications: NotificationState;
  ui: UIState;
  reporting: ReportingState;
  timecards: TimecardState;
  budgets: BudgetState;
  inventory: InventoryState;
  materials: MaterialsState;
  deploymentChecklist: ChecklistState;
  quotes: QuoteState;
}
