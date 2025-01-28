export class MapMarker {
    id: string;
    segmentId: string;
    latitude: number;
    longitude: number;
    isActive: boolean = true;
    dateCreated: Date;
    createdBy?: string;
    constructor(
        id: string,
        segmentId: string,
        latitude: number,
        longitude: number,
        isActive: boolean,
        dateCreated: Date,
        createdBy?: string
      ) {
        this.id = id;
        this.segmentId = segmentId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.isActive = isActive;
        this.dateCreated = dateCreated;
        this.createdBy = createdBy;
      }
  }