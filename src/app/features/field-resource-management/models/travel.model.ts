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
 * Travel preferences
 */
export interface TravelPreferences {
  maxTravelRadiusMiles: number | null;
  preferredTransportation: TransportationMode;
  notes: string;
}

/**
 * Transportation mode enum
 */
export enum TransportationMode {
  PersonalVehicle = 'personal-vehicle',
  CompanyVehicle = 'company-vehicle',
  Flight = 'flight',
  Any = 'any'
}

/**
 * Travel history entry
 */
export interface TravelHistoryEntry {
  jobId: string;
  clientName: string;
  destination: string;
  distanceMiles: number;
  drivingTimeMinutes: number;
  perDiemEligible: boolean;
  perDiemAmount: number | null;
  travelDate: Date;
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
  preferences: TravelPreferences | null;
  travelHistory: TravelHistoryEntry[];
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
