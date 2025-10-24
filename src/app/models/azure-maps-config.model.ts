export interface AzureMapsConfig {
  subscriptionKey: string;
  region?: string;
  language?: string;
  view?: string;
}

export interface AzureMapsSearchResult {
  id: string;
  address: string;
  position: {
    latitude: number;
    longitude: number;
  };
  score: number;
  addressDetails: {
    streetNumber?: string;
    streetName?: string;
    municipality?: string;
    countrySubdivision?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface AzureMapsSearchResponse {
  results: AzureMapsSearchResult[];
  count: number;
}

export interface AzureMapsReverseGeocodeResult {
  formattedAddress: string;
  streetNumber?: string;
  streetName?: string;
  municipality?: string;
  countrySubdivision?: string;
  postalCode?: string;
  country?: string;
  position: {
    latitude: number;
    longitude: number;
  };
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface RouteSummary {
  lengthInMeters: number;
  travelTimeInSeconds: number;
  trafficDelayInSeconds?: number;
}

export interface RouteLeg {
  summary: RouteSummary;
  points: RoutePoint[];
}

export interface AzureMapsRoute {
  summary: RouteSummary;
  legs: RouteLeg[];
}

export interface TrafficIncident {
  id: string;
  type: string;
  geometry: {
    type: string;
    coordinates: number[][];
  };
  properties: {
    iconCategory: number;
    magnitudeOfDelay: number;
    events: any[];
    startTime: string;
    endTime: string;
    from: string;
    to: string;
    length: number;
    delay: number;
    roadNumbers: string[];
    timeValidity: string;
  };
}
