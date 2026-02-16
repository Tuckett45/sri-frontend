/**
 * UI Selectors
 * Provides memoized selectors for accessing UI state
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { UIState, CalendarViewType } from './ui.state';

// Feature selector
export const selectUIState = createFeatureSelector<UIState>('ui');

// Select calendar view
export const selectCalendarView = createSelector(
  selectUIState,
  (state) => state.calendarView
);

// Select selected date
export const selectSelectedDate = createSelector(
  selectUIState,
  (state) => state.selectedDate
);

// Select sidebar open state
export const selectSidebarOpen = createSelector(
  selectUIState,
  (state) => state.sidebarOpen
);

// Select mobile menu open state
export const selectMobileMenuOpen = createSelector(
  selectUIState,
  (state) => state.mobileMenuOpen
);

// Select is day view
export const selectIsDayView = createSelector(
  selectCalendarView,
  (view) => view === CalendarViewType.Day
);

// Select is week view
export const selectIsWeekView = createSelector(
  selectCalendarView,
  (view) => view === CalendarViewType.Week
);

// Select selected date as string (for display)
export const selectSelectedDateString = createSelector(
  selectSelectedDate,
  (date) => date.toLocaleDateString()
);

// Select selected week range
export const selectSelectedWeekRange = createSelector(
  selectSelectedDate,
  (date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);

    return {
      start: startOfWeek,
      end: endOfWeek
    };
  }
);

// Select is today selected
export const selectIsTodaySelected = createSelector(
  selectSelectedDate,
  (selectedDate) => {
    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  }
);
