export class StatePunchListStats {
    constructor(
      public state: string,
      public totalCountByState: number,
      public resolvedCountByState: number,
      public unresolvedCountByState: number
    ) {}
  }