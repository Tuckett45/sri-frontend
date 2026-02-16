/**
 * UI Reducer
 * Manages UI state updates
 */

import { createReducer, on } from '@ngrx/store';
import { UIState, CalendarViewType } from './ui.state';
import * as UIActions from './ui.actions';

// Initial state
export const initialState: UIState = {
  calendarView: CalendarViewType.Week,
  selectedDate: new Date(),
  sidebarOpen: true,
  mobileMenuOpen: false
};

// Reducer
export const uiReducer = createReducer(
  initialState,

  // Set Calendar View
  on(UIActions.setCalendarView, (state, { view }) => ({
    ...state,
    calendarView: view
  })),

  // Set Selected Date
  on(UIActions.setSelectedDate, (state, { date }) => ({
    ...state,
    selectedDate: date
  })),

  // Toggle Sidebar
  on(UIActions.toggleSidebar, (state) => ({
    ...state,
    sidebarOpen: !state.sidebarOpen
  })),

  // Open Sidebar
  on(UIActions.openSidebar, (state) => ({
    ...state,
    sidebarOpen: true
  })),

  // Close Sidebar
  on(UIActions.closeSidebar, (state) => ({
    ...state,
    sidebarOpen: false
  })),

  // Toggle Mobile Menu
  on(UIActions.toggleMobileMenu, (state) => ({
    ...state,
    mobileMenuOpen: !state.mobileMenuOpen
  })),

  // Open Mobile Menu
  on(UIActions.openMobileMenu, (state) => ({
    ...state,
    mobileMenuOpen: true
  })),

  // Close Mobile Menu
  on(UIActions.closeMobileMenu, (state) => ({
    ...state,
    mobileMenuOpen: false
  })),

  // Reset UI State
  on(UIActions.resetUIState, () => initialState)
);
