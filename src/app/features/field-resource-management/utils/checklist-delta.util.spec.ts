/**
 * Property-based tests for onboarding checklist delta computation
 *
 * Uses fast-check to verify universal correctness properties
 * across randomly generated inputs (minimum 100 iterations each).
 *
 * Test runner: Karma/Jasmine
 */

import * as fc from 'fast-check';
import { computeChecklistDelta, ChecklistSummary } from './checklist-delta.util';
import { RoleCredentialTemplate, RequiredItem } from '../models/role-credential-template.model';
import { TypedCredential, CredentialType } from '../models/credential-types.model';
import { EquipmentAssignment, EquipmentAssetType } from '../models/equipment.model';
import { TechnicalCompetency } from '../models/competency.model';
import { PRC } from '../models/prc.model';
import { TechnicianRole, CertificationStatus } from '../models/technician.model';

describe('Checklist Delta Utility — Property-Based Tests', () => {

  // ── Property 10: Onboarding checklist delta computation is correct ──
  // Feature: tech-credentials-onboarding, Property 10
  // **Validates: Requirements 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 13.6, 14.5, 15.9**

  describe('Property 10: Onboarding checklist delta computation is correct', () => {

    /** Credential types that have expiration dates */
    const EXPIRABLE_CREDENTIAL_TYPES: CredentialType[] = ['Drivers_License', 'OSHA_Training_Cert'];
    /** Credential types without expiration dates */
    const NON_EXPIRABLE_CREDENTIAL_TYPES: CredentialType[] = ['Drug_Screen', 'Offer_Letter', 'Background_Check', 'SSN_Last_Four'];
    const ALL_CREDENTIAL_TYPES: CredentialType[] = [...EXPIRABLE_CREDENTIAL_TYPES, ...NON_EXPIRABLE_CREDENTIAL_TYPES];
    const ALL_ASSET_TYPES: EquipmentAssetType[] = ['badge', 'laptop', 'other'];
    const COMPETENCY_NAMES = ['OTDR Knowledge', 'Fiber Optic Characterization / OTDR Testing', 'Cable Splicing', 'Network Testing'];

    /** Arbitrary for a reference date */
    const arbReferenceDate = fc.date({
      min: new Date('2024-01-01'),
      max: new Date('2026-12-31')
    }).filter(d => !isNaN(d.getTime()));

    /** Arbitrary for a credential-type required item */
    const arbCredentialItem: fc.Arbitrary<RequiredItem> = fc.constantFrom(...ALL_CREDENTIAL_TYPES).map(ct => ({
      category: 'credential' as const,
      name: `${ct} Credential`,
      credentialType: ct
    }));

    /** Arbitrary for an equipment required item */
    const arbEquipmentItem: fc.Arbitrary<RequiredItem> = fc.constantFrom(...ALL_ASSET_TYPES).map(at => ({
      category: 'equipment' as const,
      name: `${at} Assignment`,
      assetType: at
    }));

    /** Arbitrary for a competency required item */
    const arbCompetencyItem: fc.Arbitrary<RequiredItem> = fc.constantFrom(...COMPETENCY_NAMES).map(cn => ({
      category: 'competency' as const,
      name: cn,
      competencyName: cn
    }));

    /** Arbitrary for a PRC required item */
    const arbPRCItem: fc.Arbitrary<RequiredItem> = fc.constant({
      category: 'prc' as const,
      name: 'Performance Review Cycle'
    });

    /** Arbitrary for a required item of any category */
    const arbRequiredItem: fc.Arbitrary<RequiredItem> = fc.oneof(
      arbCredentialItem,
      arbEquipmentItem,
      arbCompetencyItem,
      arbPRCItem
    );

    /** Arbitrary for a role credential template */
    const arbTemplate: fc.Arbitrary<RoleCredentialTemplate> = fc.record({
      role: fc.constantFrom(...Object.values(TechnicianRole)),
      requiredItems: fc.array(arbRequiredItem, { minLength: 1, maxLength: 10 })
    });

    /** Helper: build a typed credential matching a credential type */
    function makeTypedCredential(
      credentialType: CredentialType,
      status: CertificationStatus,
      referenceDate: Date,
      daysOffset: number
    ): TypedCredential {
      const base = {
        id: `cred-${Math.random().toString(36).slice(2)}`,
        technicianId: 'tech-1',
        credentialType,
        name: `${credentialType} Credential`,
        status,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const futureDate = new Date(referenceDate);
      futureDate.setDate(futureDate.getDate() + daysOffset);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      const pastDateStr = '2023-01-01';

      switch (credentialType) {
        case 'Drivers_License':
          return { ...base, credentialType: 'Drivers_License', licenseNumber: 'DL123', issuingState: 'CA', issueDate: pastDateStr, expirationDate: futureDateStr } as TypedCredential;
        case 'OSHA_Training_Cert':
          return { ...base, credentialType: 'OSHA_Training_Cert', certificationNumber: 'OSHA123', issueDate: pastDateStr, expirationDate: futureDateStr, trainingProvider: 'OSHA Inc' } as TypedCredential;
        case 'Drug_Screen':
          return { ...base, credentialType: 'Drug_Screen', testDate: pastDateStr, result: 'pass', testingFacility: 'Lab Corp' } as TypedCredential;
        case 'Offer_Letter':
          return { ...base, credentialType: 'Offer_Letter', offerDate: pastDateStr, offerStatus: 'accepted' } as TypedCredential;
        case 'Background_Check':
          return { ...base, credentialType: 'Background_Check', submissionDate: pastDateStr, result: 'pass', provider: 'CheckR' } as TypedCredential;
        case 'SSN_Last_Four':
          return { ...base, credentialType: 'SSN_Last_Four', lastFourDigits: '1234' } as TypedCredential;
      }
    }

    /** Helper: build an equipment assignment */
    function makeEquipment(assetType: EquipmentAssetType, status: 'assigned' | 'returned' | 'lost'): EquipmentAssignment {
      return {
        id: `eq-${Math.random().toString(36).slice(2)}`,
        technicianId: 'tech-1',
        assetType,
        assetIdentifier: `ASSET-${Math.random().toString(36).slice(2)}`,
        assignmentDate: '2024-01-15',
        status,
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z'
      };
    }

    /** Helper: build a technical competency */
    function makeCompetency(competencyName: string): TechnicalCompetency {
      return {
        id: `comp-${Math.random().toString(36).slice(2)}`,
        technicianId: 'tech-1',
        competencyName,
        verificationDate: '2024-02-01',
        verifiedBy: 'Manager',
        proficiencyLevel: 'intermediate',
        createdAt: '2024-02-01T00:00:00Z',
        updatedAt: '2024-02-01T00:00:00Z'
      };
    }

    /** Helper: build a PRC record */
    function makePRC(): PRC {
      return {
        id: 'prc-1',
        technicianId: 'tech-1',
        dueDate: '2024-06-01',
        status: 'upcoming',
        goals: [],
        createdAt: '2024-04-01T00:00:00Z',
        updatedAt: '2024-04-01T00:00:00Z'
      };
    }

    it('should satisfy completeCount + missingCount + expiredCount === totalCount', () => {
      fc.assert(
        fc.property(
          arbTemplate,
          arbReferenceDate,
          (template, referenceDate) => {
            // Provide empty on-file records so all items are "missing"
            const result = computeChecklistDelta(template, [], [], [], null, referenceDate);

            expect(result.completeCount + result.missingCount + result.expiredCount).toBe(result.totalCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have totalCount equal to template.requiredItems.length', () => {
      fc.assert(
        fc.property(
          arbTemplate,
          arbReferenceDate,
          (template, referenceDate) => {
            const result = computeChecklistDelta(template, [], [], [], null, referenceDate);
            expect(result.totalCount).toBe(template.requiredItems.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should compute completionPercentage as (completeCount / totalCount) * 100', () => {
      fc.assert(
        fc.property(
          arbTemplate,
          arbReferenceDate,
          (template, referenceDate) => {
            const result = computeChecklistDelta(template, [], [], [], null, referenceDate);

            const expectedPercentage = result.totalCount > 0
              ? (result.completeCount / result.totalCount) * 100
              : 0;

            expect(result.completionPercentage).toBeCloseTo(expectedPercentage, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should set isReadyToStart === true only when missingCount === 0 AND expiredCount === 0', () => {
      fc.assert(
        fc.property(
          arbTemplate,
          arbReferenceDate,
          (template, referenceDate) => {
            // Provide all matching records to make everything complete
            const credentials: TypedCredential[] = template.requiredItems
              .filter(item => item.category === 'credential' && item.credentialType)
              .map(item => makeTypedCredential(item.credentialType!, CertificationStatus.Active, referenceDate, 365));

            const equipment: EquipmentAssignment[] = template.requiredItems
              .filter(item => item.category === 'equipment' && item.assetType)
              .map(item => makeEquipment(item.assetType!, 'assigned'));

            const competencies: TechnicalCompetency[] = template.requiredItems
              .filter(item => item.category === 'competency' && item.competencyName)
              .map(item => makeCompetency(item.competencyName!));

            const hasPRCRequirement = template.requiredItems.some(item => item.category === 'prc');
            const prc = hasPRCRequirement ? makePRC() : null;

            const result = computeChecklistDelta(template, credentials, equipment, competencies, prc, referenceDate);

            expect(result.isReadyToStart).toBe(result.missingCount === 0 && result.expiredCount === 0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should mark all items as "missing" when no on-file records exist', () => {
      fc.assert(
        fc.property(
          arbTemplate,
          arbReferenceDate,
          (template, referenceDate) => {
            const result = computeChecklistDelta(template, [], [], [], null, referenceDate);

            expect(result.missingCount).toBe(result.totalCount);
            expect(result.completeCount).toBe(0);
            expect(result.expiredCount).toBe(0);
            expect(result.isReadyToStart).toBe(false);

            for (const item of result.items) {
              expect(item.status).toBe('missing');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should mark credential items as "expired" when matching credential has expired status', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...EXPIRABLE_CREDENTIAL_TYPES),
          arbReferenceDate,
          (credentialType, referenceDate) => {
            const template: RoleCredentialTemplate = {
              role: TechnicianRole.Installer,
              requiredItems: [{
                category: 'credential',
                name: `${credentialType} Credential`,
                credentialType
              }]
            };

            // Create an expired credential (expiration date in the past)
            const expiredCredential = makeTypedCredential(credentialType, CertificationStatus.Expired, referenceDate, -30);

            const result = computeChecklistDelta(template, [expiredCredential], [], [], null, referenceDate);

            expect(result.expiredCount).toBe(1);
            expect(result.items[0].status).toBe('expired');
            expect(result.isReadyToStart).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should mark equipment items as "missing" when equipment status is returned or lost', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_ASSET_TYPES),
          fc.constantFrom('returned' as const, 'lost' as const),
          arbReferenceDate,
          (assetType, equipmentStatus, referenceDate) => {
            const template: RoleCredentialTemplate = {
              role: TechnicianRole.Installer,
              requiredItems: [{
                category: 'equipment',
                name: `${assetType} Assignment`,
                assetType
              }]
            };

            const equipment = makeEquipment(assetType, equipmentStatus);

            const result = computeChecklistDelta(template, [], [equipment], [], null, referenceDate);

            expect(result.missingCount).toBe(1);
            expect(result.items[0].status).toBe('missing');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should mark PRC item as "complete" when PRC record exists and "missing" when null', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          arbReferenceDate,
          (hasPRC, referenceDate) => {
            const template: RoleCredentialTemplate = {
              role: TechnicianRole.Installer,
              requiredItems: [{
                category: 'prc',
                name: 'Performance Review Cycle'
              }]
            };

            const prc = hasPRC ? makePRC() : null;
            const result = computeChecklistDelta(template, [], [], [], prc, referenceDate);

            if (hasPRC) {
              expect(result.completeCount).toBe(1);
              expect(result.items[0].status).toBe('complete');
            } else {
              expect(result.missingCount).toBe(1);
              expect(result.items[0].status).toBe('missing');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce items array with same length as template.requiredItems', () => {
      fc.assert(
        fc.property(
          arbTemplate,
          arbReferenceDate,
          (template, referenceDate) => {
            const result = computeChecklistDelta(template, [], [], [], null, referenceDate);
            expect(result.items.length).toBe(template.requiredItems.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign each item exactly one status from the valid set', () => {
      fc.assert(
        fc.property(
          arbTemplate,
          arbReferenceDate,
          (template, referenceDate) => {
            const result = computeChecklistDelta(template, [], [], [], null, referenceDate);

            const validStatuses = ['complete', 'missing', 'expired'];
            for (const item of result.items) {
              expect(validStatuses).toContain(item.status);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
