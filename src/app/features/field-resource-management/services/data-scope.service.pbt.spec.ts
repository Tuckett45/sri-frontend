import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { DataScopeService, DataScope, ScopeType } from './data-scope.service';
import { User } from '../../../models/user.model';

/**
 * Property-Based Tests for DataScopeService
 * 
 * These tests verify universal properties that should hold for all inputs:
 * - Idempotence: filtering twice produces same result
 * - Order preservation: filtered items maintain original order
 * - Immutability: original data is never mutated
 * - Subset property: filtered result is always a subset of input
 * - Determinism: same inputs always produce same outputs
 */
describe('DataScopeService - Property-Based Tests', () => {
  let service: DataScopeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DataScopeService]
    });
    service = TestBed.inject(DataScopeService);
  });

  // Arbitraries (generators) for property-based testing

  const marketArb = fc.constantFrom('DALLAS', 'HOUSTON', 'AUSTIN', 'RG', 'PHOENIX');
  const companyArb = fc.constantFrom('ACME_CORP', 'BETA_INC', 'GAMMA_LLC', 'DELTA_CO', 'INTERNAL');
  const roleArb = fc.constantFrom('Admin', 'CM', 'PM', 'Vendor', 'Technician');
  const scopeTypeArb = fc.constantFrom<ScopeType>('all', 'market', 'company', 'self');

  const userArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    email: fc.emailAddress(),
    password: fc.string({ minLength: 8 }),
    role: roleArb,
    market: marketArb,
    company: companyArb,
    createdDate: fc.date(),
    isApproved: fc.boolean()
  }).map(obj => new User(
    obj.id,
    obj.name,
    obj.email,
    obj.password,
    obj.role,
    obj.market,
    obj.company,
    obj.createdDate,
    obj.isApproved
  ));

  const scopedEntityArb = fc.record({
    market: fc.option(marketArb, { nil: undefined }),
    company: fc.option(companyArb, { nil: undefined }),
    assignedTo: fc.option(fc.uuid(), { nil: undefined }),
    ownerId: fc.option(fc.uuid(), { nil: undefined })
  });

  const dataScopeArb = fc.record({
    scopeType: scopeTypeArb,
    scopeValues: fc.option(fc.array(fc.string()), { nil: undefined })
  });

  /**
   * Property 1: Idempotence
   * Filtering the same data twice with the same user and scopes should produce identical results
   * 
   * **Validates: Requirements 3.1.1, 3.1.2, 3.2.1**
   */
  it('should be idempotent - filtering twice produces same result', () => {
    fc.assert(
      fc.property(
        fc.array(scopedEntityArb, { minLength: 0, maxLength: 20 }),
        userArb,
        fc.array(dataScopeArb, { minLength: 1, maxLength: 3 }),
        (data, user, dataScopes) => {
          const result1 = service.filterDataByScope(data, user, dataScopes);
          const result2 = service.filterDataByScope(data, user, dataScopes);

          // Results should be identical
          expect(result1.length).toBe(result2.length);
          
          for (let i = 0; i < result1.length; i++) {
            expect(result1[i]).toBe(result2[i]);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 2: Order Preservation
   * Filtered items should maintain the same relative order as in the original array
   * 
   * **Validates: Requirements 3.1.1, 3.1.2, 3.2.1**
   */
  it('should preserve order of filtered items', () => {
    fc.assert(
      fc.property(
        fc.array(scopedEntityArb, { minLength: 0, maxLength: 20 }),
        userArb,
        fc.array(dataScopeArb, { minLength: 1, maxLength: 3 }),
        (data, user, dataScopes) => {
          const result = service.filterDataByScope(data, user, dataScopes);

          // Check that filtered items appear in same order as original
          let lastIndex = -1;
          for (const item of result) {
            const currentIndex = data.indexOf(item);
            expect(currentIndex).toBeGreaterThan(lastIndex);
            lastIndex = currentIndex;
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 3: Immutability
   * Original data array should never be mutated by filtering
   * 
   * **Validates: Requirements 3.1.1, 3.1.2, 3.2.1**
   */
  it('should not mutate original data array', () => {
    fc.assert(
      fc.property(
        fc.array(scopedEntityArb, { minLength: 1, maxLength: 20 }),
        userArb,
        fc.array(dataScopeArb, { minLength: 1, maxLength: 3 }),
        (data, user, dataScopes) => {
          const originalLength = data.length;
          const originalFirstItem = data[0];
          const originalLastItem = data[data.length - 1];

          service.filterDataByScope(data, user, dataScopes);

          // Original array should be unchanged
          expect(data.length).toBe(originalLength);
          expect(data[0]).toBe(originalFirstItem);
          expect(data[data.length - 1]).toBe(originalLastItem);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 4: Subset Property
   * Filtered result should always be a subset of the input data
   * 
   * **Validates: Requirements 3.1.1, 3.1.2, 3.2.1**
   */
  it('should return a subset of input data', () => {
    fc.assert(
      fc.property(
        fc.array(scopedEntityArb, { minLength: 0, maxLength: 20 }),
        userArb,
        fc.array(dataScopeArb, { minLength: 1, maxLength: 3 }),
        (data, user, dataScopes) => {
          const result = service.filterDataByScope(data, user, dataScopes);

          // Result length should not exceed input length
          expect(result.length).toBeLessThanOrEqual(data.length);

          // Every item in result should exist in original data
          for (const item of result) {
            expect(data).toContain(item);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 5: Admin Scope Returns All
   * When scope is 'all', all data should be returned
   * 
   * **Validates: Requirement 2.1.1**
   */
  it('should return all data when scope is "all"', () => {
    fc.assert(
      fc.property(
        fc.array(scopedEntityArb, { minLength: 0, maxLength: 20 }),
        userArb,
        (data, user) => {
          const dataScopes: DataScope[] = [{ scopeType: 'all' }];
          const result = service.filterDataByScope(data, user, dataScopes);

          expect(result.length).toBe(data.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 6: Market Scope Filtering
   * When scope is 'market', only items matching user's market should be returned
   * (unless user is in RG market, which sees all)
   * 
   * **Validates: Requirements 2.2.3, 2.2.4, 3.1.1**
   */
  it('should filter by market when scope is "market"', () => {
    fc.assert(
      fc.property(
        fc.array(scopedEntityArb, { minLength: 0, maxLength: 20 }),
        userArb,
        (data, user) => {
          const dataScopes: DataScope[] = [{ scopeType: 'market' }];
          const result = service.filterDataByScope(data, user, dataScopes);

          if (user.market === 'RG') {
            // RG market sees all
            expect(result.length).toBe(data.length);
          } else {
            // Non-RG market sees only their market
            for (const item of result) {
              expect(item.market).toBe(user.market as any);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 7: Company Scope Filtering
   * When scope is 'company', only items matching both user's company AND market should be returned
   * 
   * **Validates: Requirements 2.3.1, 3.1.2, 3.2.1**
   */
  it('should filter by company AND market when scope is "company"', () => {
    fc.assert(
      fc.property(
        fc.array(scopedEntityArb, { minLength: 0, maxLength: 20 }),
        userArb,
        (data, user) => {
          const dataScopes: DataScope[] = [{ scopeType: 'company' }];
          const result = service.filterDataByScope(data, user, dataScopes);

          // All items must match both company AND market
          for (const item of result) {
            expect(item.company).toBe(user.company as any);
            expect(item.market).toBe(user.market as any);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8: Self Scope Filtering
   * When scope is 'self', only items assigned to or owned by user should be returned
   * 
   * **Validates: Requirements 2.4.1, 2.4.2, 3.3.1**
   */
  it('should filter by assignedTo or ownerId when scope is "self"', () => {
    fc.assert(
      fc.property(
        fc.array(scopedEntityArb, { minLength: 0, maxLength: 20 }),
        userArb,
        (data, user) => {
          const dataScopes: DataScope[] = [{ scopeType: 'self' }];
          const result = service.filterDataByScope(data, user, dataScopes);

          // Result should be a subset of input
          expect(result.length).toBeLessThanOrEqual(data.length);

          // All items must be assigned to or owned by user
          for (const item of result) {
            const isAssignedToUser = item.assignedTo === user.id;
            const isOwnedByUser = item.ownerId === user.id;
            expect(isAssignedToUser || isOwnedByUser).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 9: Empty Input Returns Empty Output
   * Filtering an empty array should always return an empty array
   * 
   * **Validates: Requirements 3.1.1, 3.1.2, 3.2.1**
   */
  it('should return empty array when input is empty', () => {
    fc.assert(
      fc.property(
        userArb,
        fc.array(dataScopeArb, { minLength: 1, maxLength: 3 }),
        (user, dataScopes) => {
          const result = service.filterDataByScope([], user, dataScopes);
          expect(result.length).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 10: No Duplicates in Result
   * Filtered result should never contain duplicate items
   * 
   * **Validates: Requirements 3.1.1, 3.1.2, 3.2.1**
   */
  it('should not produce duplicate items in result', () => {
    fc.assert(
      fc.property(
        fc.array(scopedEntityArb, { minLength: 0, maxLength: 20 }),
        userArb,
        fc.array(dataScopeArb, { minLength: 1, maxLength: 3 }),
        (data, user, dataScopes) => {
          const result = service.filterDataByScope(data, user, dataScopes);

          // Check for duplicates using Set
          const uniqueItems = new Set(result);
          expect(uniqueItems.size).toBe(result.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 11: Determinism
   * Same inputs should always produce same outputs (deterministic behavior)
   * 
   * **Validates: Requirements 3.1.1, 3.1.2, 3.2.1**
   */
  it('should be deterministic - same inputs produce same outputs', () => {
    fc.assert(
      fc.property(
        fc.array(scopedEntityArb, { minLength: 0, maxLength: 20 }),
        userArb,
        fc.array(dataScopeArb, { minLength: 1, maxLength: 3 }),
        (data, user, dataScopes) => {
          const result1 = service.filterDataByScope(data, user, dataScopes);
          const result2 = service.filterDataByScope(data, user, dataScopes);
          const result3 = service.filterDataByScope(data, user, dataScopes);

          // All results should be identical
          expect(result1).toEqual(result2);
          expect(result2).toEqual(result3);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 12: RG Market Special Case
   * CM users in RG market should see all data regardless of market
   * 
   * **Validates: Requirement 2.2.4**
   */
  it('should return all data for RG market CM users', () => {
    fc.assert(
      fc.property(
        fc.array(scopedEntityArb, { minLength: 0, maxLength: 20 }),
        (data) => {
          const rgCmUser = new User(
            'cm-rg-123',
            'RG CM User',
            'rgcm@example.com',
            'password',
            'CM',
            'RG',
            'INTERNAL',
            new Date(),
            true
          );
          const dataScopes: DataScope[] = [{ scopeType: 'market' }];
          const result = service.filterDataByScope(data, rgCmUser, dataScopes);

          expect(result.length).toBe(data.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 13: canAccessEntity Consistency
   * canAccessEntity should be consistent with filterDataByScope
   * 
   * **Validates: Requirements 3.1.1, 3.1.2, 3.2.1**
   */
  it('should have consistent canAccessEntity with filterDataByScope', () => {
    fc.assert(
      fc.property(
        scopedEntityArb,
        userArb,
        fc.array(dataScopeArb, { minLength: 1, maxLength: 3 }),
        (entity, user, dataScopes) => {
          const canAccess = service.canAccessEntity(entity, user, dataScopes);
          const filtered = service.filterDataByScope([entity], user, dataScopes);

          // canAccessEntity should return true iff entity appears in filtered result
          expect(canAccess).toBe(filtered.length > 0);
        }
      ),
      { numRuns: 50 }
    );
  });
});
