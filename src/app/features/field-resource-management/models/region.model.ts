export interface Region {
  id: string;
  name: string;
  technicianCount: number;
  jobCount: number;
  boundaries: RegionBoundaries;
  createdAt: Date;
  updatedAt?: Date;
}

export interface RegionBoundaries {
  states?: string[];
  zipCodes?: string[];
  coordinates?: GeoCoordinate[];
}

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface CreateRegionDto {
  name: string;
  boundaries: RegionBoundaries;
}

export interface UpdateRegionDto {
  name?: string;
  boundaries?: RegionBoundaries;
}
