export class PreliminaryPunchList {
    // Basic project details
    segmentId: string;
    streetAddress: string;
    city: string;
    state: string;

    vaultIssues: string[]; // List of vault issues identified
    dbIssues: string[]; // List of database issues
    trenchIssues: string[]; // List of trench issues
    siteCleanUp: string[]; // List of site clean-up items
    sidewalkPanels: string[]; // Sidewalk panel issues
    sealantIssues: string[]; // Sealant issues found
  
    additionalConcerns: string; // Any additional concerns not captured by the issues above
    notifiedTo: string; // Person who was notified about the issues
    notifiedHow: string; // Method of notification (e.g., email, phone call)
    dateReported: Date; // Date when the punch list was reported
  
    issueImage: string | null; // Base64 encoded string or URL for an image, can be null if no image is available
  
    pmResolved: boolean; // Indicates whether the project manager has resolved the issue
    cmResolved: boolean; // Indicates whether the construction manager has resolved the issue
    resolvedDate: Date | null; // Date when the issues were resolved, can be null if unresolved
  
    // Constructor to initialize properties
    constructor(
      segmentId: string,
      streetAddress: string,
      city: string,
      state: string,
      vaultIssues: string[] = [],
      dbIssues: string[] = [],
      trenchIssues: string[] = [],
      siteCleanUp: string[] = [],
      sidewalkPanels: string[] = [],
      sealantIssues: string[] = [],
      additionalConcerns: string = '',
      notifiedTo: string = '',
      notifiedHow: string = '',
      dateReported: Date = new Date(),
      issueImage: string | null = null,
      pmResolved: boolean = false,
      cmResolved: boolean = false,
      resolvedDate: Date | null = null
    ) {
      this.segmentId = segmentId;
      this.streetAddress = streetAddress;
      this.city = city;
      this.state = state;
      this.vaultIssues = vaultIssues;
      this.dbIssues = dbIssues;
      this.trenchIssues = trenchIssues;
      this.siteCleanUp = siteCleanUp;
      this.sidewalkPanels = sidewalkPanels;
      this.sealantIssues = sealantIssues;
      this.additionalConcerns = additionalConcerns;
      this.notifiedTo = notifiedTo;
      this.notifiedHow = notifiedHow;
      this.dateReported = dateReported;
      this.issueImage = issueImage;
      this.pmResolved = pmResolved;
      this.cmResolved = cmResolved;
      this.resolvedDate = resolvedDate;
    }
  }