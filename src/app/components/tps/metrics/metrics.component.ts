import { Component, HostListener, OnInit } from '@angular/core';
import { TpsService } from 'src/app/services/tps.service';
import { MetroByMonthOverview, MetroByMunicipalityOverview } from 'src/app/models/kpi.models';

interface MetroYearSummary {
  id?: string;
  year: number;
  metro: string;
  isAverageRow?: boolean;
  [key: string]: any;
}

// View-models for normalized table rows
interface YearSummaryRow {
  id?: string;
  year: number;
  metro: string;
  isAverageRow?: boolean;

  planned_Avg_Per_HHP: number;
  laborCostToDate_Avg_Per_HHP: number;
  plan_AvgLabor_Per_HHP: number;
  actualToDate_AllIn_Per_HHP: number;
  plan_AllIn_Per_HHP: number;
  actualToDate_Median_Per_HHP: number;
  plan_Median_Per_HHP: number;

  planned_Avg_Per_LFT: number;
  actualToDate_Avg_Per_LFT: number;
  plan_Avg_Per_LFT: number;
  actualToDate_Median_Per_LFT: number;
  plan_Median_Per_LFT: number;

  sXU_Percent: number;

  createdAtUtc?: string;
  updatedAtUtc?: string | null;
}

interface MonthSummaryRow {
  id?: string;
  year: number;
  month: number;
  monthName: string;
  isTotalsRow?: boolean;

  segmentCount: number;
  eng_Dollars: number;
  permit_Dollars: number;
  material_Dollars: number;
  plannedCost_Dollars: number;
  current_TotalAllIn_Dollars: number;

  hhp: number;
  sfu: number;
  mdu: number;
  sbu: number;
  mtu: number;

  allIn_Per_HHP: number;
  hhp_Delta: number;
  sxu: number;
  sxu_Percent: number;

  avg_LFT_Per_Day: number;
  avg_Dollars_Per_Material: number;

  createdAtUtc?: string;
  updatedAtUtc?: string | null;
}

interface MuniSummaryRow {
  id?: string;
  year: number;
  city: string;
  isTotalsRow?: boolean;

  segmentCount: number;
  eng_Dollars: number;
  permit_Dollars: number;
  material_Dollars: number;
  plannedCost_Dollars: number;
  current_TotalAllIn_Dollars: number;

  hhp: number;
  sfu: number;
  mdu: number;
  sbu: number;
  mtu: number;

  allIn_Per_HHP: number;
  hhp_Delta: number;
  sxu: number;
  sxu_Percent: number;

  avg_LFT_Per_Day: number;
  avg_Dollars_Per_Material: number;

  createdAtUtc?: string;
  updatedAtUtc?: string | null;
}

@Component({
  selector: 'app-tps-metrics',
  templateUrl: './metrics.component.html',
  styleUrls: ['./metrics.component.scss']
})
export class MetricsComponent implements OnInit {
  // ===== Tables =====
  yearSummaryRows: YearSummaryRow[] = [];
  monthSummaryRows: MonthSummaryRow[] = [];
  muniSummaryRows: MuniSummaryRow[] = [];

  // ===== Filters / UI =====
  filtersOpen = false;
  isMobile = false;
  years: number[] = [2026, 2025, 2024];
  selectedYear: number = 2025;         // default to 2025 as requested
  metroText: string = '';               // optional filter; passes to Year/Month endpoints
  // View toggle: which API/view to display
  viewOptions = [
    { label: 'Year Summary', value: 'year' as const },
    { label: 'Monthly', value: 'month' as const },
    { label: 'Municipality', value: 'municipality' as const }
  ];
  selectedView: 'year' | 'month' | 'municipality' = 'year';

  // Mat-table displayed columns per view
  yearDisplayedColumns: string[] = [
    'year','metro','isAverageRow',
    'planned_Avg_Per_HHP','laborCostToDate_Avg_Per_HHP','plan_AvgLabor_Per_HHP','actualToDate_AllIn_Per_HHP','plan_AllIn_Per_HHP','actualToDate_Median_Per_HHP','plan_Median_Per_HHP',
    'planned_Avg_Per_LFT','actualToDate_Avg_Per_LFT','plan_Avg_Per_LFT','actualToDate_Median_Per_LFT','plan_Median_Per_LFT',
    'sXU_Percent'
  ];
  monthDisplayedColumns: string[] = [
    'year','month','monthName','isTotalsRow',
    'segmentCount','eng_Dollars','permit_Dollars','material_Dollars','plannedCost_Dollars','current_TotalAllIn_Dollars',
    'hhp','sfu','mdu','sbu','mtu',
    'allIn_Per_HHP','hhp_Delta','sxu','sxu_Percent',
    'avg_LFT_Per_Day','avg_Dollars_Per_Material'
  ];
  muniDisplayedColumns: string[] = [
    'year','city','isTotalsRow',
    'segmentCount','eng_Dollars','permit_Dollars','material_Dollars','plannedCost_Dollars','current_TotalAllIn_Dollars',
    'hhp','sfu','mdu','sbu','mtu',
    'allIn_Per_HHP','hhp_Delta','sxu','sxu_Percent',
    'avg_LFT_Per_Day','avg_Dollars_Per_Material'
  ];
  

