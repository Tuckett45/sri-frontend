/**
 * PRC (Performance Review Cycle) timer utility functions.
 * Pure functions for computing PRC due dates and status.
 */

export type PRCStatus = 'upcoming' | 'overdue' | 'completed';

/**
 * Number of days in a PRC cycle.
 */
const PRC_CYCLE_DAYS = 60;

/**
 * Computes the PRC due date by adding 60 days to the given start or completion date.
 *
 * @param startOrCompletionDate - The technician's start date (for first PRC) or last PRC completion date
 * @returns A new Date exactly 60 days after the input date
 */
export function computePRCDueDate(startOrCompletionDate: Date): Date {
  const dueDate = new Date(startOrCompletionDate);
  dueDate.setDate(dueDate.getDate() + PRC_CYCLE_DAYS);
  return dueDate;
}

/**
 * Computes the PRC status based on the due date, completion date, and a reference date.
 *
 * @param dueDate - The date by which the PRC must be completed
 * @param completionDate - The date the PRC was completed, or null if not yet completed
 * @param referenceDate - The date to compare against (defaults to current date)
 * @returns 'completed' if completionDate is set, 'overdue' if referenceDate > dueDate, 'upcoming' otherwise
 */
export function computePRCStatus(
  dueDate: Date,
  completionDate: Date | null,
  referenceDate: Date = new Date()
): PRCStatus {
  if (completionDate !== null) {
    return 'completed';
  }

  if (referenceDate > dueDate) {
    return 'overdue';
  }

  return 'upcoming';
}
