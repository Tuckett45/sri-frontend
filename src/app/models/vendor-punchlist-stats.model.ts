export class VendorPunchListStats {
    constructor(
      public vendorName: string,
      public totalCount: number,
      public resolvedCount: number,
      public unresolvedCount: number
    ) {}
  }
  