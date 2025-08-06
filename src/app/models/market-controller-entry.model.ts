export interface MarketControllerEntry {
  id: string;
  type: string; // e.g. 'poco', 'newPo', etc.
  poNumber: string;
  vendor: string;
  segmentReason: string;
  date: Date;
  amount: number;
  notes: string;
}
