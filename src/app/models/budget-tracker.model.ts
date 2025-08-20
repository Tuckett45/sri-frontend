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

// Raw row as returned by the API. Most section fields are flattened and
// snake_cased, so we capture that shape here for transformation.
export interface BudgetTrackerApiRow {
  RowId: string;
  ConlogLink?: string | null;
  ClaimMonthYear?: string | null;
  Segment?: string | null;
  City?: string | null;
  Crew?: string | null;

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

  eng_dollars?: number | null;
  permit_dollars?: number | null;
  material_dollars?: number | null;
  ce_dollars?: number | null;
  eng_mat_perm?: string | null;
  dollars_hhp_pre_const?: number | null;
  dollars_lft_pre_const?: number | null;
  planning_cost?: number | null;
  work_package_dollars?: number | null;
  work_package_contingency?: string | null;
  total_cost_eng_mat_perm_labor?: number | null;

  forecasted_dollars_hhp_ce_data?: number | null;
  forecasted_dollars_lft_ce_data?: number | null;
  forecasted_sxu_percent_ce_data?: number | null;
  lft_hhp_density?: number | null;

  forecasted_dollars_hhp?: number | null;
  forecasted_dollars_lft?: number | null;
  dollars_mat?: number | null;
  forecasted_sxu_percent?: number | null;

  work_package_planned_labor_dollars?: number | null;
  work_package_contingency_dollars?: number | null;
  work_package_dollars_labor_contingency?: number | null;
  actual_spend_to_date?: string | null;
  const_wp_dollars_consumption_accrued?: number | null;
  planned_labor_accrual?: number | null;
  at_complete_cost?: number | null;
  at_comp_work_package_diff_dollars?: number | null;
  at_comp_labor_work_package_diff_percent?: number | null;
  planned_total_footage?: string | null;
  ce_total_footage?: string | null;
  work_package_total_footage?: string | null;
  lft_completed_linked_to_conlog?: number | null;
  remaining_lft?: number | null;
  remaining_funds?: string | null;

  final_labor_cost?: number | null;
  total_dollars_all_in?: number | null;
  hhp?: number | null;
  sfu?: number | null;
  mdu?: number | null;
  sbu?: number | null;
  mtu?: number | null;
  percent_chg_in_hhp?: number | null;
  sxu?: number | null;
  percent_sxu?: number | null;
  percent_chg_in_sxu?: number | null;
  final_lft?: number | null;
  final_dollars_hhp?: number | null;
  dollars_hhp_delta?: number | null;
  dollars_hhp_percent_change?: number | null;
  final_dollars_lft?: number | null;
  final_dollars_lft_change?: number | null;
  labor?: number | null;
  dollars_lft_percent_change?: number | null;

  actual_const_start?: string | null;
  actual_saws_up_date?: string | null;
  actual_t_a_accepted?: string | null;
  asbuilts_received?: number | null;
  asbuilts_constr_duration?: number | null;
  asbuilts_to_eng?: number | null;
  asbuilts_pgm_to_eng_duration?: number | null;
  asbuilts_completed_fms_ingested?: number | null;
  asbuilts_fms_ingested_duration?: number | null;
  total_asbuilt_duration?: number | null;
  const_final_accepted?: string | null;
  closed_out?: string | null;
  actual_serviceability_date?: string | null;
  avg_lft_per_day?: number | null;
  forecasted_const_start_vs_actual_const_start?: string | null;
  duration_const_start_saws_up_date?: string | null;
  duration_start_to_t_a_accept?: string | null;
  duration_t_a_to_final?: string | null;
  duration_final_to_closeout?: string | null;
  duration_to_closeout?: string | null;

  yesterday_only_lft?: number | null;
  current_week_lft_total?: number | null;
  current_week_lft_daily_avg?: number | null;
  last_week_lft_total?: number | null;
  last_week_lft_daily_avg?: number | null;
  overall_lft_daily_avg?: number | null;
  bore_plan?: string | null;
  bore_actual?: string | null;
  bore_completion_percent?: string | null;

