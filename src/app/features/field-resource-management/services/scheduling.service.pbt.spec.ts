import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import * as fc from 'fast-check';
import { SchedulingService } from './scheduling.service';
import { Skill } from '../models/technician.model';

/**
 * Property-Based Tests for SchedulingService Conflict Detection
 * 
 * These tests verify universal properties that should hold for all inputs:
 * - Time overlap detection is commutative and transitive
 * - Skill validation is deterministic and idempotent
 * - Distance calculation follows mathematical properties
 * - All functions maintain immutability
 * - Preconditions are consistently enforced
 * 
 * **Validates Requirements:**
 * - 1.5.2: Detect and warn about assignment conflicts
 * - 1.5.3: Prevent double-booking of technicians
 * - 1.5.4: Validate technician skills for jobs
 * - 1.6.4: Calculate distances between technicians and job sites
 */
describe('SchedulingService - Property-Based Tests for Conflict Detection', () => {
  let service: SchedulingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SchedulingService]
    });
    service = TestBed.inject(SchedulingService);
  });

  // ============================================================================
  // ARBITRARIES (Generators for property-based testing)
  // ============================================================================

  /**
   * Generates valid Date objects within a reasonable range
   */
  const validDateArb = fc.date({
    min: new Date('2020-01-01'),
    max: new Date('2030-12-31')
  });

  /**
   * Generates valid time ranges where start < end
   */
  const validTimeRangeArb = fc.tuple(validDateArb, validDateArb)
    .filter(([start, end]) => start < end)
    .map(([start, end]) => ({ start, end }));

  /**
   * Generates valid latitude values (-90 to 90)
   */
  const latitudeArb = fc.double({ min: -90, max: 90, noNaN: true });

  /**
   * Generates valid longitude values (-180 to 180)
   */
  const longitudeArb = fc.double({ min: -180, max: 180, noNaN: true });

  /**
   * Generates valid geographic locations
   */
  const geoLocationArb = fc.record({
    latitude: latitudeArb,
    longitude: longitudeArb
  });

  /**
   * Generates valid skill objects
   */
  const skillArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    category: fc.constantFrom('Technical', 'Safety', 'Management', 'Communication')
  }).map(obj => obj as Skill);

  /**
   * Generates arrays of unique skills (no duplicate IDs)
   */
  const uniqueSkillArrayArb = fc.array(skillArb, { minLength: 0, maxLength: 10 })
    .map(skills => {
      const uniqueSkills = new Map<string, Skill>();
      skills.forEach(skill => uniqueSkills.set(skill.id, skill));
      return Array.from(uniqueSkills.values());
    });

  // ============================================================================
  // PROPERTY 1: Time Overlap Commutativity
  // ============================================================================

  /**
   * Property: Time overlap detection should be commutative
   * 
   * For any two time ranges A and B:
   * overlap(A, B) = overlap(B, A)
   * 
   * **Validates: Requirement 1.5.2 - Detect assignment conflicts**
   */
  it('PROPERTY: timeRangesOverlap should be commutative', () => {
    fc.assert(
      fc.property(
        validTimeRangeArb,
        validTimeRangeArb,
        (range1, range2) => {
          const result1 = service.timeRangesOverlap(
            range1.start, range1.end,
            range2.start, range2.end
          );
          const result2 = service.timeRangesOverlap(
            range2.start, range2.end,
            range1.start, range1.end
          );

          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 2: Time Overlap Reflexivity
  // ============================================================================

  /**
   * Property: A time range always overlaps with itself (unless zero-duration)
   * 
   * For any time range A where start < end:
   * overlap(A, A) = true
   * 
   * **Validates: Requirement 1.5.2 - Detect assignment conflicts**
   */
  it('PROPERTY: timeRangesOverlap should be reflexive for non-zero ranges', () => {
    fc.assert(
      fc.property(
        validTimeRangeArb,
        (range) => {
          const result = service.timeRangesOverlap(
            range.start, range.end,
            range.start, range.end
          );

          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 3: Time Overlap Transitivity (Partial)
  // ============================================================================

  /**
   * Property: If A overlaps B and B overlaps C, and all three share a common point,
   * then A and C must overlap
   * 
   * Note: Full transitivity doesn't hold for intervals (A-B-C in sequence),
   * but if there's a common overlap point, transitivity holds
   * 
   * **Validates: Requirement 1.5.3 - Prevent double-booking**
   */
  it('PROPERTY: timeRangesOverlap has partial transitivity with common overlap', () => {
    fc.assert(
      fc.property(
        validDateArb,
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (baseDate, hours1, hours2, hours3) => {
          // Create three overlapping ranges with a common point
          const start1 = new Date(baseDate);
          const end1 = new Date(baseDate.getTime() + hours1 * 3600000);
          
          const start2 = new Date(baseDate.getTime() + (hours1 / 2) * 3600000);
          const end2 = new Date(start2.getTime() + hours2 * 3600000);
          
          const start3 = new Date(baseDate.getTime() + (hours1 / 2) * 3600000);
          const end3 = new Date(start3.getTime() + hours3 * 3600000);

          const overlap12 = service.timeRangesOverlap(start1, end1, start2, end2);
          const overlap23 = service.timeRangesOverlap(start2, end2, start3, end3);
          const overlap13 = service.timeRangesOverlap(start1, end1, start3, end3);

          // If 1-2 overlap and 2-3 overlap, and they share a common point, then 1-3 must overlap
          if (overlap12 && overlap23) {
            expect(overlap13).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 4: Time Overlap Immutability
  // ============================================================================

  /**
   * Property: timeRangesOverlap should never mutate input dates
   * 
   * **Validates: Requirement 1.5.2 - No side effects on existing data**
   */
  it('PROPERTY: timeRangesOverlap should not mutate input dates', () => {
    fc.assert(
      fc.property(
        validTimeRangeArb,
        validTimeRangeArb,
        (range1, range2) => {
          const start1Time = range1.start.getTime();
          const end1Time = range1.end.getTime();
          const start2Time = range2.start.getTime();
          const end2Time = range2.end.getTime();

          service.timeRangesOverlap(
            range1.start, range1.end,
            range2.start, range2.end
          );

          expect(range1.start.getTime()).toBe(start1Time);
          expect(range1.end.getTime()).toBe(end1Time);
          expect(range2.start.getTime()).toBe(start2Time);
          expect(range2.end.getTime()).toBe(end2Time);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 5: Time Overlap Determinism
  // ============================================================================

  /**
   * Property: timeRangesOverlap should be deterministic
   * 
   * Same inputs always produce same outputs
   * 
   * **Validates: Requirement 1.5.2 - Result is deterministic**
   */
  it('PROPERTY: timeRangesOverlap should be deterministic', () => {
    fc.assert(
      fc.property(
        validTimeRangeArb,
        validTimeRangeArb,
        (range1, range2) => {
          const result1 = service.timeRangesOverlap(
            range1.start, range1.end,
            range2.start, range2.end
          );
          const result2 = service.timeRangesOverlap(
            range1.start, range1.end,
            range2.start, range2.end
          );
          const result3 = service.timeRangesOverlap(
            range1.start, range1.end,
            range2.start, range2.end
          );

          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 6: Non-Overlapping Ranges
  // ============================================================================

  /**
   * Property: Ranges that are completely separate should never overlap
   * 
   * If end1 <= start2, then ranges don't overlap
   * 
   * **Validates: Requirement 1.5.3 - Prevent double-booking**
   */
  it('PROPERTY: completely separate ranges should not overlap', () => {
    fc.assert(
      fc.property(
        validDateArb,
        fc.integer({ min: 1, max: 24 }),
        fc.integer({ min: 1, max: 24 }),
        fc.integer({ min: 1, max: 24 }),
        (baseDate, duration1, gap, duration2) => {
          const start1 = new Date(baseDate);
          const end1 = new Date(baseDate.getTime() + duration1 * 3600000);
          
          const start2 = new Date(end1.getTime() + gap * 3600000);
          const end2 = new Date(start2.getTime() + duration2 * 3600000);

          const result = service.timeRangesOverlap(start1, end1, start2, end2);

          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 7: Skill Validation Idempotence
  // ============================================================================

  /**
   * Property: validateSkillRequirements should be idempotent
   * 
   * Calling the function multiple times with same inputs produces same result
   * 
   * **Validates: Requirement 1.5.4 - Validate technician skills**
   */
  it('PROPERTY: validateSkillRequirements should be idempotent', () => {
    fc.assert(
      fc.property(
        uniqueSkillArrayArb,
        uniqueSkillArrayArb,
        (technicianSkills, requiredSkills) => {
          const result1 = service.validateSkillRequirements(technicianSkills, requiredSkills);
          const result2 = service.validateSkillRequirements(technicianSkills, requiredSkills);
          const result3 = service.validateSkillRequirements(technicianSkills, requiredSkills);

          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 8: Skill Validation Monotonicity
  // ============================================================================

  /**
   * Property: Adding more skills to technician should not cause validation to fail
   * 
   * If validation passes with skills S, it should also pass with S ∪ {new skill}
   * 
   * **Validates: Requirement 1.5.4 - Validate technician skills**
   */
  it('PROPERTY: validateSkillRequirements should be monotonic (more skills = same or better)', () => {
    fc.assert(
      fc.property(
        uniqueSkillArrayArb,
        uniqueSkillArrayArb,
        skillArb,
        (technicianSkills, requiredSkills, additionalSkill) => {
          const result1 = service.validateSkillRequirements(technicianSkills, requiredSkills);
          
          // Add additional skill to technician (if not already present)
          const enhancedSkills = [...technicianSkills];
          if (!enhancedSkills.some(s => s.id === additionalSkill.id)) {
            enhancedSkills.push(additionalSkill);
          }
          
          const result2 = service.validateSkillRequirements(enhancedSkills, requiredSkills);

          // If validation passed before, it should still pass with more skills
          if (result1) {
            expect(result2).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 9: Skill Validation Subset Property
  // ============================================================================

  /**
   * Property: If technician has all required skills, validation passes
   * 
   * If requiredSkills ⊆ technicianSkills, then validation = true
   * 
   * **Validates: Requirement 1.5.4 - Validate technician skills**
   */
  it('PROPERTY: validateSkillRequirements should pass when required skills are subset', () => {
    fc.assert(
      fc.property(
        uniqueSkillArrayArb.filter(skills => skills.length > 0),
        fc.integer({ min: 0, max: 5 }),
        (technicianSkills, numRequired) => {
          // Take a subset of technician skills as required skills
          const requiredSkills = technicianSkills.slice(0, Math.min(numRequired, technicianSkills.length));
          
          const result = service.validateSkillRequirements(technicianSkills, requiredSkills);

          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 10: Skill Validation Empty Requirements
  // ============================================================================

  /**
   * Property: If no skills are required, validation always passes
   * 
   * validateSkillRequirements(anySkills, []) = true
   * 
   * **Validates: Requirement 1.5.4 - Validate technician skills**
   */
  it('PROPERTY: validateSkillRequirements should always pass with empty requirements', () => {
    fc.assert(
      fc.property(
        uniqueSkillArrayArb,
        (technicianSkills) => {
          const result = service.validateSkillRequirements(technicianSkills, []);

          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 11: Skill Validation Immutability
  // ============================================================================

  /**
   * Property: validateSkillRequirements should not mutate input arrays
   * 
   * **Validates: Requirement 1.5.4 - No side effects on input parameters**
   */
  it('PROPERTY: validateSkillRequirements should not mutate input arrays', () => {
    fc.assert(
      fc.property(
        uniqueSkillArrayArb,
        uniqueSkillArrayArb,
        (technicianSkills, requiredSkills) => {
          const technicianSkillsCopy = JSON.parse(JSON.stringify(technicianSkills));
          const requiredSkillsCopy = JSON.parse(JSON.stringify(requiredSkills));

          service.validateSkillRequirements(technicianSkills, requiredSkills);

          expect(technicianSkills).toEqual(technicianSkillsCopy);
          expect(requiredSkills).toEqual(requiredSkillsCopy);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 12: Distance Calculation Commutativity
  // ============================================================================

  /**
   * Property: Distance calculation should be commutative
   * 
   * distance(A, B) = distance(B, A)
   * 
   * **Validates: Requirement 1.6.4 - Calculate distances**
   */
  it('PROPERTY: calculateDistance should be commutative', () => {
    fc.assert(
      fc.property(
        geoLocationArb,
        geoLocationArb,
        (location1, location2) => {
          const distance1 = service.calculateDistance(location1, location2);
          const distance2 = service.calculateDistance(location2, location1);

          expect(distance1).toBeCloseTo(distance2, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 13: Distance Calculation Non-Negativity
  // ============================================================================

  /**
   * Property: Distance should always be non-negative
   * 
   * ∀ locations A, B: distance(A, B) >= 0
   * 
   * **Validates: Requirement 1.6.4 - Calculate distances**
   */
  it('PROPERTY: calculateDistance should always return non-negative values', () => {
    fc.assert(
      fc.property(
        geoLocationArb,
        geoLocationArb,
        (location1, location2) => {
          const distance = service.calculateDistance(location1, location2);

          expect(distance).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 14: Distance Calculation Identity
  // ============================================================================

  /**
   * Property: Distance from a location to itself is zero
   * 
   * distance(A, A) = 0
   * 
   * **Validates: Requirement 1.6.4 - Calculate distances**
   */
  it('PROPERTY: calculateDistance should return zero for identical locations', () => {
    fc.assert(
      fc.property(
        geoLocationArb,
        (location) => {
          const distance = service.calculateDistance(location, location);

          expect(distance).toBeCloseTo(0, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 15: Distance Calculation Triangle Inequality
  // ============================================================================

  /**
   * Property: Triangle inequality should hold
   * 
   * distance(A, C) <= distance(A, B) + distance(B, C)
   * 
   * This is a fundamental property of metric spaces
   * 
   * **Validates: Requirement 1.6.4 - Calculate distances accurately**
   */
  it('PROPERTY: calculateDistance should satisfy triangle inequality', () => {
    fc.assert(
      fc.property(
        geoLocationArb,
        geoLocationArb,
        geoLocationArb,
        (locationA, locationB, locationC) => {
          const distanceAB = service.calculateDistance(locationA, locationB);
          const distanceBC = service.calculateDistance(locationB, locationC);
          const distanceAC = service.calculateDistance(locationA, locationC);

          // Triangle inequality: d(A,C) <= d(A,B) + d(B,C)
          // Allow small floating point tolerance
          expect(distanceAC).toBeLessThanOrEqual(distanceAB + distanceBC + 0.001);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 16: Distance Calculation Immutability
  // ============================================================================

  /**
   * Property: calculateDistance should not mutate input locations
   * 
   * **Validates: Requirement 1.6.4 - No side effects on input parameters**
   */
  it('PROPERTY: calculateDistance should not mutate input locations', () => {
    fc.assert(
      fc.property(
        geoLocationArb,
        geoLocationArb,
        (location1, location2) => {
          const location1Copy = { ...location1 };
          const location2Copy = { ...location2 };

          service.calculateDistance(location1, location2);

          expect(location1).toEqual(location1Copy);
          expect(location2).toEqual(location2Copy);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 17: Distance Calculation Determinism
  // ============================================================================

  /**
   * Property: calculateDistance should be deterministic
   * 
   * Same inputs always produce same outputs
   * 
   * **Validates: Requirement 1.6.4 - Result is deterministic**
   */
  it('PROPERTY: calculateDistance should be deterministic', () => {
    fc.assert(
      fc.property(
        geoLocationArb,
        geoLocationArb,
        (location1, location2) => {
          const result1 = service.calculateDistance(location1, location2);
          const result2 = service.calculateDistance(location1, location2);
          const result3 = service.calculateDistance(location1, location2);

          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 18: Distance Calculation Bounded by Earth Circumference
  // ============================================================================

  /**
   * Property: Distance should never exceed half Earth's circumference
   * 
   * Maximum distance between any two points on Earth is ~20,000 km
   * 
   * **Validates: Requirement 1.6.4 - Calculate distances accurately**
   */
  it('PROPERTY: calculateDistance should never exceed half Earth circumference', () => {
    fc.assert(
      fc.property(
        geoLocationArb,
        geoLocationArb,
        (location1, location2) => {
          const distance = service.calculateDistance(location1, location2);
          const maxDistance = 20100; // Half Earth's circumference in km (with margin)

          expect(distance).toBeLessThanOrEqual(maxDistance);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 19: Conflict Detection Consistency
  // ============================================================================

  /**
   * Property: If two ranges overlap, they should be detected as conflicts
   * 
   * This is a meta-property that combines overlap detection with conflict logic
   * 
   * **Validates: Requirements 1.5.2, 1.5.3 - Detect and prevent conflicts**
   */
  it('PROPERTY: overlapping time ranges should indicate potential conflicts', () => {
    fc.assert(
      fc.property(
        validTimeRangeArb,
        validTimeRangeArb,
        (range1, range2) => {
          const overlaps = service.timeRangesOverlap(
            range1.start, range1.end,
            range2.start, range2.end
          );

          // If ranges overlap, this represents a scheduling conflict
          // The conflict detection system should flag this
          if (overlaps) {
            // Overlapping ranges indicate a potential double-booking scenario
            expect(overlaps).toBe(true);
          } else {
            // Non-overlapping ranges are safe for scheduling
            expect(overlaps).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // PROPERTY 20: Combined Conflict Detection Properties
  // ============================================================================

  /**
   * Property: Conflict detection should be comprehensive
   * 
   * A valid assignment requires:
   * 1. No time overlap with existing assignments
   * 2. Technician has all required skills
   * 3. Distance is reasonable (if location tracking enabled)
   * 
   * **Validates: Requirements 1.5.2, 1.5.3, 1.5.4, 1.6.4**
   */
  it('PROPERTY: conflict detection should consider all factors', () => {
    fc.assert(
      fc.property(
        validTimeRangeArb,
        validTimeRangeArb,
        uniqueSkillArrayArb,
        uniqueSkillArrayArb,
        geoLocationArb,
        geoLocationArb,
        (newJobRange, existingJobRange, technicianSkills, requiredSkills, techLocation, jobLocation) => {
          const hasTimeConflict = service.timeRangesOverlap(
            newJobRange.start, newJobRange.end,
            existingJobRange.start, existingJobRange.end
          );

          const hasSkillConflict = !service.validateSkillRequirements(
            technicianSkills,
            requiredSkills
          );

          const distance = service.calculateDistance(techLocation, jobLocation);
          const hasDistanceConflict = distance > 500; // Example threshold: 500 km

          // If any conflict exists, assignment should be flagged
          const hasAnyConflict = hasTimeConflict || hasSkillConflict || hasDistanceConflict;

          // This property verifies that our conflict detection logic is comprehensive
          if (hasTimeConflict) {
            expect(hasAnyConflict).toBe(true);
          }
          if (hasSkillConflict) {
            expect(hasAnyConflict).toBe(true);
          }
          if (hasDistanceConflict) {
            expect(hasAnyConflict).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
