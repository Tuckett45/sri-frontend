export class TotalVendorIssueStats {
    constructor(
      public area: string | null,
      public congruexIssues: number,
      public ervinIssues: number,
      public blueEdgeIssues: number,
      public northStarIssues: number
    ) {}
  }