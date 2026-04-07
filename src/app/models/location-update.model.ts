export interface LocationUpdate {
  id: string;
  technicianId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
  source: LocationSource;
}

export enum LocationSource {
  GPS = 'GPS',
  Network = 'Network',
  Manual = 'Manual'
}

export interface LocationTrackingConfig {
  enabled: boolean;
  updateIntervalSeconds: number;
  highAccuracyMode: boolean;
  maximumAge?: number;
  timeout?: number;
}

export interface TechnicianLocationMarker {
  technicianId: string;
  technicianName: string;
  latitude: number;
  longitude: number;
  status: string;
  lastUpdate: Date;
  activeAssignments: number;
}

export interface SendLocationRequest {
  technicianId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}
