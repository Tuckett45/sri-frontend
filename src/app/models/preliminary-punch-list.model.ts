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

  issueImage: File | null; 
  pmResolved: boolean;
  cmResolved: boolean; 
  resolutionImage: File | null; 
  dateResolved: Date | null; 

  constructor(
    segmentId: string,
    vendorName: string,
    streetAddress: string,
    city: string,
    state: string,
    issues: IssueArea[] = [],
    additionalConcerns: string = '',
    dateReported: Date = new Date(),
    issueImage: File | null = null,
    pmResolved: boolean = false,
    cmResolved: boolean = false,
    resolutionImage: File | null = null,
    dateResolved: Date | null = null,
    id: string
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
    this.issueImage = issueImage;
    this.pmResolved = pmResolved;
    this.cmResolved = cmResolved;
    this.resolutionImage = resolutionImage;
    this.dateResolved = dateResolved;
  }
}