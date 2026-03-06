/**
 * UI State Interface
 * Defines the shape of the UI state slice in the NgRx store
 */

import { Notification } from '../../models/notification.model';
import { TechnicianFilters, JobFilters, AssignmentFilters, CrewFilters } from '../../models/dtos/filters.dto';

export enum CalendarViewType {
  Day = 'day',
  Week = 'week'
}

export interface MapViewState {
  center: { lat: number; lng: number };
  zoom: number;
  showTechnicians: boolean;
  showCrews: boolean;
  showJobs: boolean;
  clusteringEnabled: boolean;
}

export interface FilterState {
  technicians?: TechnicianFilters;
  jobs?: JobFilters;
  assignments?: AssignmentFilters;
  crews?: CrewFilters;
}

export enum ConnectionStatus {
  Connected = 'connected',
  Disconnected = 'disconnected',
  Reconnecting = 'reconnecting'
}

export interface ConnectionState {
  status: ConnectionStatus;
  lastConnected?: Date;
  lastDisconnected?: Date;
  reconnectAttempts: number;
  lastError?: string;
}

export interface UIState {
  calendarView: CalendarViewType;
  selectedDate: Date;
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  mapView: MapViewState;
  selectedFilters: FilterState;
  notifications: Notification[];
  connectionState: ConnectionState;
}
