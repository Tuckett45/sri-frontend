import { PunchListImages } from "./punch-list-images.model";

export class IssueArea {
  id: string; 
  area: string;
  qualityIssues: string;
  preliminaryPunchListId: string; 

  constructor(area: string, qualityIssues: string, id: string, preliminaryPunchListId: string) {
    this.area = area;
    this.qualityIssues = qualityIssues;
    this.id = id; 
    this.preliminaryPunchListId = preliminaryPunchListId; 
  }
}

export class PreliminaryPunchList {
  id: string;
  segmentId: string;
  vendorName: string;
  streetAddress: string;
  city: string;
  state: string;
  issues: IssueArea[];
  additionalConcerns: string;
  dateReported: Date;
  pmResolved: boolean;
  cmResolved: boolean;
  resolvedDate: Date;
  issueImages: PunchListImages[]; 
  resolutionImages?: PunchListImages[];
  createdBy?: string;
  updatedBy?: string; 
  updatedDate: Date | null;
  resolvedBy?: string;

  [key: string]: any;

  constructor(
    id: string,
    segmentId: string,
    vendorName: string,
    streetAddress: string,
    city: string,
    state: string,
    issues: IssueArea[] = [],
    additionalConcerns: string = '',
    dateReported: Date = new Date(),
    pmResolved: boolean = false,
    cmResolved: boolean = false,
    resolvedDate: Date,
    issueImages: PunchListImages[] = [],
    resolutionImages: PunchListImages[] = [], 
    createdBy?: string,
    updatedBy?: string,
    updatedDate: Date | null = null,
    resolvedBy?: string
  ) {
    this.id = id;
    this.segmentId = segmentId;
    this.vendorName = vendorName;
    this.streetAddress = streetAddress;
    this.city = city;
    this.state = state;
    this.issues = issues;
    this.additionalConcerns = additionalConcerns;
    this.dateReported = dateReported;
    this.pmResolved = pmResolved;
    this.cmResolved = cmResolved;
    this.resolvedDate = resolvedDate;
    this.issueImages = issueImages;
    this.resolutionImages = resolutionImages;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.updatedDate = updatedDate;
    this.resolvedBy = resolvedBy;
  }
}