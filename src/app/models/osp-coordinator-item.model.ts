export interface OspCoordinatorItem {
  id: string;
  segmentId: string;
  vendor: string;
  crew: string;
  materialOrder?: string;
  date?: string;
  workPackageCreated?: string;
  amount?: number;
  workPackageAmount?: number;
  originalContinuingCost?: number;
  highCostAnalysis?: string;
  ntp?: string;
  asbuiltSubmitted?: string;
  coordinatorCloseout?: string;
  amendmentVersion?: number;
  amendmentAmount?: number;
  continuingAmount?: number;
  amendmentReason?: string;
  adminAudit?: number;
  adminAuditDate?: string;
  pass?: boolean;
  passFailReason?: string[];
}
