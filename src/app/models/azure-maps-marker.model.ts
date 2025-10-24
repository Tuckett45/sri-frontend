export interface AzureMapsMarker {
  id: string;
  position: [number, number]; // [longitude, latitude]
  properties?: {
    title?: string;
    description?: string;
    color?: string;
    icon?: string;
    [key: string]: any;
  };
  popup?: {
    content: string;
    options?: any;
  };
}

export interface LiveMarker extends AzureMapsMarker {
  userId?: string;
  userEmail?: string;
  isLive: boolean;
  lastUpdated: Date;
  accuracy?: number;
}

export interface MarkerCluster {
  id: string;
  position: [number, number];
  markers: AzureMapsMarker[];
  count: number;
}
