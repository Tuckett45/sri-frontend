import { RoleCredentialTemplate, RequiredItem } from '../models/role-credential-template.model';
import { TypedCredential } from '../models/credential-types.model';
import { EquipmentAssignment } from '../models/equipment.model';
import { TechnicalCompetency } from '../models/competency.model';
import { PRC } from '../models/prc.model';
import { computeCredentialStatus } from './credential-status.util';
import { CertificationStatus } from '../models/technician.model';

/**
 * Represents a single item in the onboarding checklist with its completion status.
 */
export interface ChecklistItem {
  category: 'credential' | 'equipment' | 'competency' | 'prc';
  name: string;
  status: 'complete' | 'missing' | 'expired';
}

/**
 * Summary of the onboarding checklist delta computation,
 * including item-level details and aggregate counts.
 */
export interface ChecklistSummary {
  items: ChecklistItem[];
  completeCount: number;
  missingCount: number;
  expiredCount: number;
  totalCount: number;
  completionPercentage: number;
  isReadyToStart: boolean;
}

/**
 * Retrieves the expiration date from a typed credential if the credential type supports it.
 * Returns null for credential types without an expiration date.
 */
function getCredentialExpirationDate(credential: TypedCredential): Date | null {
  if (credential.credentialType === 'Drivers_License' || credential.credentialType === 'OSHA_Training_Cert') {
    return new Date(credential.expirationDate);
  }
  return null;
}

/**
 * Determines the status of a credential item by matching against on-file credentials.
 * Uses computeCredentialStatus for credentials with expiration dates,
 * falls back to the stored status field otherwise.
 */
function resolveCredentialItemStatus(
  requiredItem: RequiredItem,
  credentials: TypedCredential[],
  referenceDate: Date
): 'complete' | 'missing' | 'expired' {
  const matchingCredential = credentials.find(
    (c) => c.credentialType === requiredItem.credentialType
  );

  if (!matchingCredential) {
    return 'missing';
  }

  const expirationDate = getCredentialExpirationDate(matchingCredential);
  const status = expirationDate
    ? computeCredentialStatus(expirationDate, referenceDate)
    : matchingCredential.status;

  if (status === CertificationStatus.Expired) {
    return 'expired';
  }

  return 'complete';
}

/**
 * Determines the status of an equipment item by matching against on-file assignments.
 * An equipment item is "complete" only if a matching assignment with status 'assigned' exists.
 */
function resolveEquipmentItemStatus(
  requiredItem: RequiredItem,
  equipment: EquipmentAssignment[]
): 'complete' | 'missing' {
  const matchingEquipment = equipment.find(
    (e) => e.assetType === requiredItem.assetType && e.status === 'assigned'
  );

  return matchingEquipment ? 'complete' : 'missing';
}

/**
 * Determines the status of a competency item by matching against on-file competencies.
 */
function resolveCompetencyItemStatus(
  requiredItem: RequiredItem,
  competencies: TechnicalCompetency[]
): 'complete' | 'missing' {
  const matchingCompetency = competencies.find(
    (c) => c.competencyName === requiredItem.competencyName
  );

  return matchingCompetency ? 'complete' : 'missing';
}

/**
 * Computes the onboarding checklist delta by comparing required items from a role template
 * against the technician's on-file credentials, equipment, competencies, and PRC records.
 *
 * This is a pure function suitable for property-based testing.
 *
 * @param template - The role credential template defining required items
 * @param credentials - The technician's on-file typed credentials
 * @param equipment - The technician's equipment assignments
 * @param competencies - The technician's technical competencies
 * @param prc - The technician's PRC record (or null if none)
 * @param referenceDate - The date to use for status computation (defaults to current date)
 * @returns A ChecklistSummary with item-level statuses and aggregate counts
 */
export function computeChecklistDelta(
  template: RoleCredentialTemplate,
  credentials: TypedCredential[],
  equipment: EquipmentAssignment[],
  competencies: TechnicalCompetency[],
  prc: PRC | null,
  referenceDate: Date = new Date()
): ChecklistSummary {
  const items: ChecklistItem[] = template.requiredItems.map((requiredItem) => {
    let status: 'complete' | 'missing' | 'expired';

    switch (requiredItem.category) {
      case 'credential':
        status = resolveCredentialItemStatus(requiredItem, credentials, referenceDate);
        break;
      case 'equipment':
        status = resolveEquipmentItemStatus(requiredItem, equipment);
        break;
      case 'competency':
        status = resolveCompetencyItemStatus(requiredItem, competencies);
        break;
      case 'prc':
        status = prc !== null ? 'complete' : 'missing';
        break;
      default:
        status = 'missing';
    }

    return {
      category: requiredItem.category,
      name: requiredItem.name,
      status
    };
  });

  const completeCount = items.filter((item) => item.status === 'complete').length;
  const missingCount = items.filter((item) => item.status === 'missing').length;
  const expiredCount = items.filter((item) => item.status === 'expired').length;
  const totalCount = items.length;
  const completionPercentage = totalCount > 0 ? (completeCount / totalCount) * 100 : 0;
  const isReadyToStart = missingCount === 0 && expiredCount === 0;

  return {
    items,
    completeCount,
    missingCount,
    expiredCount,
    totalCount,
    completionPercentage,
    isReadyToStart
  };
}
