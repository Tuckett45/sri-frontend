export class IssueArea {
  id?: string; // ID for the IssueArea (optional)
  area: string; // The name of the issue area (e.g., Vault Issues, DB Issues, etc.)
  qualityIssues: string[]; // List of quality issues for the given area
  preliminaryPunchListId?: string; // Foreign key to PreliminaryPunchList (optional)

  constructor(area: string, qualityIssues: string[] = [], id?: string, preliminaryPunchListId?: string) {
    this.area = area;
    this.qualityIssues = qualityIssues;
    this.id = id; // Optional ID for consistency with back-end
    this.preliminaryPunchListId = preliminaryPunchListId; // Optional FK
  }
}

export class PreliminaryPunchList {
  // Basic project details
  id?: string; // ID (optional, generated on front-end)
  segmentId: string;
  vendorName: string;
  streetAddress: string;
  city: string;
  state: string;

  // Combined Issue Areas
  issues: IssueArea[]; // List of issue areas and their respective quality issues

  additionalConcerns: string; // Any additional concerns
  dateReported: Date; // Date when the punch list was reported

  issueImage: string | null; // Base64 encoded string or URL for an image, can be null
  pmResolved: boolean; // Project Manager resolution status
  cmResolved: boolean; // Construction Manager resolution status
  resolutionImage: string | null; // Image for resolution, can be null
  dateResolved: Date | null; // Date when resolved, can be null

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
    cmResolved: boolean = false,
    resolutionImage: string | null = null,
    dateResolved: Date | null = null,
    id?: string // Optional ID
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