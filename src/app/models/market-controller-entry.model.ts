export interface MarketControllerEntry {
  id?: string;
  type: string;
  poNumber?: string;
  vendor?: string;
  segmentReason?: string;
  date?: Date;
  amount?: number;
  notes?: string;
  createdBy?: string;
  createdDate?: Date;
  updatedBy?: string;
  updatedDate?: Date;
}
