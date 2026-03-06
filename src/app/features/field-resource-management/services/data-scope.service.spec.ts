import { TestBed } from '@angular/core/testing';
import { DataScopeService, ScopedEntity, DataScope } from './data-scope.service';
import { User } from '../../../models/user.model';

describe('DataScopeService', () => {
  let service: DataScopeService;

  // Test data
  const createUser = (role: string, market: string, company: string, id: string = 'user-123'): User => {
    return new User(
      id,
      'Test User',
      'test@example.com',
      'password',
      role,
      market,
      company,
      new Date(),
      true
    );
  };

  const createEntity = (market: string, company: string, assignedTo?: string, ownerId?: string): ScopedEntity => {
    return {
      market,
      company,
      assignedTo,
      ownerId
    };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DataScopeService]
    });
    service = TestBed.inject(DataScopeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('filterDataByScope', () => {
    describe('Admin role (scope: all)', () => {
      it('should return all data for Admin users', () => {
        const adminUser = createUser('Admin', 'DALLAS', 'INTERNAL');
        const dataScopes: DataScope[] = [{ scopeType: 'all' }];
        const data: ScopedEntity[] = [
          createEntity('DALLAS', 'ACME_CORP'),
          createEntity('HOUSTON', 'BETA_INC'),
          createEntity('RG', 'GAMMA_LLC')
        ];

        const result = service.filterDataByScope(data, adminUser, dataScopes);

        expect(result.length).toBe(3);
        expect(result).toEqual(data);
      });

      it('should return empty array for Admin when data is empty', () => {
        const adminUser = createUser('Admin', 'DALLAS', 'INTERNAL');
        const dataScopes: DataScope[] = [{ scopeType: 'all' }];
        const data: ScopedEntity[] = [];

        const result = service.filterDataByScope(data, adminUser, dataScopes);

        expect(result.length).toBe(0);
      });

      it('should not mutate original data array', () => {
        const adminUser = createUser('Admin', 'DALLAS', 'INTERNAL');
        const dataScopes: DataScope[] = [{ scopeType: 'all' }];
        const data: ScopedEntity[] = [
          createEntity('DALLAS', 'ACME_CORP'),
          createEntity('HOUSTON', 'BETA_INC')
        ];
        const originalLength = data.length;

        const result = service.filterDataByScope(data, adminUser, dataScopes);
        result.push(createEntity('NEW', 'NEW_COMPANY'));

        expect(data.length).toBe(originalLength);
      });
    });

    describe('CM role (scope: market)', () => {
      it('should return only data from CM market', () => {
        const cmUser = createUser('CM', 'DALLAS', 'INTERNAL');
        const dataScopes: DataScope[] = [{ scopeType: 'market' }];
        const data: ScopedEntity[] = [
          createEntity('DALLAS', 'ACME_CORP'),
          createEntity('DALLAS', 'BETA_INC'),
          createEntity('HOUSTON', 'GAMMA_LLC'),
          createEntity('RG', 'DELTA_CO')
        ];

        const result = service.filterDataByScope(data, cmUser, dataScopes);

        expect(result.length).toBe(2);
        expect(result[0].market).toBe('DALLAS');
        expect(result[1].market).toBe('DALLAS');
      });

      it('should return all data for RG market CM', () => {
        const rgCmUser = createUser('CM', 'RG', 'INTERNAL');
        const dataScopes: DataScope[] = [{ scopeType: 'market' }];
        const data: ScopedEntity[] = [
          createEntity('DALLAS', 'ACME_CORP'),
          createEntity('HOUSTON', 'BETA_INC'),
          createEntity('RG', 'GAMMA_LLC')
        ];

        const result = service.filterDataByScope(data, rgCmUser, dataScopes);

        expect(result.length).toBe(3);
      });

      it('should return empty array when no data matches CM market', () => {
        const cmUser = createUser('CM', 'DALLAS', 'INTERNAL');
        const dataScopes: DataScope[] = [{ scopeType: 'market' }];
        const data: ScopedEntity[] = [
          createEntity('HOUSTON', 'ACME_CORP'),
          createEntity('AUSTIN', 'BETA_INC')
        ];

        const result = service.filterDataByScope(data, cmUser, dataScopes);

        expect(result.length).toBe(0);
      });

      it('should preserve order of filtered items', () => {
        const cmUser = createUser('CM', 'DALLAS', 'INTERNAL');
        const dataScopes: DataScope[] = [{ scopeType: 'market' }];
        const entity1 = createEntity('DALLAS', 'ACME_CORP');
        const entity2 = createEntity('HOUSTON', 'BETA_INC');
        const entity3 = createEntity('DALLAS', 'GAMMA_LLC');
        const data: ScopedEntity[] = [entity1, entity2, entity3];

        const result = service.filterDataByScope(data, cmUser, dataScopes);

        expect(result.length).toBe(2);
        expect(result[0]).toBe(entity1);
        expect(result[1]).toBe(entity3);
      });
    });

    describe('PM/Vendor role (scope: company)', () => {
      it('should return only data from PM company AND market', () => {
        const pmUser = createUser('PM', 'DALLAS', 'ACME_CORP');
        const dataScopes: DataScope[] = [{ scopeType: 'company' }];
        const data: ScopedEntity[] = [
          createEntity('DALLAS', 'ACME_CORP'),
          createEntity('DALLAS', 'BETA_INC'),
          createEntity('HOUSTON', 'ACME_CORP'),
          createEntity('HOUSTON', 'BETA_INC')
        ];

        const result = service.filterDataByScope(data, pmUser, dataScopes);

        expect(result.length).toBe(1);
        expect(result[0].market).toBe('DALLAS');
        expect(result[0].company).toBe('ACME_CORP');
      });

      it('should filter out data from same company but different market', () => {
        const pmUser = createUser('PM', 'DALLAS', 'ACME_CORP');
        const dataScopes: DataScope[] = [{ scopeType: 'company' }];
        const data: ScopedEntity[] = [
          createEntity('HOUSTON', 'ACME_CORP'),
          createEntity('AUSTIN', 'ACME_CORP')
        ];

        const result = service.filterDataByScope(data, pmUser, dataScopes);

        expect(result.length).toBe(0);
      });

      it('should filter out data from same market but different company', () => {
        const pmUser = createUser('PM', 'DALLAS', 'ACME_CORP');
        const dataScopes: DataScope[] = [{ scopeType: 'company' }];
        const data: ScopedEntity[] = [
          createEntity('DALLAS', 'BETA_INC'),
          createEntity('DALLAS', 'GAMMA_LLC')
        ];

        const result = service.filterDataByScope(data, pmUser, dataScopes);

        expect(result.length).toBe(0);
      });

      it('should work for Vendor role', () => {
        const vendorUser = createUser('Vendor', 'DALLAS', 'ACME_CORP');
        const dataScopes: DataScope[] = [{ scopeType: 'company' }];
        const data: ScopedEntity[] = [
          createEntity('DALLAS', 'ACME_CORP'),
          createEntity('DALLAS', 'BETA_INC')
        ];

        const result = service.filterDataByScope(data, vendorUser, dataScopes);

        expect(result.length).toBe(1);
        expect(result[0].company).toBe('ACME_CORP');
      });
    });

    describe('Technician role (scope: self)', () => {
      it('should return only data assigned to technician', () => {
        const techUser = createUser('Technician', 'DALLAS', 'ACME_CORP', 'tech-123');
        const dataScopes: DataScope[] = [{ scopeType: 'self' }];
        const data: ScopedEntity[] = [
          createEntity('DALLAS', 'ACME_CORP', 'tech-123'),
          createEntity('DALLAS', 'ACME_CORP', 'tech-456'),
          createEntity('DALLAS', 'ACME_CORP', 'tech-789')
        ];

        const result = service.filterDataByScope(data, techUser, dataScopes);

        expect(result.length).toBe(1);
        expect(result[0].assignedTo).toBe('tech-123');
      });

      it('should return data where technician is owner', () => {
        const techUser = createUser('Technician', 'DALLAS', 'ACME_CORP', 'tech-123');
        const dataScopes: DataScope[] = [{ scopeType: 'self' }];
        const data: ScopedEntity[] = [
          createEntity('DALLAS', 'ACME_CORP', undefined, 'tech-123'),
          createEntity('DALLAS', 'ACME_CORP', undefined, 'tech-456')
        ];

        const result = service.filterDataByScope(data, techUser, dataScopes);

        expect(result.length).toBe(1);
        expect(result[0].ownerId).toBe('tech-123');
      });

      it('should return data where technician is either assignedTo or ownerId', () => {
        const techUser = createUser('Technician', 'DALLAS', 'ACME_CORP', 'tech-123');
        const dataScopes: DataScope[] = [{ scopeType: 'self' }];
        const data: ScopedEntity[] = [
          createEntity('DALLAS', 'ACME_CORP', 'tech-123', undefined),
          createEntity('DALLAS', 'ACME_CORP', undefined, 'tech-123'),
          createEntity('DALLAS', 'ACME_CORP', 'tech-456', 'tech-789')
        ];

        const result = service.filterDataByScope(data, techUser, dataScopes);

        expect(result.length).toBe(2);
      });

      it('should return empty array when nothing is assigned to technician', () => {
        const techUser = createUser('Technician', 'DALLAS', 'ACME_CORP', 'tech-123');
        const dataScopes: DataScope[] = [{ scopeType: 'self' }];
        const data: ScopedEntity[] = [
          createEntity('DALLAS', 'ACME_CORP', 'tech-456'),
          createEntity('DALLAS', 'ACME_CORP', 'tech-789')
        ];

        const result = service.filterDataByScope(data, techUser, dataScopes);

        expect(result.length).toBe(0);
      });
    });

    describe('Edge cases', () => {
      it('should return empty array when data is null', () => {
        const user = createUser('Admin', 'DALLAS', 'INTERNAL');
        const dataScopes: DataScope[] = [{ scopeType: 'all' }];

        const result = service.filterDataByScope(null as any, user, dataScopes);

        expect(result).toEqual([]);
      });

      it('should return empty array when data is not an array', () => {
        const user = createUser('Admin', 'DALLAS', 'INTERNAL');
        const dataScopes: DataScope[] = [{ scopeType: 'all' }];

        const result = service.filterDataByScope({} as any, user, dataScopes);

        expect(result).toEqual([]);
      });

      it('should return empty array when user is null', () => {
        const dataScopes: DataScope[] = [{ scopeType: 'all' }];
        const data: ScopedEntity[] = [createEntity('DALLAS', 'ACME_CORP')];

        const result = service.filterDataByScope(data, null as any, dataScopes);

        expect(result).toEqual([]);
      });

      it('should return empty array when user.role is null', () => {
        const user = createUser('Admin', 'DALLAS', 'INTERNAL');
        user.role = null as any;
        const dataScopes: DataScope[] = [{ scopeType: 'all' }];
        const data: ScopedEntity[] = [createEntity('DALLAS', 'ACME_CORP')];

        const result = service.filterDataByScope(data, user, dataScopes);

        expect(result).toEqual([]);
      });

      it('should return empty array when dataScopes is empty', () => {
        const user = createUser('Admin', 'DALLAS', 'INTERNAL');
        const dataScopes: DataScope[] = [];
        const data: ScopedEntity[] = [createEntity('DALLAS', 'ACME_CORP')];

        const result = service.filterDataByScope(data, user, dataScopes);

        expect(result).toEqual([]);
      });

      it('should return empty array when dataScopes is null', () => {
        const user = createUser('Admin', 'DALLAS', 'INTERNAL');
        const data: ScopedEntity[] = [createEntity('DALLAS', 'ACME_CORP')];

        const result = service.filterDataByScope(data, user, null as any);

        expect(result).toEqual([]);
      });

      it('should handle entities with undefined market', () => {
        const cmUser = createUser('CM', 'DALLAS', 'INTERNAL');
        const dataScopes: DataScope[] = [{ scopeType: 'market' }];
        const data: ScopedEntity[] = [
          createEntity('DALLAS', 'ACME_CORP'),
          { market: undefined, company: 'BETA_INC' }
        ];

        const result = service.filterDataByScope(data, cmUser, dataScopes);

        expect(result.length).toBe(1);
        expect(result[0].market).toBe('DALLAS');
      });

      it('should handle entities with undefined company', () => {
        const pmUser = createUser('PM', 'DALLAS', 'ACME_CORP');
        const dataScopes: DataScope[] = [{ scopeType: 'company' }];
        const data: ScopedEntity[] = [
          createEntity('DALLAS', 'ACME_CORP'),
          { market: 'DALLAS', company: undefined }
        ];

        const result = service.filterDataByScope(data, pmUser, dataScopes);

        expect(result.length).toBe(1);
        expect(result[0].company).toBe('ACME_CORP');
      });
    });
  });

  describe('getDataScopesForRole', () => {
    it('should return "all" scope for Admin role', () => {
      const scopes = service.getDataScopesForRole('Admin');
      expect(scopes.length).toBe(1);
      expect(scopes[0].scopeType).toBe('all');
    });

    it('should return "all" scope for ADMIN role (uppercase)', () => {
      const scopes = service.getDataScopesForRole('ADMIN');
      expect(scopes.length).toBe(1);
      expect(scopes[0].scopeType).toBe('all');
    });

    it('should return "market" scope for CM role', () => {
      const scopes = service.getDataScopesForRole('CM');
      expect(scopes.length).toBe(1);
      expect(scopes[0].scopeType).toBe('market');
    });

    it('should return "market" scope for ConstructionManager role', () => {
      const scopes = service.getDataScopesForRole('ConstructionManager');
      expect(scopes.length).toBe(1);
      expect(scopes[0].scopeType).toBe('market');
    });

    it('should return "company" scope for PM role', () => {
      const scopes = service.getDataScopesForRole('PM');
      expect(scopes.length).toBe(1);
      expect(scopes[0].scopeType).toBe('company');
    });

    it('should return "company" scope for ProjectManager role', () => {
      const scopes = service.getDataScopesForRole('ProjectManager');
      expect(scopes.length).toBe(1);
      expect(scopes[0].scopeType).toBe('company');
    });

    it('should return "company" scope for Vendor role', () => {
      const scopes = service.getDataScopesForRole('Vendor');
      expect(scopes.length).toBe(1);
      expect(scopes[0].scopeType).toBe('company');
    });

    it('should return "self" scope for Technician role', () => {
      const scopes = service.getDataScopesForRole('Technician');
      expect(scopes.length).toBe(1);
      expect(scopes[0].scopeType).toBe('self');
    });

    it('should return "self" scope for unknown role (default)', () => {
      const scopes = service.getDataScopesForRole('UnknownRole');
      expect(scopes.length).toBe(1);
      expect(scopes[0].scopeType).toBe('self');
    });
  });

  describe('canAccessEntity', () => {
    it('should return true when user can access entity', () => {
      const adminUser = createUser('Admin', 'DALLAS', 'INTERNAL');
      const dataScopes: DataScope[] = [{ scopeType: 'all' }];
      const entity = createEntity('HOUSTON', 'ACME_CORP');

      const result = service.canAccessEntity(entity, adminUser, dataScopes);

      expect(result).toBe(true);
    });

    it('should return false when user cannot access entity', () => {
      const pmUser = createUser('PM', 'DALLAS', 'ACME_CORP');
      const dataScopes: DataScope[] = [{ scopeType: 'company' }];
      const entity = createEntity('HOUSTON', 'BETA_INC');

      const result = service.canAccessEntity(entity, pmUser, dataScopes);

      expect(result).toBe(false);
    });

    it('should return false when entity is null', () => {
      const user = createUser('Admin', 'DALLAS', 'INTERNAL');
      const dataScopes: DataScope[] = [{ scopeType: 'all' }];

      const result = service.canAccessEntity(null as any, user, dataScopes);

      expect(result).toBe(false);
    });

    it('should return false when user is null', () => {
      const dataScopes: DataScope[] = [{ scopeType: 'all' }];
      const entity = createEntity('DALLAS', 'ACME_CORP');

      const result = service.canAccessEntity(entity, null as any, dataScopes);

      expect(result).toBe(false);
    });

    it('should return false when dataScopes is null', () => {
      const user = createUser('Admin', 'DALLAS', 'INTERNAL');
      const entity = createEntity('DALLAS', 'ACME_CORP');

      const result = service.canAccessEntity(entity, user, null as any);

      expect(result).toBe(false);
    });
  });
});
