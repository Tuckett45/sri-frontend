/**
 * UI State Interface
 * Defines the shape of the UI state slice in the NgRx store
 */

export enum CalendarViewType {
  Day = 'day',
  Week = 'week'
}

export interface UIState {
  calendarView: CalendarViewType;
  selectedDate: Date;
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
}
