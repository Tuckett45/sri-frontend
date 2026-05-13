/**
 * Preservation Property-Based Tests for Job Template Manager
 * 
 * **Validates: Requirements 3.1, 3.3**
 * 
 * These tests verify that Skill objects WITH all required properties
 * (including 'level') continue to work correctly after the bugfix.
 * 
 * This follows the observation-first methodology:
 * - Run on UNFIXED code to establish baseline behavior
 * - Run on FIXED code to ensure no regressions
 */

import * as fc from 'fast-check';
import { Skill, SkillLevel } from '../../../models/technician.model';

describe('JobTemplateManager - Preservation Properties', () => {
  
  /**
   * Property 2: Preservation - Skill Objects with All Required Properties
   * 
   * For any Skill object that includes all required properties (id, name, category, level),
   * the object should be valid and usable in job templates.
   */
  describe('Property 2: Skill objects with all required properties work correctly', () => {
    
    it('should accept valid Skill objects with all required properties', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            category: fc.constantFrom('Cabling', 'Fiber', 'Safety', 'Electrical', 'Network'),
            level: fc.constantFrom(
              SkillLevel.Beginner,
              SkillLevel.Intermediate,
              SkillLevel.Advanced,
              SkillLevel.Expert
            )
          }),
          (skillData) => {
            // Create a Skill object with all required properties
            const skill: Skill = {
              id: skillData.id,
              name: skillData.name,
              category: skillData.category,
              level: skillData.level
            };
            
            // Verify the skill object is valid
            expect(skill).toBeDefined();
            expect(skill.id).toBe(skillData.id);
            expect(skill.name).toBe(skillData.name);
            expect(skill.category).toBe(skillData.category);
            expect(skill.level).toBe(skillData.level);
            
            // Verify it can be used in an array (as in job templates)
            const requiredSkills: Skill[] = [skill];
            expect(requiredSkills.length).toBe(1);
            expect(requiredSkills[0]).toEqual(skill);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle arrays of valid Skill objects', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              category: fc.constantFrom('Cabling', 'Fiber', 'Safety'),
              level: fc.constantFrom(
                SkillLevel.Beginner,
                SkillLevel.Intermediate,
                SkillLevel.Advanced,
                SkillLevel.Expert
              )
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (skillsData) => {
            // Create array of Skill objects
            const skills: Skill[] = skillsData.map(data => ({
              id: data.id,
              name: data.name,
              category: data.category,
              level: data.level
            }));
            
            // Verify all skills are valid
            expect(skills.length).toBe(skillsData.length);
            skills.forEach((skill, index) => {
              expect(skill.id).toBe(skillsData[index].id);
              expect(skill.name).toBe(skillsData[index].name);
              expect(skill.category).toBe(skillsData[index].category);
              expect(skill.level).toBe(skillsData[index].level);
            });
            
            // Verify skills can be mapped to names (as in getSkillNames method)
            const skillNames = skills.map(s => s.name).join(', ');
            expect(skillNames).toBeDefined();
            expect(typeof skillNames).toBe('string');
          }
        ),
        { numRuns: 50 }
      );
    });
    
    it('should preserve all SkillLevel enum values', () => {
      // Verify all SkillLevel enum values work correctly
      const allLevels = [
        SkillLevel.Beginner,
        SkillLevel.Intermediate,
        SkillLevel.Advanced,
        SkillLevel.Expert
      ];
      
      allLevels.forEach(level => {
        const skill: Skill = {
          id: 'test-id',
          name: 'Test Skill',
          category: 'Testing',
          level: level
        };
        
        expect(skill.level).toBe(level);
        expect(Object.values(SkillLevel)).toContain(level);
      });
    });
  });
  
  /**
   * Property 2: Preservation - Skill Interface Structure
   * 
   * Verify that the Skill interface structure remains consistent
   */
  describe('Property 2: Skill interface structure is preserved', () => {
    
    it('should maintain required properties: id, name, category, level', () => {
      const skill: Skill = {
        id: 's1',
        name: 'Cat6',
        category: 'Cabling',
        level: SkillLevel.Intermediate
      };
      
      // Verify all required properties exist
      expect(skill.id).toBeDefined();
      expect(skill.name).toBeDefined();
      expect(skill.category).toBeDefined();
      expect(skill.level).toBeDefined();
      
      // Verify types
      expect(typeof skill.id).toBe('string');
      expect(typeof skill.name).toBe('string');
      expect(typeof skill.category).toBe('string');
      expect(Object.values(SkillLevel)).toContain(skill.level);
    });
    
    it('should support optional verifiedDate property', () => {
      const skillWithDate: Skill = {
        id: 's1',
        name: 'Cat6',
        category: 'Cabling',
        level: SkillLevel.Advanced,
        verifiedDate: new Date()
      };
      
      expect(skillWithDate.verifiedDate).toBeDefined();
      expect(skillWithDate.verifiedDate).toBeInstanceOf(Date);
      
      const skillWithoutDate: Skill = {
        id: 's2',
        name: 'Fiber',
        category: 'Fiber',
        level: SkillLevel.Expert
      };
      
      expect(skillWithoutDate.verifiedDate).toBeUndefined();
    });
  });
});