  constructor(private tps: TpsService) {}

  ngOnInit(): void {
    this.updateIsMobile();
    this.applyFilters();
  }

  @HostListener('window:resize')
  onResize() {
    this.updateIsMobile();
  }

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  clearFilters(): void {
    this.metroText = '';
    this.applyFilters();
  }

  private updateIsMobile(): void {
    this.isMobile = window.innerWidth <= 768;
    if (!this.isMobile) this.filtersOpen = true;
  }

  private pickNum(obj: any, keys: string[], fallback = 0): number {
    for (const k of keys) {
      const v = obj?.[k];
      if (typeof v === 'number') return v;
      if (typeof v === 'string' && v.trim() !== '' && !isNaN(+v)) return +v;
    }
    return fallback;
  }

  private monthName(n: number): string {
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return names[(n ?? 0) - 1] ?? '';
    }

  async applyFilters(): Promise<void> {
    const view = this.selectedView;
    // Clear all to avoid showing stale data when switching views
    this.yearSummaryRows = [];
    this.monthSummaryRows = [];
    this.muniSummaryRows = [];

    if (view === 'year') {
      await this.loadYearSummary();
    } else if (view === 'month') {
      await this.loadMonthlySummary();
    } else if (view === 'municipality') {
      await this.loadMunicipalitySummary();
    }
  }

  private async loadYearSummary(): Promise<void> {
    const year = this.selectedYear;
    const metro = this.metroText?.trim() || undefined;
    try {
      const yearRows = await this.tps.getMetroYearSummary({
        year,
        metro,
        includeAverages: false
      }).toPromise();
      const nonAvg = (yearRows ?? []).filter(r => !r.isAverageRow && !r['isAverageRow']);
      this.yearSummaryRows = nonAvg.map(r => ({
        year: this.pickNum(r, ['year','Year']),
        metro: (r as any).metro ?? (r as any).Metro ?? '(unknown)',
        isAverageRow: Boolean((r as any).isAverageRow ?? (r as any).IsAverageRow ?? false),

        planned_Avg_Per_HHP: this.pickNum(r, ['planned_Avg_Per_HHP','Planned_Avg_Per_HHP']),
        laborCostToDate_Avg_Per_HHP: this.pickNum(r, ['laborCostToDate_Avg_Per_HHP','LaborCostToDate_Avg_Per_HHP']),
        plan_AvgLabor_Per_HHP: this.pickNum(r, ['plan_AvgLabor_Per_HHP','Plan_AvgLabor_Per_HHP']),
        actualToDate_AllIn_Per_HHP: this.pickNum(r, ['actualToDate_AllIn_Per_HHP','ActualToDate_AllIn_Per_HHP']),
        plan_AllIn_Per_HHP: this.pickNum(r, ['plan_AllIn_Per_HHP','Plan_AllIn_Per_HHP']),
        actualToDate_Median_Per_HHP: this.pickNum(r, ['actualToDate_Median_Per_HHP','ActualToDate_Median_Per_HHP']),
        plan_Median_Per_HHP: this.pickNum(r, ['plan_Median_Per_HHP','Plan_Median_Per_HHP']),

        planned_Avg_Per_LFT: this.pickNum(r, ['planned_Avg_Per_LFT','Planned_Avg_Per_LFT']),
        actualToDate_Avg_Per_LFT: this.pickNum(r, ['actualToDate_Avg_Per_LFT','ActualToDate_Avg_Per_LFT']),
        plan_Avg_Per_LFT: this.pickNum(r, ['plan_Avg_Per_LFT','Plan_Avg_Per_LFT']),
        actualToDate_Median_Per_LFT: this.pickNum(r, ['actualToDate_Median_Per_LFT','ActualToDate_Median_Per_LFT']),
        plan_Median_Per_LFT: this.pickNum(r, ['plan_Median_Per_LFT','Plan_Median_Per_LFT']),

        sXU_Percent: this.pickNum(r, ['sXU_Percent','SXU_Percent','sxu_Percent','sxU_Percent']),

        createdAtUtc: (r as any).createdAtUtc ?? (r as any).CreatedAtUtc ?? undefined,
        updatedAtUtc: (r as any).updatedAtUtc ?? (r as any).UpdatedAtUtc ?? undefined
      }));
    } catch {
      this.yearSummaryRows = [];
    }
  }

