export class UserPunchListStats {
    constructor(
      public name: string,
      public totalCountByUser: number,
      public resolvedCountByUser: number,
      public unresolvedCountByUser: number
    ) {}
  }