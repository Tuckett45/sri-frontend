export interface WPViolation {
  id?: number;
  monthYear?: string;
  vendor?: string;
  segment?: string;
  conlogPlannedAmount?: number;
  contingency?: number;
  planWithContingency?: number;
  atCompleteCost?: number;
  actualCost?: number;
  overspentBy?: number;
}
