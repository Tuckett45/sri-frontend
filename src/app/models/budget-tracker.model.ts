
export interface BudgetTrackerHeader {
  RowId: string;
  ConlogLink?: string | null;
  ClaimMonthYear?: string | null;
  Segment?: string | null;
  City?: string | null;
  Crew?: string | null;
}

export interface BudgetTrackerFT {
  RowId: string;
  CrewLead?: string | null;
  Vendor?: string | null;
  Status?: string | null;
  Market?: string | null;
  Gmm?: string | null;
  ReportDate?: string | null;
  InvoiceDate?: string | null;
  PaidDate?: string | null;
  PaidAmount?: number | null;
  CostToDate?: number | null;
  EstAtComplete?: number | null;
  RemainingWorkAmount?: number | null;
  BalanceRemainingAmount?: number | null;
  VarianceReason?: string | null;
  Notes?: string | null;
}

export interface BudgetTrackerUAE {
  RowId: string;
  EngDollars?: number | null;
  PermitDollars?: number | null;
  MaterialDollars?: number | null;
  CeDollars?: number | null;
  EngMatPerm?: string | null;
  DollarsHhpPreConst?: number | null;
  DollarsLftPreConst?: number | null;
  PlanningCost?: number | null;
  WorkPackageDollars?: number | null;
  WorkPackageContingency?: string | null;
  TotalCostEngMatPermLabor?: number | null;
}

export interface BudgetTrackerAFAI {
  RowId: string;
  ForecastedDollarsHhpCeData?: number | null;
  ForecastedDollarsLftCeData?: number | null;
  ForecastedSxuPercentCeData?: number | null;
  LftHhpDensity?: number | null;
}

export interface BudgetTrackerAKAN {
  RowId: string;
  ForecastedDollarsHhp?: number | null;
  ForecastedDollarsLft?: number | null;
  DollarsMat?: number | null;
  ForecastedSxuPercent?: number | null;
}

export interface BudgetTrackerAOBC {
  RowId: string;
  WorkPackagePlannedLaborDollars?: number | null;
  WorkPackageContingencyDollars?: number | null;
  WorkPackageDollarsLaborContingency?: number | null;
  ActualSpendToDate?: string | null;
  ConstWpDollarsConsumptionAccrued?: number | null;
  PlannedLaborAccrual?: number | null;
  AtCompleteCost?: number | null;
  AtCompWorkPackageDiffDollars?: number | null;
  AtCompLaborWorkPackageDiffPercent?: number | null;
  PlannedTotalFootage?: string | null;
  CeTotalFootage?: string | null;
  WorkPackageTotalFootage?: string | null;
  LftCompletedLinkedToConlog?: number | null;
  RemainingLft?: number | null;
  RemainingFunds?: string | null;
}

export interface BudgetTrackerBVCN {
  RowId: string;
  FinalLaborCost?: number | null;
  TotalDollarsAllIn?: number | null;
  Hhp?: number | null;
  Sfu?: number | null;
  Mdu?: number | null;
  Sbu?: number | null;
  Mtu?: number | null;
  PercentChgInHhp?: number | null;
  Sxu?: number | null;
  PercentSxu?: number | null;
  PercentChgInSxu?: number | null;
  FinalLft?: number | null;
  FinalDollarsHhp?: number | null;
  DollarsHhpDelta?: number | null;
  DollarsHhpPercentChange?: number | null;
  FinalDollarsLft?: number | null;
  FinalDollarsLftChange?: number | null;
  Labor?: number | null;
  DollarsLftPercentChange?: number | null;
}

export interface BudgetTrackerCODH {
  RowId: string;
  ActualConstStart?: string | null;
  ActualSawsUpDate?: string | null;
  ActualTAccepted?: string | null;
  AsbuiltsReceived?: number | null;
  AsbuiltsConstrDuration?: number | null;
  AsbuiltsToEng?: number | null;
  AsbuiltsPgmToEngDuration?: number | null;
  AsbuiltsCompletedFmsIngested?: number | null;
  AsbuiltsFmsIngestedDuration?: number | null;
  TotalAsbuiltDuration?: number | null;
  ConstFinalAccepted?: string | null;
  ClosedOut?: string | null;
  ActualServiceabilityDate?: string | null;
  AvgLftPerDay?: number | null;
  ForecastedConstStartVsActualConstStart?: string | null;
  DurationConstStartSawsUpDate?: string | null;
  DurationStartToTAccept?: string | null;
  DurationTAToFinal?: string | null;
  DurationFinalToCloseout?: string | null;
  DurationToCloseout?: string | null;
}

export interface BudgetTrackerDLDT {
  RowId: string;
  YesterdayOnlyLft?: number | null;
  CurrentWeekLftTotal?: number | null;
  CurrentWeekLftDailyAvg?: number | null;
  LastWeekLftTotal?: number | null;
  LastWeekLftDailyAvg?: number | null;
  OverallLftDailyAvg?: number | null;
  BorePlan?: string | null;
  BoreActual?: string | null;
  BoreCompletionPercent?: string | null;
}

export interface BudgetTrackerDUEJ {
  RowId: string;
  DollarsHhp?: number | null;
  FinalHhp?: number | null;
  FinalSfu?: number | null;
  FinalMdu?: number | null;
  FinalSbu?: number | null;
  FinalMtu?: number | null;
  FinalSxu?: number | null;
  Percentsxu?: number | null;
  Lft?: number | null;
  DollarsLft?: number | null;
  HhpDelta?: number | null;
  LftPercentComplete?: number | null;
  FinalTA?: string | null;
  FinalCost?: number | null;
  PlannedCostData?: number | null;
  PlannedDollarsHhp?: number | null;
}

export interface BudgetTrackerRow {
  Header: BudgetTrackerHeader;
  FT?: BudgetTrackerFT | null;
  UAE?: BudgetTrackerUAE | null;
  AFAI?: BudgetTrackerAFAI | null;
  AKAN?: BudgetTrackerAKAN | null;
  AOBC?: BudgetTrackerAOBC | null;
  BVCN?: BudgetTrackerBVCN | null;
  CODH?: BudgetTrackerCODH | null;
  DLDT?: BudgetTrackerDLDT | null;
  DUEJ?: BudgetTrackerDUEJ | null;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}
