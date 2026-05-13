/**
 * Contract Expiration Effects Unit Tests
 *
 * Tests the effect for checking contracts approaching expiration
 * and sending notifications for each expiring contract.
 *
 * Requirement: 7.4
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of } from 'rxjs';

import { ContractExpirationEffects } from './contract-expiration.effects';
import { checkContractExpirations } from './contract-expiration.actions';
import { ContractDateService } from '../../services/contract-date.service';
import { FrmNotificationAdapterService } from '../../services/frm-notification-adapter.service';
import { AuthService } from '../../../../services/auth.service';
import { TIMECARD_ENDPOINTS } from '../../api/api-endpoints';
import { Contract } from '../../../../models/time-payroll.model';

describe('ContractExpirationEffects', () => {
  let actions$: Observable<any>;
  let effects: ContractExpirationEffects;
  let httpTestingController: HttpTestingController;
  let contractDateService: jasmine.SpyObj<ContractDateService>;
  let notificationService: jasmine.SpyObj<FrmNotificationAdapterService>;
  let authService: jasmine.SpyObj<AuthService>;

  function createMockContract(overrides: Partial<Contract> = {}): Contract {
    return {
      id: 'contract-1',
      name: 'Test Contract',
      clientName: 'Test Client',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      status: 'Active',
      region: 'East',
      createdBy: 'admin-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides
    };
  }

  beforeEach(() => {
    const contractDateSpy = jasmine.createSpyObj('ContractDateService', [
      'isContractApproachingExpiration'
    ]);
    const notificationSpy = jasmine.createSpyObj('FrmNotificationAdapterService', [
      'sendContractExpiringNotification'
    ]);
    const authSpy = jasmine.createSpyObj('AuthService', ['getUser']);

    notificationSpy.sendContractExpiringNotification.and.returnValue(of({} as any));
    authSpy.getUser.and.returnValue({ id: 'manager-1', market: 'East' });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ContractExpirationEffects,
        provideMockActions(() => actions$),
        { provide: ContractDateService, useValue: contractDateSpy },
        { provide: FrmNotificationAdapterService, useValue: notificationSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    });

    effects = TestBed.inject(ContractExpirationEffects);
    httpTestingController = TestBed.inject(HttpTestingController);
    contractDateService = TestBed.inject(ContractDateService) as jasmine.SpyObj<ContractDateService>;
    notificationService = TestBed.inject(FrmNotificationAdapterService) as jasmine.SpyObj<FrmNotificationAdapterService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  describe('checkContractExpirations$', () => {
    it('should send notifications for contracts approaching expiration', (done) => {
      const contracts: Contract[] = [
        createMockContract({ id: 'c1', name: 'Contract A', endDate: new Date('2024-07-15') }),
        createMockContract({ id: 'c2', name: 'Contract B', endDate: new Date('2024-12-31') })
      ];

      contractDateService.isContractApproachingExpiration.and.callFake((contract: Contract) => {
        return contract.id === 'c1'; // Only first contract is approaching expiration
      });

      actions$ = of(checkContractExpirations());

      effects.checkContractExpirations$.subscribe(() => {
        expect(notificationService.sendContractExpiringNotification).toHaveBeenCalledTimes(1);
        expect(notificationService.sendContractExpiringNotification).toHaveBeenCalledWith(
          'manager-1',
          'c1',
          'Contract A',
          jasmine.any(Date)
        );
        done();
      });

      const req = httpTestingController.expectOne(TIMECARD_ENDPOINTS.getExpiringContracts());
      expect(req.request.method).toBe('GET');
      req.flush(contracts);
    });

    it('should send notifications for ALL expiring contracts', (done) => {
      const contracts: Contract[] = [
        createMockContract({ id: 'c1', name: 'Contract A' }),
        createMockContract({ id: 'c2', name: 'Contract B' }),
        createMockContract({ id: 'c3', name: 'Contract C' })
      ];

      contractDateService.isContractApproachingExpiration.and.returnValue(true);

      actions$ = of(checkContractExpirations());

      effects.checkContractExpirations$.subscribe(() => {
        expect(notificationService.sendContractExpiringNotification).toHaveBeenCalledTimes(3);
        expect(notificationService.sendContractExpiringNotification).toHaveBeenCalledWith(
          'manager-1', 'c1', 'Contract A', jasmine.any(Date)
        );
        expect(notificationService.sendContractExpiringNotification).toHaveBeenCalledWith(
          'manager-1', 'c2', 'Contract B', jasmine.any(Date)
        );
        expect(notificationService.sendContractExpiringNotification).toHaveBeenCalledWith(
          'manager-1', 'c3', 'Contract C', jasmine.any(Date)
        );
        done();
      });

      const req = httpTestingController.expectOne(TIMECARD_ENDPOINTS.getExpiringContracts());
      req.flush(contracts);
    });

    it('should NOT send notifications for contracts not approaching expiration', (done) => {
      const contracts: Contract[] = [
        createMockContract({ id: 'c1', name: 'Contract A' })
      ];

      contractDateService.isContractApproachingExpiration.and.returnValue(false);

      actions$ = of(checkContractExpirations());

      effects.checkContractExpirations$.subscribe(() => {
        expect(contractDateService.isContractApproachingExpiration).toHaveBeenCalledTimes(1);
        expect(notificationService.sendContractExpiringNotification).not.toHaveBeenCalled();
        done();
      });

      const req = httpTestingController.expectOne(TIMECARD_ENDPOINTS.getExpiringContracts());
      req.flush(contracts);
    });

    it('should handle empty contracts array', (done) => {
      actions$ = of(checkContractExpirations());

      effects.checkContractExpirations$.subscribe(() => {
        expect(contractDateService.isContractApproachingExpiration).not.toHaveBeenCalled();
        expect(notificationService.sendContractExpiringNotification).not.toHaveBeenCalled();
        done();
      });

      const req = httpTestingController.expectOne(TIMECARD_ENDPOINTS.getExpiringContracts());
      req.flush([]);
    });

    it('should handle API error gracefully without throwing', (done) => {
      actions$ = of(checkContractExpirations());

      // The effect should complete without error (catchError returns EMPTY)
      let completed = false;
      effects.checkContractExpirations$.subscribe({
        complete: () => {
          completed = true;
        }
      });

      const req = httpTestingController.expectOne(TIMECARD_ENDPOINTS.getExpiringContracts());
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      // Give time for the error handling to complete
      setTimeout(() => {
        expect(notificationService.sendContractExpiringNotification).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should use current user ID as managerId for notifications', (done) => {
      authService.getUser.and.returnValue({ id: 'custom-manager-42', market: 'West' });

      const contracts: Contract[] = [
        createMockContract({ id: 'c1', name: 'Contract A' })
      ];

      contractDateService.isContractApproachingExpiration.and.returnValue(true);

      actions$ = of(checkContractExpirations());

      effects.checkContractExpirations$.subscribe(() => {
        expect(notificationService.sendContractExpiringNotification).toHaveBeenCalledWith(
          'custom-manager-42',
          'c1',
          'Contract A',
          jasmine.any(Date)
        );
        done();
      });

      const req = httpTestingController.expectOne(TIMECARD_ENDPOINTS.getExpiringContracts());
      req.flush(contracts);
    });

    it('should use "unknown" as managerId when user is null', (done) => {
      authService.getUser.and.returnValue(null);

      const contracts: Contract[] = [
        createMockContract({ id: 'c1', name: 'Contract A' })
      ];

      contractDateService.isContractApproachingExpiration.and.returnValue(true);

      actions$ = of(checkContractExpirations());

      effects.checkContractExpirations$.subscribe(() => {
        expect(notificationService.sendContractExpiringNotification).toHaveBeenCalledWith(
          'unknown',
          'c1',
          'Contract A',
          jasmine.any(Date)
        );
        done();
      });

      const req = httpTestingController.expectOne(TIMECARD_ENDPOINTS.getExpiringContracts());
      req.flush(contracts);
    });

    it('should convert string dates from API response to Date objects', (done) => {
      const contractsFromApi = [
        {
          id: 'c1',
          name: 'Contract A',
          clientName: 'Client A',
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-07-15T00:00:00.000Z',
          status: 'Active',
          createdBy: 'admin',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];

      contractDateService.isContractApproachingExpiration.and.callFake((contract: Contract) => {
        // Verify the dates were converted to Date objects
        expect(contract.startDate instanceof Date).toBe(true);
        expect(contract.endDate instanceof Date).toBe(true);
        return true;
      });

      actions$ = of(checkContractExpirations());

      effects.checkContractExpirations$.subscribe(() => {
        expect(contractDateService.isContractApproachingExpiration).toHaveBeenCalledTimes(1);
        done();
      });

      const req = httpTestingController.expectOne(TIMECARD_ENDPOINTS.getExpiringContracts());
      req.flush(contractsFromApi);
    });
  });
});
