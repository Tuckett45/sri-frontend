/**
 * Travel Management Models
 * 
 * Models for technician travel profiles, geocoding, and distance calculations
 */

/**
 * Geocoding status enum
 */
export enum GeocodingStatus {
  NotGeocoded = 'not-geocoded',
  Pending = 'pending',
  Success = 'success',
  Failed = 'failed'
}

/**
 * Address model
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

/**
 * Coordinates model
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Technician travel profile
 */
export interface TravelProfile {
  technicianId: string;
  willingToTravel: boolean;
  homeAddress: Address;
  homeCoordinates: Coordinates | null;
  geocodingStatus: GeocodingStatus;
  geocodingError: string | null;
  lastGeocodedAt: Date | null;
  updatedAt: Date;
}

/**
 * Technician distance calculation result
 */
export interface TechnicianDistance {
  technicianId: string;
  technicianName: string;
  willingToTravel: boolean;
  distanceMiles: number | null;
  drivingTimeMinutes: number | null;
  perDiemEligible: boolean;
  calculatedAt: Date;
}

/**
 * Per diem configuration
 */
export interface PerDiemConfig {
  minimumDistanceMiles: number;  // Default: 50
  ratePerMile: number;           // Default: 0.655 (IRS rate)
  flatRateAmount: number | null; // Optional flat rate
}
