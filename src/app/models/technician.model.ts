import { TechnicianStatus, NotificationType } from './technician-status.enum';

export interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  status: TechnicianStatus;
  skills: string[];
  currentLocation?: LocationCoordinates;
  lastLocationUpdate?: Date;
  availabilityWindows?: AvailabilityWindow[];
  notificationPreferences: NotificationType[];
  activeAssignmentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

export interface AvailabilityWindow {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
}

export interface TechnicianListItem {
  id: string;
  name: string;
  status: TechnicianStatus;
  activeAssignments: number;
  lastLocation?: LocationCoordinates;
  isAvailable: boolean;
}
