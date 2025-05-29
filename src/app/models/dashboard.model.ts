import { VendorIssueStats } from './vendor-issue-stats.model';
import { VendorPunchListStats } from './vendor-punchlist-stats.model';
import { UserPunchListStats } from './user-punchlist-stats.model';
import { StreetSheetStats } from './street-sheets-stats.model';
import { StatePunchListStats } from './segementid-punchlist-stats.model';
import { TotalVendorIssueStats } from './total-vendor-issues.model';

export class DashboardData {
  constructor(
    public errorCodeStats: ErrorCodeStats[],
    public errorCodeRawData: ErrorCodeRaw[],
    public totalPunchLists: number,
    public totalVendorIssueStats: TotalVendorIssueStats[],
    public vendorIssueStats: VendorIssueStats[],
    public rawIssueAreas: IssueAreaRaw[],
    public vendorPunchListStats: VendorPunchListStats[],
    public rawVendorPunchLists: VendorPunchListsRaw[],
    public userPunchListStats: UserPunchListStats[],
    public statePunchListStats: StatePunchListStats[],
    public rawStatePunchList: StatePunchListRaw[],
    public streetSheetStats: StreetSheetStats[],
    public monthlyPunchListCount: number,
    public weeklyPunchListCount: number
  ) {}
}

export interface ErrorCodeRaw {
  vendorName: string;
  state: string;
  dateReported: string; // or Date
  area: string;
  subCategory: string;
  errorCode: string;
  criticality: string;
}

export interface ErrorCodeStats {
  vendorName: string,
  boredConduitIssues: number,
  directBuriedIssues: number,
  hardscapeIssues: number,
  openTrenchedIssues: number,
  oSPGeneralIssues: number,
  oSPRepairsIssues: number,
  oSPTechnicalIssues: number,
  safetyIssues: number,
  softscapeIssues: number,
  undergroundCableIssues: number,
  vaultIssues: number
}

export interface IssueAreaRaw {
  area: string;
  state: string;
  vendorName: string;
}

export interface VendorPunchListsRaw {
  vendorName: string;
  state: string;
  pmResolved: boolean;
  cmResolved: boolean;
}

export interface StatePunchListRaw {
  state: string;
  vendorName: string;
  pmResolved: boolean;
  cmResolved: boolean;
}