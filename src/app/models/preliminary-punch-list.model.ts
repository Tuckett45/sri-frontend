export class IssueArea {
  area: string; // The name of the issue area (e.g., Vault Issues, DB Issues, etc.)
  qualityIssues: string[]; // List of quality issues for the given area

  constructor(area: string, qualityIssues: string[] = []) {
    this.area = area;
    this.qualityIssues = qualityIssues;
  }
}

export class PreliminaryPunchList {
  // Basic project details
  segmentId: string;
  vendorName:string;
  streetAddress: string;
  city: string;
  state: string;

  // Combined Issue Areas
  issues: IssueArea[]; // List of issue areas and their respective quality issues

  additionalConcerns: string; // Any additional concerns not captured by the issues above
  dateReported: Date; // Date when the punch list was reported

  issueImage: string | null; // Base64 encoded string or URL for an image, can be null if no image is available

  pmResolved: boolean; // Indicates whether the project manager has resolved the issue
  resolutionImage: string | null;
  cmResolved: boolean; // Indicates whether the construction manager has resolved the issue
  dateResolved: Date | null; // Date when the issues were resolved, can be null if unresolved

  // Constructor to initialize properties
  constructor(
    segmentId: string,
    vendorName: string,
    streetAddress: string,
    city: string,
    state: string,
    issues: IssueArea[] = [],
    additionalConcerns: string = '',
    dateReported: Date = new Date(),
    issueImage: string | null = null,
    pmResolved: boolean = false,
    resolutionImage: string | null = null,
    cmResolved: boolean = false,
    dateResolved: Date | null = null
  ) {
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
    this.resolutionImage = resolutionImage;
    this.cmResolved = cmResolved;
    this.dateResolved = dateResolved;
  }
}