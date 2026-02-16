/**
 * UI Actions
 * Defines all actions for UI state management
 */

import { createAction, props } from '@ngrx/store';
import { CalendarViewType } from './ui.state';

// Set Calendar View
export const setCalendarView = createAction(
  '[UI] Set Calendar View',
  props<{ view: CalendarViewType }>()
);

// Set Selected Date
export const setSelectedDate = createAction(
  '[UI] Set Selected Date',
  props<{ date: Date }>()
);

// Toggle Sidebar
export const toggleSidebar = createAction(
  '[UI] Toggle Sidebar'
);

// Open Sidebar
export const openSidebar = createAction(
  '[UI] Open Sidebar'
);

// Close Sidebar
export const closeSidebar = createAction(
  '[UI] Close Sidebar'
);

// Toggle Mobile Menu
export const toggleMobileMenu = createAction(
  '[UI] Toggle Mobile Menu'
);

// Open Mobile Menu
export const openMobileMenu = createAction(
  '[UI] Open Mobile Menu'
);

// Close Mobile Menu
export const closeMobileMenu = createAction(
  '[UI] Close Mobile Menu'
);

// Reset UI State
export const resetUIState = createAction(
  '[UI] Reset UI State'
);
