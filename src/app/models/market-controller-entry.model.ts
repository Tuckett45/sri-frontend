export interface MarketControllerEntry {
  id?: string;
  /**
   * The category this entry belongs to (e.g. 'poco', 'newPo', etc.)
   */
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