  private async loadMonthlySummary(): Promise<void> {
    const year = this.selectedYear;
    const metro = this.metroText?.trim() || undefined;
    try {
      const byMonth = await this.tps.getMetroByMonth({
        year,
        metro,
        includeTotals: true
      }).toPromise();
      const months = (byMonth ?? []).filter(r => !(r.isTotalsRow || r['isTotalsRow'] || r.month === 0));
      this.monthSummaryRows = months
        .sort((a, b) => (a.month ?? 0) - (b.month ?? 0))
        .map(r => ({
          year: this.pickNum(r, ['year','Year']),
          month: (r as any).month ?? (r as any).Month ?? 0,
          monthName: this.monthName((r as any).month ?? (r as any).Month ?? 0),
          isTotalsRow: Boolean((r as any).isTotalsRow ?? (r as any).IsTotalsRow ?? false),

          segmentCount: this.pickNum(r, ['segmentCount','SegmentCount']),
          eng_Dollars: this.pickNum(r, ['eng_Dollars','Eng_Dollars']),
          permit_Dollars: this.pickNum(r, ['permit_Dollars','Permit_Dollars']),
          material_Dollars: this.pickNum(r, ['material_Dollars','Material_Dollars']),
          plannedCost_Dollars: this.pickNum(r, ['plannedCost_Dollars','PlannedCost_Dollars']),
          current_TotalAllIn_Dollars: this.pickNum(r, ['current_TotalAllIn_Dollars','Current_TotalAllIn_Dollars']),

          hhp: this.pickNum(r, ['hhp','HHP']),
          sfu: this.pickNum(r, ['sfu','SFU']),
          mdu: this.pickNum(r, ['mdu','MDU']),
          sbu: this.pickNum(r, ['sbu','SBU']),
          mtu: this.pickNum(r, ['mtu','MTU']),

          allIn_Per_HHP: this.pickNum(r, ['allIn_Per_HHP','AllIn_Per_HHP']),
          hhp_Delta: this.pickNum(r, ['hhp_Delta','hhP_Delta','HHP_Delta']),
          sxu: this.pickNum(r, ['sxu','SXU']),
          sxu_Percent: this.pickNum(r, ['sxu_Percent','SXU_Percent','sXU_Percent','sxU_Percent']),

          avg_LFT_Per_Day: this.pickNum(r, ['avg_LFT_Per_Day','Avg_LFT_Per_Day']),
          avg_Dollars_Per_Material: this.pickNum(r, ['avg_Dollars_Per_Material','Avg_Dollars_Per_Material']),

          createdAtUtc: (r as any).createdAtUtc ?? (r as any).CreatedAtUtc ?? undefined,
          updatedAtUtc: (r as any).updatedAtUtc ?? (r as any).UpdatedAtUtc ?? undefined
        }));
    } catch {
      this.monthSummaryRows = [];
    }
  }

  private async loadMunicipalitySummary(): Promise<void> {
    const year = this.selectedYear;
    try {
      const byMuni: MetroByMunicipalityOverview[] | undefined = await this.tps.getMetroByMunicipality({
        year,
        includeTotals: true
      }).toPromise();
      const rows = (byMuni ?? []).filter(r => !(r.isTotalsRow || r['isTotalsRow']));
      this.muniSummaryRows = rows.map(r => ({
        year: this.pickNum(r, ['year','Year']),
        city: (r as any).city ?? (r as any).City ?? (r as any).municipality ?? (r as any).Municipality ?? '(unknown)',
        isTotalsRow: Boolean((r as any).isTotalsRow ?? (r as any).IsTotalsRow ?? false),

        segmentCount: this.pickNum(r, ['segmentCount','SegmentCount']),
        eng_Dollars: this.pickNum(r, ['eng_Dollars','Eng_Dollars']),
        permit_Dollars: this.pickNum(r, ['permit_Dollars','Permit_Dollars']),
        material_Dollars: this.pickNum(r, ['material_Dollars','Material_Dollars']),
        plannedCost_Dollars: this.pickNum(r, ['plannedCost_Dollars','PlannedCost_Dollars']),
        current_TotalAllIn_Dollars: this.pickNum(r, ['current_TotalAllIn_Dollars','Current_TotalAllIn_Dollars']),

        hhp: this.pickNum(r, ['hhp','HHP']),
        sfu: this.pickNum(r, ['sfu','SFU']),
        mdu: this.pickNum(r, ['mdu','MDU']),
        sbu: this.pickNum(r, ['sbu','SBU']),
        mtu: this.pickNum(r, ['mtu','MTU']),

        allIn_Per_HHP: this.pickNum(r, ['allIn_Per_HHP','AllIn_Per_HHP']),
        hhp_Delta: this.pickNum(r, ['hhp_Delta','hhP_Delta','HHP_Delta']),
        sxu: this.pickNum(r, ['sxu','SXU']),
        sxu_Percent: this.pickNum(r, ['sxu_Percent','SXU_Percent','sXU_Percent','sxU_Percent']),

        avg_LFT_Per_Day: this.pickNum(r, ['avg_LFT_Per_Day','Avg_LFT_Per_Day']),
        avg_Dollars_Per_Material: this.pickNum(r, ['avg_Dollars_Per_Material','Avg_Dollars_Per_Material']),

        createdAtUtc: (r as any).createdAtUtc ?? (r as any).CreatedAtUtc ?? undefined,
        updatedAtUtc: (r as any).updatedAtUtc ?? (r as any).UpdatedAtUtc ?? undefined
      }));
    } catch {
      this.muniSummaryRows = [];
    }
  }
}
