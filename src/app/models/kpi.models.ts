// src/app/models/kpi.models.ts
export interface MetroYearSummary {
  id: string;
  year: number;
  metro: string;
  isAverageRow: boolean;

  planned_Avg_Per_HHP?: number | null;
  laborCostToDate_Avg_Per_HHP?: number | null;
  plan_AvgLabor_Per_HHP?: number | null;
  actualToDate_AllIn_Per_HHP?: number | null;
  plan_AllIn_Per_HHP?: number | null;
  actualToDate_Median_Per_HHP?: number | null;
  plan_Median_Per_HHP?: number | null;

  planned_Avg_Per_LFT?: number | null;
  actualToDate_Avg_Per_LFT?: number | null;
  plan_Avg_Per_LFT?: number | null;
  actualToDate_Median_Per_LFT?: number | null;
  plan_Median_Per_LFT?: number | null;

  sxU_Percent?: number | null;

  createdAtUtc: string;
  updatedAtUtc?: string | null;
}

export interface MetroByMonthOverview {
  id: string;
  year: number;
  /** 1–12, or 0 for totals row */
  month: number;
  isTotalsRow: boolean;

  segmentCount?: number | null;
  eng_Dollars?: number | null;
  permit_Dollars?: number | null;
  material_Dollars?: number | null;
  plannedCost_Dollars?: number | null;
  current_TotalAllIn_Dollars?: number | null;

  hhp?: number | null;
  sfu?: number | null;
  mdu?: number | null;
  sbu?: number | null;
  mtu?: number | null;

  allIn_Per_HHP?: number | null;
  hhP_Delta?: number | null;
  sxu?: number | null;
  sxu_Percent?: number | null;

  avg_LFT_Per_Day?: number | null;
  avg_Dollars_Per_Material?: number | null;

  createdAtUtc: string;
  updatedAtUtc?: string | null;
}

export interface MetroByMunicipalityOverview {
  id: string;
  year: number;
  city: string;
  isTotalsRow: boolean;

  segmentCount?: number | null;
  eng_Dollars?: number | null;
  permit_Dollars?: number | null;
  material_Dollars?: number | null;
  plannedCost_Dollars?: number | null;
  current_TotalAllIn_Dollars?: number | null;

  hhp?: number | null;
  sfu?: number | null;
  mdu?: number | null;
  sbu?: number | null;
  mtu?: number | null;

  allIn_Per_HHP?: number | null;
  hhP_Delta?: number | null;
  sxu?: number | null;
  sxu_Percent?: number | null;

  avg_LFT_Per_Day?: number | null;
  avg_Dollars_Per_Material?: number | null;

  createdAtUtc: string;
  updatedAtUtc?: string | null;
}
