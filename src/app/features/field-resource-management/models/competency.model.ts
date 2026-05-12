/**
 * Technical competency models for tracking proficiency levels
 * in skills like OTDR Knowledge and Fiber Optic Characterization.
 */

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export const PREDEFINED_COMPETENCIES = [
  'OTDR Knowledge',
  'Fiber Optic Characterization / OTDR Testing'
] as const;

export interface TechnicalCompetency {
  id: string;
  technicianId: string;
  competencyName: string;
  verificationDate: string;  // ISO date
  verifiedBy: string;
  proficiencyLevel: ProficiencyLevel;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
