import { MapMarker } from "./map-marker.model";

export class StreetSheet {
    id: string;
    segmentId: string;
    pm: string;
    vendorName: string;
    streetAddress: string;
    city: string;
    state: string;
    deployment: string;
    date: Date;
    swpppImage?: string;
    ppeImage?: string;
    trafficControlImage?: string;
    signageImage?: string;
    createdBy?: string;
    updatedBy?: string;
    updatedDate?: Date;
    
    marker: MapMarker[];

    constructor(
        id: string,         
        segmentId: string,        
        pm: string,       
        vendorName: string,      
        streetAddress: string,
        city: string,           
        state: string, 
        deployment: string,   
        date: Date,      
        swpppImage: string,     
        ppeImage: string,   
        trafficControlImage: string,
        signageImage: string, 
        createdBy?: string,
        updatedBy?: string,
        updatedDate?: Date,   
        marker: MapMarker[] = []
    ) {
        this.id = id;
        this.segmentId = segmentId;
        this.pm = pm;
        this.vendorName = vendorName;
        this.streetAddress = streetAddress;
        this.city = city;
        this.state = state;
        this.deployment = deployment;
        this.date = date;
        this.swpppImage = swpppImage;
        this.ppeImage = ppeImage;
        this.trafficControlImage = trafficControlImage;
        this.signageImage = signageImage;
        this.createdBy = createdBy;
        this.updatedBy = updatedBy;
        this.updatedDate = updatedDate;
        this.marker = marker;
    }
}
