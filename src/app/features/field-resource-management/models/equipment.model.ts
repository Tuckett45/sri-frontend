/**
 * Equipment assignment models for tracking badges, laptops, and other assets
 * assigned to technicians during the onboarding process.
 */

export type EquipmentAssetType = 'badge' | 'laptop' | 'kit' | 'other';
export type EquipmentStatus = 'assigned' | 'returned' | 'lost';

export interface EquipmentAssignment {
  id: string;
  technicianId: string;
  assetType: EquipmentAssetType;
  assetIdentifier: string;
  assignmentDate: string;    // ISO date
  returnDate?: string;       // ISO date, optional
  status: EquipmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
