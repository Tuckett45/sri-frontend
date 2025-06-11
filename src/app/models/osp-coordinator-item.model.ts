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
  workPackageContingency?: number;
  highCostAnalysis?: string;
  ntp?: string;
  asbuiltSubmitted?: string;
  coordinatorCloseout?: string;
  amendmentVersion?: number;
  newWPLaborAmount?: number;
  contingencyAmount?: number;
  amendmentReason?: string;
  adminAudit?: number;
  adminAuditDate?: string;
  pass?: boolean;
  passFailReason?: string;
}
