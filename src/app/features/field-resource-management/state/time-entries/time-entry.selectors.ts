/**
 * Time Entry Selectors
 * Provides memoized selectors for accessing time entry state
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TimeEntryState } from './time-entry.state';
import { timeEntryAdapter } from './time-entry.reducer';

// Feature selector
export const selectTimeEntryState = createFeatureSelector<TimeEntryState>('timeEntries');

// Entity adapter selectors
const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal
} = timeEntryAdapter.getSelectors();

// Select all time entries
export const selectAllTimeEntries = createSelector(
  selectTimeEntryState,
  selectAll
);

// Select time entry entities
export const selectTimeEntryEntities = createSelector(
  selectTimeEntryState,
  selectEntities
);

// Select time entry by ID
export const selectTimeEntryById = (id: string) => createSelector(
  selectTimeEntryEntities,
  (entities) => entities[id]
);

// Select loading state
export const selectTimeEntriesLoading = createSelector(
  selectTimeEntryState,
  (state) => state.loading
);

// Alias for consistency with component usage
export const selectTimeEntryLoading = selectTimeEntriesLoading;

// Select error state
export const selectTimeEntriesError = createSelector(
  selectTimeEntryState,
  (state) => state.error
);

// Alias for consistency with component usage
export const selectTimeEntryError = selectTimeEntriesError;

// Select active entry
export const selectActiveTimeEntry = createSelector(
  selectTimeEntryState,
  (state) => state.activeEntry
);

// Select total count
export const selectTimeEntriesTotal = createSelector(
  selectTimeEntryState,
  selectTotal
);

// Select time entries by job
export const selectTimeEntriesByJob = (jobId: string) => createSelector(
  selectAllTimeEntries,
  (timeEntries) => timeEntries.filter(entry => entry.jobId === jobId)
);

// Select time entries by technician
export const selectTimeEntriesByTechnician = (technicianId: string) => createSelector(
  selectAllTimeEntries,
  (timeEntries) => timeEntries.filter(entry => entry.technicianId === technicianId)
);

// Select total hours by job (calculated from clock in/out times)
export const selectTotalHoursByJob = (jobId: string) => createSelector(
  selectTimeEntriesByJob(jobId),
  (timeEntries) => timeEntries.reduce((total, entry) => {
    if (!entry.clockInTime) return total;
    const clockIn = new Date(entry.clockInTime).getTime();
    const clockOut = entry.clockOutTime ? new Date(entry.clockOutTime).getTime() : Date.now();
    return total + (clockOut - clockIn) / 3600000;
  }, 0)
);

// Select total hours by technician (calculated from clock in/out times)
export const selectTotalHoursByTechnician = (technicianId: string) => createSelector(
  selectTimeEntriesByTechnician(technicianId),
  (timeEntries) => timeEntries.reduce((total, entry) => {
    if (!entry.clockInTime) return total;
    const clockIn = new Date(entry.clockInTime).getTime();
    const clockOut = entry.clockOutTime ? new Date(entry.clockOutTime).getTime() : Date.now();
    return total + (clockOut - clockIn) / 3600000;
  }, 0)
);

// Select completed time entries (with clock out time)
export const selectCompletedTimeEntries = createSelector(
  selectAllTimeEntries,
  (timeEntries) => timeEntries.filter(entry => entry.clockOutTime !== undefined && entry.clockOutTime !== null)
);

// Select active time entries (without clock out time)
export const selectActiveTimeEntries = createSelector(
  selectAllTimeEntries,
  (timeEntries) => timeEntries.filter(entry => !entry.clockOutTime)
);

// Select manually adjusted time entries
export const selectManuallyAdjustedTimeEntries = createSelector(
  selectAllTimeEntries,
  (timeEntries) => timeEntries.filter(entry => entry.isManuallyAdjusted)
);

// Select time entries by date range
export const selectTimeEntriesByDateRange = (startDate: Date, endDate: Date) => createSelector(
  selectAllTimeEntries,
  (timeEntries) => timeEntries.filter(entry => {
    const entryDate = new Date(entry.clockInTime);
    return entryDate >= startDate && entryDate <= endDate;
  })
);

// Select today's time entries
export const selectTodaysTimeEntries = createSelector(
  selectAllTimeEntries,
  (timeEntries) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.clockInTime);
      return entryDate >= today && entryDate < tomorrow;
    });
  }
);

// Alias for consistency with component usage
export const selectTodayTimeEntries = selectTodaysTimeEntries;

// Select week's time entries (Monday to Sunday)
export const selectWeekTimeEntries = createSelector(
  selectAllTimeEntries,
  (timeEntries) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.clockInTime);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
  }
);

// Select has active entry
export const selectHasActiveEntry = createSelector(
  selectActiveTimeEntry,
  (activeEntry) => activeEntry !== null && !activeEntry.clockOutTime
);

// Select total mileage by technician
export const selectTotalMileageByTechnician = (technicianId: string) => createSelector(
  selectTimeEntriesByTechnician(technicianId),
  (timeEntries) => timeEntries.reduce((total, entry) => {
    return total + (entry.mileage || 0);
  }, 0)
);

// Select total mileage by job
export const selectTotalMileageByJob = (jobId: string) => createSelector(
  selectTimeEntriesByJob(jobId),
  (timeEntries) => timeEntries.reduce((total, entry) => {
    return total + (entry.mileage || 0);
  }, 0)
);

// Select last completed time entry (most recent clock out) for a technician
export const selectLastCompletedTimeEntry = (technicianId: string) => createSelector(
  selectTimeEntriesByTechnician(technicianId),
  (timeEntries) => {
    const completed = timeEntries
      .filter(entry => entry.clockOutTime && entry.clockOutLocation)
      .sort((a, b) => new Date(b.clockOutTime!).getTime() - new Date(a.clockOutTime!).getTime());
    
    return completed.length > 0 ? completed[0] : null;
  }
);
