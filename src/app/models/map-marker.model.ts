export class MapMarker {
    id: string;
    segmentId: string;
    latitude: number;
    longitude: number;
    isActive: boolean = true;
    dateCreated: Date;
    constructor(
        id: string,
        segmentId: string,
        latitude: number,
        longitude: number,
        isActive: boolean,
        dateCreated: Date
      ) {
        this.id = id;
        this.segmentId = segmentId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.isActive = isActive;
        this.dateCreated = dateCreated;
      }
  }