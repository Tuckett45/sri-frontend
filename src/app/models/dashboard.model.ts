import { VendorIssueStats } from './vendor-issue-stats.model';
import { VendorPunchListStats } from './vendor-punchlist-stats.model';
import { UserPunchListStats } from './user-punchlist-stats.model';
import { StreetSheetStats } from './street-sheets-stats.model';
import { StatePunchListStats } from './segementid-punchlist-stats.model';
import { TotalVendorIssueStats } from './total-vendor-issues.model';

export class DashboardData {
  constructor(
    public totalPunchLists: number,
    public totalVendorIssueStats: TotalVendorIssueStats[],
    public vendorIssueStats: VendorIssueStats[],
    public vendorPunchListStats: VendorPunchListStats[],
    public userPunchListStats: UserPunchListStats[],
    public statePunchListStats: StatePunchListStats[],
    public streetSheetStats: StreetSheetStats[],
    public monthlyPunchListCount: number,
    public weeklyPunchListCount: number
  ) {}
}