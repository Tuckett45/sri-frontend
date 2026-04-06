import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SchedulingService } from './scheduling.service';
import { Assignment, Conflict, ConflictSeverity, AssignmentStatus } from '../models/assignment.model';
import { Skill, SkillLevel } from '../models/technician.model';

describe('SchedulingService', () => {
  let service: SchedulingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SchedulingService]
    });
    service = TestBed.inject(SchedulingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('timeRangesOverlap()', () => {
    describe('Valid Overlap Cases', () => {
      it('should return true when ranges partially overlap from left', () => {
        const start1 = new Date('2024-01-01T08:00:00');
        const end1 = new Date('2024-01-01T12:00:00');
        const start2 = new Date('2024-01-01T10:00:00');
        const end2 = new Date('2024-01-01T14:00:00');

        expect(service.timeRangesOverlap(start1, end1, start2, end2)).toBe(true);
      });

      it('should return true when ranges partially overlap from right', () => {
        const start1 = new Date('2024-01-01T10:00:00');
        const end1 = new Date('2024-01-01T14:00:00');
        const start2 = new Date('2024-01-01T08:00:00');
        const end2 = new Date('2024-01-01T12:00:00');

        expect(service.timeRangesOverlap(start1, end1, start2, end2)).toBe(true);
      });

      it('should return true when first range completely contains second range', () => {
        const start1 = new Date('2024-01-01T08:00:00');
        const end1 = new Date('2024-01-01T16:00:00');
        const start2 = new Date('2024-01-01T10:00:00');
        const end2 = new Date('2024-01-01T14:00:00');

        expect(service.timeRangesOverlap(start1, end1, start2, end2)).toBe(true);
      });

      it('should return true when second range completely contains first range', () => {
        const start1 = new Date('2024-01-01T10:00:00');
        const end1 = new Date('2024-01-01T14:00:00');
        const start2 = new Date('2024-01-01T08:00:00');
        const end2 = new Date('2024-01-01T16:00:00');

        expect(service.timeRangesOverlap(start1, end1, start2, end2)).toBe(true);
      });

      it('should return true when ranges are exactly the same', () => {
        const start1 = new Date('2024-01-01T10:00:00');
        const end1 = new Date('2024-01-01T14:00:00');
        const start2 = new Date('2024-01-01T10:00:00');
        const end2 = new Date('2024-01-01T14:00:00');

        expect(service.timeRangesOverlap(start1, end1, start2, end2)).toBe(true);
      });

      it('should return true when ranges overlap by one millisecond', () => {
        const start1 = new Date('2024-01-01T10:00:00.000');
        const end1 = new Date('2024-01-01T12:00:00.001');
        const start2 = new Date('2024-01-01T12:00:00.000');
        const end2 = new Date('2024-01-01T14:00:00.000');

        expect(service.timeRangesOverlap(start1, end1, start2, end2)).toBe(true);
      });
    });

    describe('Non-Overlap Cases', () => {
      it('should return false when ranges are completely separate (first before second)', () => {
        const start1 = new Date('2024-01-01T08:00:00');
        const end1 = new Date('2024-01-01T10:00:00');
        const start2 = new Date('2024-01-01T12:00:00');
        const end2 = new Date('2024-01-01T14:00:00');

        expect(service.timeRangesOverlap(start1, end1, start2, end2)).toBe(false);
      });

      it('should return false when ranges are completely separate (second before first)', () => {
        const start1 = new Date('2024-01-01T12:00:00');
        const end1 = new Date('2024-01-01T14:00:00');
        const start2 = new Date('2024-01-01T08:00:00');
        const end2 = new Date('2024-01-01T10:00:00');

        expect(service.timeRangesOverlap(start1, end1, start2, end2)).toBe(false);
      });

      it('should return false when first range ends exactly when second range starts', () => {
        const start1 = new Date('2024-01-01T08:00:00');
        const end1 = new Date('2024-01-01T12:00:00');
        const start2 = new Date('2024-01-01T12:00:00');
        const end2 = new Date('2024-01-01T14:00:00');

        expect(service.timeRangesOverlap(start1, end1, start2, end2)).toBe(false);
      });

      it('should return false when second range ends exactly when first range starts', () => {
        const start1 = new Date('2024-01-01T12:00:00');
        const end1 = new Date('2024-01-01T14:00:00');
        const start2 = new Date('2024-01-01T08:00:00');
        const end2 = new Date('2024-01-01T12:00:00');

        expect(service.timeRangesOverlap(start1, end1, start2, end2)).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle zero-duration ranges that overlap', () => {
        const start1 = new Date('2024-01-01T10:00:00');
        const end1 = new Date('2024-01-01T10:00:00');
        const start2 = new Date('2024-01-01T10:00:00');
        const end2 = new Date('2024-01-01T10:00:00');

        expect(service.timeRangesOverlap(start1, end1, start2, end2)).toBe(false);
      });

      it('should handle zero-duration range within another range', () => {
        const start1 = new Date('2024-01-01T08:00:00');
        const end1 = new Date('2024-01-01T12:00:00');
        const start2 = new Date('2024-01-01T10:00:00');
        const end2 = new Date('2024-01-01T10:00:00');

        // A zero-duration point at 10:00 is within [08:00, 12:00):
        // start1(08:00) < end2(10:00) && start2(10:00) < end1(12:00) => true
        expect(service.timeRangesOverlap(start1, end1, start2, end2)).toBe(true);
      });

      it('should handle ranges spanning multiple days', () => {
        const start1 = new Date('2024-01-01T20:00:00');
        const end1 = new Date('2024-01-02T04:00:00');
        const start2 = new Date('2024-01-02T02:00:00');
        const end2 = new Date('2024-01-02T10:00:00');

        expect(service.timeRangesOverlap(start1, end1, start2, end2)).toBe(true);
      });

      it('should handle ranges with different time zones (same UTC time)', () => {
        const start1 = new Date('2024-01-01T10:00:00Z');
        const end1 = new Date('2024-01-01T14:00:00Z');
        const start2 = new Date('2024-01-01T12:00:00Z');
        const end2 = new Date('2024-01-01T16:00:00Z');

        expect(service.timeRangesOverlap(start1, end1, start2, end2)).toBe(true);
      });
    });

    describe('Precondition Validation', () => {
      it('should throw error when start1 is not a valid Date', () => {
        const invalidDate = new Date('invalid');
        const validDate = new Date('2024-01-01T10:00:00');

        expect(() => service.timeRangesOverlap(invalidDate, validDate, validDate, validDate))
          .toThrowError('start1 must be a valid Date');
      });

      it('should throw error when end1 is not a valid Date', () => {
        const invalidDate = new Date('invalid');
        const validDate = new Date('2024-01-01T10:00:00');

        expect(() => service.timeRangesOverlap(validDate, invalidDate, validDate, validDate))
          .toThrowError('end1 must be a valid Date');
      });

      it('should throw error when start2 is not a valid Date', () => {
        const invalidDate = new Date('invalid');
        const validDate = new Date('2024-01-01T10:00:00');

        expect(() => service.timeRangesOverlap(validDate, validDate, invalidDate, validDate))
          .toThrowError('start2 must be a valid Date');
      });

      it('should throw error when end2 is not a valid Date', () => {
        const invalidDate = new Date('invalid');
        const validDate = new Date('2024-01-01T10:00:00');

        expect(() => service.timeRangesOverlap(validDate, validDate, validDate, invalidDate))
          .toThrowError('end2 must be a valid Date');
      });

      it('should throw error when start1 is after end1', () => {
        const start1 = new Date('2024-01-01T14:00:00');
        const end1 = new Date('2024-01-01T10:00:00');
        const start2 = new Date('2024-01-01T08:00:00');
        const end2 = new Date('2024-01-01T12:00:00');

        expect(() => service.timeRangesOverlap(start1, end1, start2, end2))
          .toThrowError('start1 must be before or equal to end1');
      });

      it('should throw error when start2 is after end2', () => {
        const start1 = new Date('2024-01-01T08:00:00');
        const end1 = new Date('2024-01-01T12:00:00');
        const start2 = new Date('2024-01-01T14:00:00');
        const end2 = new Date('2024-01-01T10:00:00');

        expect(() => service.timeRangesOverlap(start1, end1, start2, end2))
          .toThrowError('start2 must be before or equal to end2');
      });
    });

    describe('Determinism and Idempotence', () => {
      it('should return same result when called multiple times with same inputs', () => {
        const start1 = new Date('2024-01-01T10:00:00');
        const end1 = new Date('2024-01-01T14:00:00');
        const start2 = new Date('2024-01-01T12:00:00');
        const end2 = new Date('2024-01-01T16:00:00');

        const result1 = service.timeRangesOverlap(start1, end1, start2, end2);
        const result2 = service.timeRangesOverlap(start1, end1, start2, end2);
        const result3 = service.timeRangesOverlap(start1, end1, start2, end2);

        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
        expect(result1).toBe(true);
      });

      it('should be commutative (order of ranges should not matter)', () => {
        const start1 = new Date('2024-01-01T10:00:00');
        const end1 = new Date('2024-01-01T14:00:00');
        const start2 = new Date('2024-01-01T12:00:00');
        const end2 = new Date('2024-01-01T16:00:00');

        const result1 = service.timeRangesOverlap(start1, end1, start2, end2);
        const result2 = service.timeRangesOverlap(start2, end2, start1, end1);

        expect(result1).toBe(result2);
      });

      it('should not mutate input dates', () => {
        const start1 = new Date('2024-01-01T10:00:00');
        const end1 = new Date('2024-01-01T14:00:00');
        const start2 = new Date('2024-01-01T12:00:00');
        const end2 = new Date('2024-01-01T16:00:00');

        const start1Time = start1.getTime();
        const end1Time = end1.getTime();
        const start2Time = start2.getTime();
        const end2Time = end2.getTime();

        service.timeRangesOverlap(start1, end1, start2, end2);

        expect(start1.getTime()).toBe(start1Time);
        expect(end1.getTime()).toBe(end1Time);
        expect(start2.getTime()).toBe(start2Time);
        expect(end2.getTime()).toBe(end2Time);
      });
    });
  });

  describe('validateSkillRequirements()', () => {
    describe('Valid Skill Matching Cases', () => {
      it('should return true when technician has all required skills', () => {
        const technicianSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical', level: SkillLevel.Intermediate },
          { id: 'skill-2', name: 'Plumbing', category: 'Technical', level: SkillLevel.Intermediate },
          { id: 'skill-3', name: 'HVAC', category: 'Technical', level: SkillLevel.Intermediate }
        ];

        const requiredSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical', level: SkillLevel.Intermediate },
          { id: 'skill-2', name: 'Plumbing', category: 'Technical', level: SkillLevel.Intermediate }
        ];

        expect(service.validateSkillRequirements(technicianSkills, requiredSkills)).toBe(true);
      });

      it('should return true when technician has exactly the required skills', () => {
        const technicianSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical', level: SkillLevel.Intermediate },
          { id: 'skill-2', name: 'Plumbing', category: 'Technical', level: SkillLevel.Intermediate }
        ];

        const requiredSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical', level: SkillLevel.Intermediate },
          { id: 'skill-2', name: 'Plumbing', category: 'Technical', level: SkillLevel.Intermediate }
        ];

        expect(service.validateSkillRequirements(technicianSkills, requiredSkills)).toBe(true);
      });

      it('should return true when no skills are required', () => {
        const technicianSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical', level: SkillLevel.Intermediate }
        ];

        const requiredSkills: Skill[] = [];

        expect(service.validateSkillRequirements(technicianSkills, requiredSkills)).toBe(true);
      });

      it('should return true when both arrays are empty', () => {
        const technicianSkills: Skill[] = [];
        const requiredSkills: Skill[] = [];

        expect(service.validateSkillRequirements(technicianSkills, requiredSkills)).toBe(true);
      });

      it('should match skills by ID regardless of name or category differences', () => {
        const technicianSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical Work', category: 'Technical', level: SkillLevel.Intermediate }
        ];

        const requiredSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Different', level: SkillLevel.Intermediate }
        ];

        expect(service.validateSkillRequirements(technicianSkills, requiredSkills)).toBe(true);
      });
    });

    describe('Missing Skill Cases', () => {
      it('should return false when technician is missing one required skill', () => {
        const technicianSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical', level: SkillLevel.Intermediate }
        ];

        const requiredSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical', level: SkillLevel.Intermediate },
          { id: 'skill-2', name: 'Plumbing', category: 'Technical', level: SkillLevel.Intermediate }
        ];

        expect(service.validateSkillRequirements(technicianSkills, requiredSkills)).toBe(false);
      });

      it('should return false when technician is missing all required skills', () => {
        const technicianSkills: Skill[] = [
          { id: 'skill-3', name: 'HVAC', category: 'Technical', level: SkillLevel.Intermediate }
        ];

        const requiredSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical', level: SkillLevel.Intermediate },
          { id: 'skill-2', name: 'Plumbing', category: 'Technical', level: SkillLevel.Intermediate }
        ];

        expect(service.validateSkillRequirements(technicianSkills, requiredSkills)).toBe(false);
      });

      it('should return false when technician has no skills but skills are required', () => {
        const technicianSkills: Skill[] = [];

        const requiredSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        expect(service.validateSkillRequirements(technicianSkills, requiredSkills)).toBe(false);
      });

      it('should return false when skill IDs do not match even if names match', () => {
        const technicianSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical', level: SkillLevel.Intermediate }
        ];

        const requiredSkills: Skill[] = [
          { id: 'skill-2', name: 'Electrical', category: 'Technical', level: SkillLevel.Intermediate }
        ];

        expect(service.validateSkillRequirements(technicianSkills, requiredSkills)).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle large skill arrays efficiently', () => {
        const technicianSkills: Skill[] = Array.from({ length: 100 }, (_, i) => ({
          id: `skill-${i}`,
          name: `Skill ${i}`,
          category: 'Technical',
          level: SkillLevel.Intermediate
        }));

        const requiredSkills: Skill[] = [
          { id: 'skill-50', name: 'Skill 50', category: 'Technical', level: SkillLevel.Intermediate },
          { id: 'skill-99', name: 'Skill 99', category: 'Technical', level: SkillLevel.Intermediate }
        ];

        expect(service.validateSkillRequirements(technicianSkills, requiredSkills)).toBe(true);
      });

      it('should handle duplicate skills in technician array', () => {
        const technicianSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical', level: SkillLevel.Intermediate },
          { id: 'skill-1', name: 'Electrical', category: 'Technical', level: SkillLevel.Intermediate },
          { id: 'skill-2', name: 'Plumbing', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        const requiredSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        expect(service.validateSkillRequirements(technicianSkills, requiredSkills)).toBe(true);
      });

      it('should handle duplicate skills in required array', () => {
        const technicianSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        const requiredSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical' , level: SkillLevel.Intermediate },
          { id: 'skill-1', name: 'Electrical', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        expect(service.validateSkillRequirements(technicianSkills, requiredSkills)).toBe(true);
      });

      it('should handle skills with special characters in IDs', () => {
        const technicianSkills: Skill[] = [
          { id: 'skill-@#$%', name: 'Special Skill', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        const requiredSkills: Skill[] = [
          { id: 'skill-@#$%', name: 'Special Skill', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        expect(service.validateSkillRequirements(technicianSkills, requiredSkills)).toBe(true);
      });

      it('should handle skills with empty string names', () => {
        const technicianSkills: Skill[] = [
          { id: 'skill-1', name: '', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        const requiredSkills: Skill[] = [
          { id: 'skill-1', name: '', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        // Empty string name is falsy, so the service throws a validation error
        expect(() => service.validateSkillRequirements(technicianSkills, requiredSkills))
          .toThrowError('All technician skills must have valid id and name properties');
      });
    });

    describe('Precondition Validation', () => {
      it('should throw error when technicianSkills is not an array', () => {
        const invalidSkills = null as any;
        const validSkills: Skill[] = [];

        expect(() => service.validateSkillRequirements(invalidSkills, validSkills))
          .toThrowError('technicianSkills must be a valid array');
      });

      it('should throw error when requiredSkills is not an array', () => {
        const validSkills: Skill[] = [];
        const invalidSkills = undefined as any;

        expect(() => service.validateSkillRequirements(validSkills, invalidSkills))
          .toThrowError('requiredSkills must be a valid array');
      });

      it('should throw error when technician skill is missing id', () => {
        const technicianSkills: Skill[] = [
          { id: '', name: 'Electrical', category: 'Technical' , level: SkillLevel.Intermediate } as any
        ];

        const requiredSkills: Skill[] = [];

        expect(() => service.validateSkillRequirements(technicianSkills, requiredSkills))
          .toThrowError('All technician skills must have valid id and name properties');
      });

      it('should throw error when technician skill is missing name', () => {
        const technicianSkills: Skill[] = [
          { id: 'skill-1', name: '', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        const requiredSkills: Skill[] = [];

        expect(() => service.validateSkillRequirements(technicianSkills, requiredSkills))
          .toThrowError('All technician skills must have valid id and name properties');
      });

      it('should throw error when required skill is missing id', () => {
        const technicianSkills: Skill[] = [];

        const requiredSkills: Skill[] = [
          { id: '', name: 'Electrical', category: 'Technical' , level: SkillLevel.Intermediate } as any
        ];

        expect(() => service.validateSkillRequirements(technicianSkills, requiredSkills))
          .toThrowError('All required skills must have valid id and name properties');
      });

      it('should throw error when required skill is missing name', () => {
        const technicianSkills: Skill[] = [];

        const requiredSkills: Skill[] = [
          { id: 'skill-1', name: '', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        expect(() => service.validateSkillRequirements(technicianSkills, requiredSkills))
          .toThrowError('All required skills must have valid id and name properties');
      });

      it('should throw error when technician skill is null', () => {
        const technicianSkills: Skill[] = [null as any];
        const requiredSkills: Skill[] = [];

        expect(() => service.validateSkillRequirements(technicianSkills, requiredSkills))
          .toThrowError('All technician skills must have valid id and name properties');
      });

      it('should throw error when required skill is null', () => {
        const technicianSkills: Skill[] = [];
        const requiredSkills: Skill[] = [null as any];

        expect(() => service.validateSkillRequirements(technicianSkills, requiredSkills))
          .toThrowError('All required skills must have valid id and name properties');
      });
    });

    describe('Determinism and Idempotence', () => {
      it('should return same result when called multiple times with same inputs', () => {
        const technicianSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical' , level: SkillLevel.Intermediate },
          { id: 'skill-2', name: 'Plumbing', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        const requiredSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        const result1 = service.validateSkillRequirements(technicianSkills, requiredSkills);
        const result2 = service.validateSkillRequirements(technicianSkills, requiredSkills);
        const result3 = service.validateSkillRequirements(technicianSkills, requiredSkills);

        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
        expect(result1).toBe(true);
      });

      it('should not mutate input arrays', () => {
        const technicianSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        const requiredSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        const technicianSkillsCopy = JSON.parse(JSON.stringify(technicianSkills));
        const requiredSkillsCopy = JSON.parse(JSON.stringify(requiredSkills));

        service.validateSkillRequirements(technicianSkills, requiredSkills);

        expect(technicianSkills).toEqual(technicianSkillsCopy);
        expect(requiredSkills).toEqual(requiredSkillsCopy);
      });

      it('should not mutate skill objects', () => {
        const technicianSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        const requiredSkills: Skill[] = [
          { id: 'skill-1', name: 'Electrical', category: 'Technical' , level: SkillLevel.Intermediate }
        ];

        const originalTechSkill = { ...technicianSkills[0] };
        const originalReqSkill = { ...requiredSkills[0] };

        service.validateSkillRequirements(technicianSkills, requiredSkills);

        expect(technicianSkills[0]).toEqual(originalTechSkill);
        expect(requiredSkills[0]).toEqual(originalReqSkill);
      });
    });

    describe('Performance', () => {
      it('should validate skills efficiently with O(n+m) complexity', () => {
        const technicianSkills: Skill[] = Array.from({ length: 1000 }, (_, i) => ({
          id: `skill-${i}`,
          name: `Skill ${i}`,
          category: 'Technical',
          level: SkillLevel.Intermediate
        }));

        const requiredSkills: Skill[] = Array.from({ length: 500 }, (_, i) => ({
          id: `skill-${i * 2}`,
          name: `Skill ${i * 2}`,
          category: 'Technical',
          level: SkillLevel.Intermediate
        }));

        const startTime = performance.now();
        const result = service.validateSkillRequirements(technicianSkills, requiredSkills);
        const endTime = performance.now();

        expect(result).toBe(true);
        expect(endTime - startTime).toBeLessThan(50); // Should complete in less than 50ms
      });
    });
  });

  describe('calculateDistance()', () => {
    describe('Valid Distance Calculations', () => {
      it('should return 0 for identical locations', () => {
        const location1 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };
        const location2 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };

        const distance = service.calculateDistance(location1, location2);

        expect(distance).toBe(0);
      });

      it('should calculate distance between New York and Los Angeles correctly', () => {
        const newYork = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };
        const losAngeles = { latitude: 34.0522, longitude: -118.2437, accuracy: 10 };

        const distance = service.calculateDistance(newYork, losAngeles);

        // Expected distance is approximately 3944 km
        expect(distance).toBeGreaterThan(3900);
        expect(distance).toBeLessThan(4000);
      });

      it('should calculate distance between London and Paris correctly', () => {
        const london = { latitude: 51.5074, longitude: -0.1278, accuracy: 10 };
        const paris = { latitude: 48.8566, longitude: 2.3522, accuracy: 10 };

        const distance = service.calculateDistance(london, paris);

        // Expected distance is approximately 344 km
        expect(distance).toBeGreaterThan(340);
        expect(distance).toBeLessThan(350);
      });

      it('should calculate distance between Sydney and Melbourne correctly', () => {
        const sydney = { latitude: -33.8688, longitude: 151.2093, accuracy: 10 };
        const melbourne = { latitude: -37.8136, longitude: 144.9631, accuracy: 10 };

        const distance = service.calculateDistance(sydney, melbourne);

        // Expected distance is approximately 714 km
        expect(distance).toBeGreaterThan(700);
        expect(distance).toBeLessThan(730);
      });

      it('should handle locations at the equator', () => {
        const location1 = { latitude: 0, longitude: 0, accuracy: 10 };
        const location2 = { latitude: 0, longitude: 10, accuracy: 10 };

        const distance = service.calculateDistance(location1, location2);

        // Expected distance is approximately 1113 km (10 degrees at equator)
        expect(distance).toBeGreaterThan(1100);
        expect(distance).toBeLessThan(1120);
      });

      it('should handle locations at the poles', () => {
        const northPole = { latitude: 90, longitude: 0, accuracy: 10 };
        const nearNorthPole = { latitude: 89, longitude: 0, accuracy: 10 };

        const distance = service.calculateDistance(northPole, nearNorthPole);

        // Expected distance is approximately 111 km (1 degree of latitude)
        expect(distance).toBeGreaterThan(110);
        expect(distance).toBeLessThan(112);
      });

      it('should handle locations crossing the international date line', () => {
        const location1 = { latitude: 0, longitude: 179, accuracy: 10 };
        const location2 = { latitude: 0, longitude: -179, accuracy: 10 };

        const distance = service.calculateDistance(location1, location2);

        // Expected distance is approximately 222 km (2 degrees at equator)
        expect(distance).toBeGreaterThan(220);
        expect(distance).toBeLessThan(225);
      });

      it('should handle locations in different hemispheres', () => {
        const northernHemisphere = { latitude: 40, longitude: 0, accuracy: 10 };
        const southernHemisphere = { latitude: -40, longitude: 0, accuracy: 10 };

        const distance = service.calculateDistance(northernHemisphere, southernHemisphere);

        // Expected distance is approximately 8900 km (80 degrees of latitude)
        expect(distance).toBeGreaterThan(8800);
        expect(distance).toBeLessThan(9000);
      });
    });

    describe('Edge Cases', () => {
      it('should handle very small distances (< 1 meter)', () => {
        const location1 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };
        const location2 = { latitude: 40.71280001, longitude: -74.00600001, accuracy: 10 };

        const distance = service.calculateDistance(location1, location2);

        expect(distance).toBeGreaterThanOrEqual(0);
        expect(distance).toBeLessThan(0.01); // Less than 10 meters
      });

      it('should handle maximum distance (antipodal points)', () => {
        const location1 = { latitude: 0, longitude: 0, accuracy: 10 };
        const location2 = { latitude: 0, longitude: 180, accuracy: 10 };

        const distance = service.calculateDistance(location1, location2);

        // Half the Earth's circumference at equator (~20,000 km)
        expect(distance).toBeGreaterThan(19900);
        expect(distance).toBeLessThan(20100);
      });

      it('should handle locations at boundary latitudes', () => {
        const southPole = { latitude: -90, longitude: 0, accuracy: 10 };
        const northPole = { latitude: 90, longitude: 0, accuracy: 10 };

        const distance = service.calculateDistance(southPole, northPole);

        // Half the Earth's circumference through poles (~20,000 km)
        expect(distance).toBeGreaterThan(19900);
        expect(distance).toBeLessThan(20100);
      });

      it('should handle locations at boundary longitudes', () => {
        const location1 = { latitude: 0, longitude: -180, accuracy: 10 };
        const location2 = { latitude: 0, longitude: 180, accuracy: 10 };

        const distance = service.calculateDistance(location1, location2);

        // Same location (180 and -180 are the same meridian)
        // Floating point precision means distance is near 0, not exactly 0
        expect(distance).toBeLessThan(0.001);
      });
    });

    describe('Precondition Validation', () => {
      it('should throw error when location1 is null', () => {
        const location1 = null as any;
        const location2 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };

        expect(() => service.calculateDistance(location1, location2))
          .toThrowError('location1 must be a valid GeoLocation with latitude and longitude');
      });

      it('should throw error when location2 is null', () => {
        const location1 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };
        const location2 = null as any;

        expect(() => service.calculateDistance(location1, location2))
          .toThrowError('location2 must be a valid GeoLocation with latitude and longitude');
      });

      it('should throw error when location1 latitude is missing', () => {
        const location1 = { longitude: -74.0060 } as any;
        const location2 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };

        expect(() => service.calculateDistance(location1, location2))
          .toThrowError('location1 must be a valid GeoLocation with latitude and longitude');
      });

      it('should throw error when location1 longitude is missing', () => {
        const location1 = { latitude: 40.7128 } as any;
        const location2 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };

        expect(() => service.calculateDistance(location1, location2))
          .toThrowError('location1 must be a valid GeoLocation with latitude and longitude');
      });

      it('should throw error when location1 latitude is below -90', () => {
        const location1 = { latitude: -91, longitude: -74.0060, accuracy: 10 };
        const location2 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };

        expect(() => service.calculateDistance(location1, location2))
          .toThrowError('location1.latitude must be between -90 and 90');
      });

      it('should throw error when location1 latitude is above 90', () => {
        const location1 = { latitude: 91, longitude: -74.0060, accuracy: 10 };
        const location2 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };

        expect(() => service.calculateDistance(location1, location2))
          .toThrowError('location1.latitude must be between -90 and 90');
      });

      it('should throw error when location1 longitude is below -180', () => {
        const location1 = { latitude: 40.7128, longitude: -181, accuracy: 10 };
        const location2 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };

        expect(() => service.calculateDistance(location1, location2))
          .toThrowError('location1.longitude must be between -180 and 180');
      });

      it('should throw error when location1 longitude is above 180', () => {
        const location1 = { latitude: 40.7128, longitude: 181, accuracy: 10 };
        const location2 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };

        expect(() => service.calculateDistance(location1, location2))
          .toThrowError('location1.longitude must be between -180 and 180');
      });

      it('should throw error when location2 latitude is below -90', () => {
        const location1 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };
        const location2 = { latitude: -91, longitude: -74.0060, accuracy: 10 };

        expect(() => service.calculateDistance(location1, location2))
          .toThrowError('location2.latitude must be between -90 and 90');
      });

      it('should throw error when location2 latitude is above 90', () => {
        const location1 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };
        const location2 = { latitude: 91, longitude: -74.0060, accuracy: 10 };

        expect(() => service.calculateDistance(location1, location2))
          .toThrowError('location2.latitude must be between -90 and 90');
      });

      it('should throw error when location2 longitude is below -180', () => {
        const location1 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };
        const location2 = { latitude: 40.7128, longitude: -181, accuracy: 10 };

        expect(() => service.calculateDistance(location1, location2))
          .toThrowError('location2.longitude must be between -180 and 180');
      });

      it('should throw error when location2 longitude is above 180', () => {
        const location1 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };
        const location2 = { latitude: 40.7128, longitude: 181, accuracy: 10 };

        expect(() => service.calculateDistance(location1, location2))
          .toThrowError('location2.longitude must be between -180 and 180');
      });
    });

    describe('Determinism and Idempotence', () => {
      it('should return same result when called multiple times with same inputs', () => {
        const location1 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };
        const location2 = { latitude: 34.0522, longitude: -118.2437, accuracy: 10 };

        const result1 = service.calculateDistance(location1, location2);
        const result2 = service.calculateDistance(location1, location2);
        const result3 = service.calculateDistance(location1, location2);

        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      });

      it('should be commutative (order of locations should not matter)', () => {
        const location1 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };
        const location2 = { latitude: 34.0522, longitude: -118.2437, accuracy: 10 };

        const result1 = service.calculateDistance(location1, location2);
        const result2 = service.calculateDistance(location2, location1);

        expect(result1).toBe(result2);
      });

      it('should not mutate input locations', () => {
        const location1 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };
        const location2 = { latitude: 34.0522, longitude: -118.2437, accuracy: 10 };

        const location1Copy = { ...location1 };
        const location2Copy = { ...location2 };

        service.calculateDistance(location1, location2);

        expect(location1).toEqual(location1Copy);
        expect(location2).toEqual(location2Copy);
      });

      it('should always return non-negative distance', () => {
        const location1 = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };
        const location2 = { latitude: -33.8688, longitude: 151.2093, accuracy: 10 };

        const distance = service.calculateDistance(location1, location2);

        expect(distance).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('assignTechnicianToJob()', () => {
    const validJobId = '123e4567-e89b-12d3-a456-426614174000';
    const validTechnicianId = '123e4567-e89b-12d3-a456-426614174001';
    const validAssignedBy = '123e4567-e89b-12d3-a456-426614174002';

    describe('Successful Assignment', () => {
      it('should assign technician to job successfully', (done) => {
        const mockAssignment: Assignment = {
          id: '123e4567-e89b-12d3-a456-426614174003',
          jobId: validJobId,
          technicianId: validTechnicianId,
          assignedBy: validAssignedBy,
          assignedAt: new Date(),
          status: AssignmentStatus.Assigned,
          isActive: true
        };

        service.assignTechnicianToJob(validJobId, validTechnicianId, validAssignedBy).subscribe({
          next: (assignment) => {
            expect(assignment).toEqual(mockAssignment);
            done();
          },
          error: done.fail
        });

        const req = httpMock.expectOne('/api/scheduling/assign');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
          jobId: validJobId,
          technicianId: validTechnicianId,
          overrideConflicts: false,
          justification: undefined
        });
        req.flush(mockAssignment);
      });

      it('should assign with override conflicts when specified', (done) => {
        const mockAssignment: Assignment = {
          id: '123e4567-e89b-12d3-a456-426614174003',
          jobId: validJobId,
          technicianId: validTechnicianId,
          assignedBy: validAssignedBy,
          assignedAt: new Date(),
          status: AssignmentStatus.Assigned,
          isActive: true
        };

        service.assignTechnicianToJob(
          validJobId,
          validTechnicianId,
          validAssignedBy,
          true,
          'Emergency assignment'
        ).subscribe({
          next: (assignment) => {
            expect(assignment).toEqual(mockAssignment);
            done();
          },
          error: done.fail
        });

        const req = httpMock.expectOne('/api/scheduling/assign');
        expect(req.request.body).toEqual({
          jobId: validJobId,
          technicianId: validTechnicianId,
          overrideConflicts: true,
          justification: 'Emergency assignment'
        });
        req.flush(mockAssignment);
      });
    });

    describe('Precondition Validation', () => {
      it('should throw error for invalid jobId', (done) => {
        service.assignTechnicianToJob('   ', validTechnicianId, validAssignedBy).subscribe({
          next: () => done.fail('Should have thrown error'),
          error: (error) => {
            expect(error.message).toBe('Invalid jobId: must be a non-empty string');
            done();
          }
        });

        httpMock.expectNone('/api/scheduling/assign');
      });

      it('should throw error for empty jobId', (done) => {
        service.assignTechnicianToJob('', validTechnicianId, validAssignedBy).subscribe({
          next: () => done.fail('Should have thrown error'),
          error: (error) => {
            expect(error.message).toBe('Invalid jobId: must be a non-empty string');
            done();
          }
        });

        httpMock.expectNone('/api/scheduling/assign');
      });

      it('should throw error for invalid technicianId', (done) => {
        service.assignTechnicianToJob(validJobId, '   ', validAssignedBy).subscribe({
          next: () => done.fail('Should have thrown error'),
          error: (error) => {
            expect(error.message).toBe('Invalid technicianId: must be a non-empty string');
            done();
          }
        });

        httpMock.expectNone('/api/scheduling/assign');
      });

      it('should throw error for invalid assignedBy', (done) => {
        service.assignTechnicianToJob(validJobId, validTechnicianId, '   ').subscribe({
          next: () => done.fail('Should have thrown error'),
          error: (error) => {
            expect(error.message).toBe('Invalid assignedBy: must be a non-empty string');
            done();
          }
        });

        httpMock.expectNone('/api/scheduling/assign');
      });

      it('should throw error when overrideConflicts is true but justification is missing', (done) => {
        service.assignTechnicianToJob(validJobId, validTechnicianId, validAssignedBy, true).subscribe({
          next: () => done.fail('Should have thrown error'),
          error: (error) => {
            expect(error.message).toBe('Justification is required when overriding conflicts');
            done();
          }
        });

        httpMock.expectNone('/api/scheduling/assign');
      });

      it('should throw error when overrideConflicts is true but justification is empty', (done) => {
        service.assignTechnicianToJob(validJobId, validTechnicianId, validAssignedBy, true, '   ').subscribe({
          next: () => done.fail('Should have thrown error'),
          error: (error) => {
            expect(error.message).toBe('Justification is required when overriding conflicts');
            done();
          }
        });

        httpMock.expectNone('/api/scheduling/assign');
      });
    });

    describe('Error Handling', () => {
      it('should handle 409 conflict error', (done) => {
        service.assignTechnicianToJob(validJobId, validTechnicianId, validAssignedBy).subscribe({
          next: () => done.fail('Should have thrown error'),
          error: (error) => {
            expect(error.message).toContain('Scheduling conflict detected');
            done();
          }
        });

        const req = httpMock.expectOne('/api/scheduling/assign');
        req.flush(null, { status: 409, statusText: 'Conflict' });
      });

      it('should handle 422 skill mismatch error', (done) => {
        service.assignTechnicianToJob(validJobId, validTechnicianId, validAssignedBy).subscribe({
          next: () => done.fail('Should have thrown error'),
          error: (error) => {
            expect(error.message).toContain('Technician does not have required skills');
            done();
          }
        });

        const req = httpMock.expectOne('/api/scheduling/assign');
        req.flush(null, { status: 422, statusText: 'Unprocessable Entity' });
      });

      it('should handle 404 not found error', (done) => {
        service.assignTechnicianToJob(validJobId, validTechnicianId, validAssignedBy).subscribe({
          next: () => done.fail('Should have thrown error'),
          error: (error) => {
            expect(error.message).toContain('Resource not found');
            done();
          }
        });

        const req = httpMock.expectOne('/api/scheduling/assign');
        req.flush(null, { status: 404, statusText: 'Not Found' });
      });
    });
  });

  describe('detectAssignmentConflicts()', () => {
    const validJobId = '123e4567-e89b-12d3-a456-426614174000';
    const validTechnicianId = '123e4567-e89b-12d3-a456-426614174001';
    const validStart = new Date('2024-01-01T10:00:00');
    const validEnd = new Date('2024-01-01T14:00:00');

    describe('Successful Conflict Detection', () => {
      it('should detect conflicts successfully', (done) => {
        const mockConflicts: Conflict[] = [
          {
            jobId: validJobId,
            technicianId: validTechnicianId,
            conflictingJobId: '123e4567-e89b-12d3-a456-426614174004',
            conflictingJobTitle: 'Conflicting Job',
            timeRange: {
              startDate: validStart,
              endDate: validEnd
            },
            severity: ConflictSeverity.Error
          }
        ];

        service.detectAssignmentConflicts(validJobId, validTechnicianId, validStart, validEnd).subscribe({
          next: (conflicts) => {
            expect(conflicts).toEqual(mockConflicts);
            done();
          },
          error: done.fail
        });

        const req = httpMock.expectOne((request) => {
          return request.url === '/api/scheduling/conflicts/detect' &&
                 request.params.get('jobId') === validJobId &&
                 request.params.get('technicianId') === validTechnicianId;
        });
        expect(req.request.method).toBe('GET');
        req.flush(mockConflicts);
      });

      it('should return empty array when no conflicts exist', (done) => {
        service.detectAssignmentConflicts(validJobId, validTechnicianId, validStart, validEnd).subscribe({
          next: (conflicts) => {
            expect(conflicts).toEqual([]);
            done();
          },
          error: done.fail
        });

        const req = httpMock.expectOne((request) => request.url === '/api/scheduling/conflicts/detect');
        req.flush([]);
      });
    });

    describe('Precondition Validation', () => {
      it('should throw error for invalid jobId', (done) => {
        service.detectAssignmentConflicts('   ', validTechnicianId, validStart, validEnd).subscribe({
          next: () => done.fail('Should have thrown error'),
          error: (error) => {
            expect(error.message).toBe('Invalid jobId: must be a non-empty string');
            done();
          }
        });

        httpMock.expectNone('/api/scheduling/conflicts/detect');
      });

      it('should throw error for invalid technicianId', (done) => {
        service.detectAssignmentConflicts(validJobId, '   ', validStart, validEnd).subscribe({
          next: () => done.fail('Should have thrown error'),
          error: (error) => {
            expect(error.message).toBe('Invalid technicianId: must be a non-empty string');
            done();
          }
        });

        httpMock.expectNone('/api/scheduling/conflicts/detect');
      });

      it('should throw error when scheduledStart is after scheduledEnd', (done) => {
        const invalidStart = new Date('2024-01-01T14:00:00');
        const invalidEnd = new Date('2024-01-01T10:00:00');

        service.detectAssignmentConflicts(validJobId, validTechnicianId, invalidStart, invalidEnd).subscribe({
          next: () => done.fail('Should have thrown error'),
          error: (error) => {
            expect(error.message).toBe('scheduledStart must be before scheduledEnd');
            done();
          }
        });

        httpMock.expectNone('/api/scheduling/conflicts/detect');
      });
    });
  });

  describe('getAssignments()', () => {
    it('should get assignments without filters', (done) => {
      const mockAssignments: Assignment[] = [
        {
          id: '1',
          jobId: 'job-1',
          technicianId: 'tech-1',
          assignedBy: 'user-1',
          assignedAt: new Date(),
          status: AssignmentStatus.Assigned,
          isActive: true
        }
      ];

      service.getAssignments().subscribe({
        next: (assignments) => {
          expect(assignments).toEqual(mockAssignments);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne('/api/scheduling/assignments');
      expect(req.request.method).toBe('GET');
      req.flush(mockAssignments);
    });

    it('should get assignments with filters', (done) => {
      const filters = {
        technicianId: 'tech-1',
        jobId: 'job-1',
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        isActive: true,
        page: 1,
        pageSize: 10
      };

      service.getAssignments(filters).subscribe({
        next: () => done(),
        error: done.fail
      });

      const req = httpMock.expectOne((request) => {
        return request.url === '/api/scheduling/assignments' &&
               request.params.get('technicianId') === 'tech-1' &&
               request.params.get('jobId') === 'job-1' &&
               request.params.get('isActive') === 'true' &&
               request.params.get('page') === '1' &&
               request.params.get('pageSize') === '10';
      });
      req.flush([]);
    });

    it('should retry on failure', (done) => {
      let attemptCount = 0;

      service.getAssignments().subscribe({
        next: () => done(),
        error: done.fail
      });

      // First attempt fails
      const req1 = httpMock.expectOne('/api/scheduling/assignments');
      req1.flush(null, { status: 500, statusText: 'Server Error' });

      // Second attempt fails
      const req2 = httpMock.expectOne('/api/scheduling/assignments');
      req2.flush(null, { status: 500, statusText: 'Server Error' });

      // Third attempt succeeds
      const req3 = httpMock.expectOne('/api/scheduling/assignments');
      req3.flush([]);
    });
  });

  describe('unassignTechnician()', () => {
    it('should unassign technician successfully', (done) => {
      const assignmentId = '123e4567-e89b-12d3-a456-426614174000';

      service.unassignTechnician(assignmentId).subscribe({
        next: () => done(),
        error: done.fail
      });

      const req = httpMock.expectOne(`/api/scheduling/assignments/${assignmentId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('reassignJob()', () => {
    it('should reassign job successfully', (done) => {
      const jobId = '123e4567-e89b-12d3-a456-426614174000';
      const fromTechnicianId = '123e4567-e89b-12d3-a456-426614174001';
      const toTechnicianId = '123e4567-e89b-12d3-a456-426614174002';
      const reason = 'Technician unavailable';

      const mockAssignment: Assignment = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        jobId,
        technicianId: toTechnicianId,
        assignedBy: 'user-1',
        assignedAt: new Date(),
          status: AssignmentStatus.Assigned,
          isActive: true
        };

      const mockResponse = { oldAssignmentId: '123e4567-e89b-12d3-a456-426614174009', newAssignment: mockAssignment };

      service.reassignJob(jobId, fromTechnicianId, toTechnicianId, reason).subscribe({
        next: (result) => {
          expect(result.newAssignment).toEqual(mockAssignment);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne('/api/scheduling/reassign');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        jobId,
        fromTechnicianId,
        toTechnicianId,
        reason
      });
      req.flush(mockResponse);
    });
  });

  describe('acceptAssignment()', () => {
    it('should accept assignment successfully', (done) => {
      const assignmentId = '123e4567-e89b-12d3-a456-426614174000';
      const mockAssignment: Assignment = {
        id: assignmentId,
        jobId: 'job-1',
        technicianId: 'tech-1',
        assignedBy: 'user-1',
        assignedAt: new Date(),
        status: AssignmentStatus.Assigned,
          isActive: true
      };

      service.acceptAssignment(assignmentId).subscribe({
        next: (assignment) => {
          expect(assignment.isActive).toBe(true);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`/api/scheduling/assignments/${assignmentId}/accept`);
      expect(req.request.method).toBe('POST');
      req.flush(mockAssignment);
    });
  });

  describe('rejectAssignment()', () => {
    it('should reject assignment successfully', (done) => {
      const assignmentId = '123e4567-e89b-12d3-a456-426614174000';
      const reason = 'Not available';
      const mockAssignment: Assignment = {
        id: assignmentId,
        jobId: 'job-1',
        technicianId: 'tech-1',
        assignedBy: 'user-1',
        assignedAt: new Date(),
        status: AssignmentStatus.Assigned,
          isActive: false
      };

      service.rejectAssignment(assignmentId, reason).subscribe({
        next: (assignment) => {
          expect(assignment.isActive).toBe(false);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`/api/scheduling/assignments/${assignmentId}/reject`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ reason });
      req.flush(mockAssignment);
    });
  });
});
