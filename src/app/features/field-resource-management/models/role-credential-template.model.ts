import { CredentialType } from './credential-types.model';
import { EquipmentAssetType } from './equipment.model';
import { TechnicianRole } from './technician.model';

/**
 * Role-based credential template models for defining onboarding requirements
 * per technician role. Used by the onboarding checklist to compute deltas
 * between required and on-file items.
 */

export interface RequiredItem {
  category: 'credential' | 'equipment' | 'competency' | 'prc';
  name: string;
  credentialType?: CredentialType;    // for credential items
  assetType?: EquipmentAssetType;     // for equipment items
  competencyName?: string;            // for competency items
}

export interface RoleCredentialTemplate {
  role: TechnicianRole;
  requiredItems: RequiredItem[];
}
