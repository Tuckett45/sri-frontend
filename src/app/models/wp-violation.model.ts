export interface WPViolation {
  id?: string;
  monthYear?: string;
  vendor?: string;
  segment?: string;
  city?: string;
  conlogPlannedAmount?: number;
  contingency?: number;
  planWithContingency?: number;
  atCompleteCost?: number;
  actualCost?: number;
}
