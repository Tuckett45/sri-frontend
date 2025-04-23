export class StatePunchListStats {
    constructor(
      public state: string | null,
      public totalCountByState: number,
      public resolvedCountByState: number,
      public unresolvedCountByState: number
    ) {}
  }