  dollars_hhp?: number | null;
  final_hhp?: number | null;
  final_sfu?: number | null;
  final_mdu?: number | null;
  final_sbu?: number | null;
  final_mtu?: number | null;
  final_sxu?: number | null;
  percentsxu?: number | null;
  lft?: number | null;
  dollars_lft?: number | null;
  hhp_delta?: number | null;
  lft_percent_complete?: number | null;
  final_t_a?: string | null;
  final_cost?: number | null;
  planned_cost_data?: number | null;
  planned_dollars_hhp?: number | null;
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

// Transform a raw API row into the structured BudgetTrackerRow used in the UI
export function toBudgetTrackerRow(raw: BudgetTrackerApiRow): BudgetTrackerRow {
  const Header: BudgetTrackerHeader = {
    RowId: raw.RowId,
    ConlogLink: raw.ConlogLink,
    ClaimMonthYear: raw.ClaimMonthYear,
    Segment: raw.Segment,
    City: raw.City,
    Crew: raw.Crew,
  };

  const FT: BudgetTrackerFT = {
    RowId: raw.RowId,
    CrewLead: raw.CrewLead,
    Vendor: raw.Vendor,
    Status: raw.Status,
    Market: raw.Market,
    Gmm: raw.Gmm,
    ReportDate: raw.ReportDate,
    InvoiceDate: raw.InvoiceDate,
    PaidDate: raw.PaidDate,
    PaidAmount: raw.PaidAmount,
    CostToDate: raw.CostToDate,
    EstAtComplete: raw.EstAtComplete,
    RemainingWorkAmount: raw.RemainingWorkAmount,
    BalanceRemainingAmount: raw.BalanceRemainingAmount,
    VarianceReason: raw.VarianceReason,
    Notes: raw.Notes,
  };

  const UAE: BudgetTrackerUAE = {
    RowId: raw.RowId,
    EngDollars: raw.eng_dollars,
    PermitDollars: raw.permit_dollars,
    MaterialDollars: raw.material_dollars,
    CeDollars: raw.ce_dollars,
    EngMatPerm: raw.eng_mat_perm,
    DollarsHhpPreConst: raw.dollars_hhp_pre_const,
    DollarsLftPreConst: raw.dollars_lft_pre_const,
    PlanningCost: raw.planning_cost,
    WorkPackageDollars: raw.work_package_dollars,
    WorkPackageContingency: raw.work_package_contingency,
    TotalCostEngMatPermLabor: raw.total_cost_eng_mat_perm_labor,
  };

  const AFAI: BudgetTrackerAFAI = {
    RowId: raw.RowId,
    ForecastedDollarsHhpCeData: raw.forecasted_dollars_hhp_ce_data,
    ForecastedDollarsLftCeData: raw.forecasted_dollars_lft_ce_data,
    ForecastedSxuPercentCeData: raw.forecasted_sxu_percent_ce_data,
    LftHhpDensity: raw.lft_hhp_density,
  };

  const AKAN: BudgetTrackerAKAN = {
    RowId: raw.RowId,
    ForecastedDollarsHhp: raw.forecasted_dollars_hhp,
    ForecastedDollarsLft: raw.forecasted_dollars_lft,
    DollarsMat: raw.dollars_mat,
    ForecastedSxuPercent: raw.forecasted_sxu_percent,
  };

  const AOBC: BudgetTrackerAOBC = {
    RowId: raw.RowId,
    WorkPackagePlannedLaborDollars: raw.work_package_planned_labor_dollars,
    WorkPackageContingencyDollars: raw.work_package_contingency_dollars,
    WorkPackageDollarsLaborContingency: raw.work_package_dollars_labor_contingency,
    ActualSpendToDate: raw.actual_spend_to_date,
    ConstWpDollarsConsumptionAccrued: raw.const_wp_dollars_consumption_accrued,
    PlannedLaborAccrual: raw.planned_labor_accrual,
    AtCompleteCost: raw.at_complete_cost,
    AtCompWorkPackageDiffDollars: raw.at_comp_work_package_diff_dollars,
    AtCompLaborWorkPackageDiffPercent: raw.at_comp_labor_work_package_diff_percent,
    PlannedTotalFootage: raw.planned_total_footage,
    CeTotalFootage: raw.ce_total_footage,
    WorkPackageTotalFootage: raw.work_package_total_footage,
    LftCompletedLinkedToConlog: raw.lft_completed_linked_to_conlog,
    RemainingLft: raw.remaining_lft,
    RemainingFunds: raw.remaining_funds,
  };

  const BVCN: BudgetTrackerBVCN = {
    RowId: raw.RowId,
    FinalLaborCost: raw.final_labor_cost,
    TotalDollarsAllIn: raw.total_dollars_all_in,
    Hhp: raw.hhp,
    Sfu: raw.sfu,
    Mdu: raw.mdu,
    Sbu: raw.sbu,
    Mtu: raw.mtu,
    PercentChgInHhp: raw.percent_chg_in_hhp,
    Sxu: raw.sxu,
    PercentSxu: raw.percent_sxu,
    PercentChgInSxu: raw.percent_chg_in_sxu,
    FinalLft: raw.final_lft,
    FinalDollarsHhp: raw.final_dollars_hhp,
    DollarsHhpDelta: raw.dollars_hhp_delta,
    DollarsHhpPercentChange: raw.dollars_hhp_percent_change,
    FinalDollarsLft: raw.final_dollars_lft,
    FinalDollarsLftChange: raw.final_dollars_lft_change,
    Labor: raw.labor,
    DollarsLftPercentChange: raw.dollars_lft_percent_change,
  };

  const CODH: BudgetTrackerCODH = {
    RowId: raw.RowId,
    ActualConstStart: raw.actual_const_start,
    ActualSawsUpDate: raw.actual_saws_up_date,
    ActualTAccepted: raw.actual_t_a_accepted,
    AsbuiltsReceived: raw.asbuilts_received,
    AsbuiltsConstrDuration: raw.asbuilts_constr_duration,
    AsbuiltsToEng: raw.asbuilts_to_eng,
    AsbuiltsPgmToEngDuration: raw.asbuilts_pgm_to_eng_duration,
    AsbuiltsCompletedFmsIngested: raw.asbuilts_completed_fms_ingested,
    AsbuiltsFmsIngestedDuration: raw.asbuilts_fms_ingested_duration,
    TotalAsbuiltDuration: raw.total_asbuilt_duration,
    ConstFinalAccepted: raw.const_final_accepted,
    ClosedOut: raw.closed_out,
    ActualServiceabilityDate: raw.actual_serviceability_date,
    AvgLftPerDay: raw.avg_lft_per_day,
    ForecastedConstStartVsActualConstStart: raw.forecasted_const_start_vs_actual_const_start,
    DurationConstStartSawsUpDate: raw.duration_const_start_saws_up_date,
    DurationStartToTAccept: raw.duration_start_to_t_a_accept,
    DurationTAToFinal: raw.duration_t_a_to_final,
    DurationFinalToCloseout: raw.duration_final_to_closeout,
    DurationToCloseout: raw.duration_to_closeout,
  };

  const DLDT: BudgetTrackerDLDT = {
    RowId: raw.RowId,
    YesterdayOnlyLft: raw.yesterday_only_lft,
    CurrentWeekLftTotal: raw.current_week_lft_total,
    CurrentWeekLftDailyAvg: raw.current_week_lft_daily_avg,
    LastWeekLftTotal: raw.last_week_lft_total,
    LastWeekLftDailyAvg: raw.last_week_lft_daily_avg,
    OverallLftDailyAvg: raw.overall_lft_daily_avg,
    BorePlan: raw.bore_plan,
    BoreActual: raw.bore_actual,
    BoreCompletionPercent: raw.bore_completion_percent,
  };

  const DUEJ: BudgetTrackerDUEJ = {
    RowId: raw.RowId,
    DollarsHhp: raw.dollars_hhp,
    FinalHhp: raw.final_hhp,
    FinalSfu: raw.final_sfu,
    FinalMdu: raw.final_mdu,
    FinalSbu: raw.final_sbu,
    FinalMtu: raw.final_mtu,
    FinalSxu: raw.final_sxu,
    Percentsxu: raw.percentsxu,
    Lft: raw.lft,
    DollarsLft: raw.dollars_lft,
    HhpDelta: raw.hhp_delta,
    LftPercentComplete: raw.lft_percent_complete,
    FinalTA: raw.final_t_a,
    FinalCost: raw.final_cost,
    PlannedCostData: raw.planned_cost_data,
    PlannedDollarsHhp: raw.planned_dollars_hhp,
  };

  return {
    Header,
    FT,
    UAE,
    AFAI,
    AKAN,
    AOBC,
    BVCN,
    CODH,
    DLDT,
    DUEJ,
  };
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

