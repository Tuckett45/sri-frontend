export class MapMarker {
    id: string;
    streetSheetId: string;
    latitude: number;
    longitude: number;
    isActive: boolean = true;
    dateCreated: Date;
    constructor(
        id: string,
        streetSheetId: string,
        latitude: number,
        longitude: number,
        isActive: boolean,
        dateCreated: Date
      ) {
        this.id = id;
        this.streetSheetId = streetSheetId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.isActive = isActive;
        this.dateCreated = dateCreated;
      }
  }