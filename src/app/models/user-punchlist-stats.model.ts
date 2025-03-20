export class UserPunchListStats {
    constructor(
      public name: string | null,
      public totalCountByUser: number,
      public resolvedCountByUser: number,
      public unresolvedCountByUser: number
    ) {}
  }