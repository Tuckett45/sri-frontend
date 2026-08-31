/**
 * Team Requests Effects Unit Tests
 *
 * Tests the loadTeamPto$ and loadTeamOvertime$ effects including:
 * - Hierarchy API call with 10s timeout
 * - Success path: directReports → getTeamRequests → dispatch success
 * - Failure paths: timeout, HTTP error, empty directReports
 *
 * Requirements: 6.1, 6.2, 6.4, 6.5
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError, Subject, NEVER } from 'rxjs';
import { delay } from 'rxjs/operators';
import { TeamRequestsEffects } from './team-requests.effects';
import * as TeamRequestsActions from './team-requests.actions';
import { ManagerTeamService, DirectReportsResponse } from '../../services/manager-team.service';
import { PtoApiService } from '../../services/pto-api.service';
import { OvertimeApiService } from '../../services/overtime-api.service';
import { PtoRequest, RequestStatus } from '../../models/pto.models';
import { OvertimeRequest, OvertimeRequestStatus, SupportedMarket } from '../../models/overtime.models';
import { TimeoutError } from 'rxjs';

describe('TeamRequestsEffects', () => {
  let actions$: Observable<any>;
  let effects: TeamRequestsEffects;
  let managerTeamService: jasmine.SpyObj<ManagerTeamService>;
  let ptoApiService: jasmine.SpyObj<PtoApiService>;
  let overtimeApiService: jasmine.SpyObj<OvertimeApiService>;

  const managerId = 'manager-1';

  const mockDirectReportsResponse: DirectReportsResponse = {
    managerId: managerId,
    directReports: [
      {
        id: 'report-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        isAvailable: true,
        isActive: true
      },
      {
        id: 'report-2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        isAvailable: true,
        isActive: true
      }
    ],
    totalCount: 2
  };

  const mockEmptyDirectReportsResponse: DirectReportsResponse = {
    managerId: managerId,
    directReports: [],
    totalCount: 0
  };

  const mockPtoRequests: PtoRequest[] = [
    {
      id: 'pto-1',
      employeeId: 'report-1',
      employeeName: 'John Doe',
      managerId: managerId,
      managerName: 'Manager User',
      startDate: '2024-03-01',
      endDate: '2024-03-05',
      requestType: 'pto',
      reason: 'Vacation',
      status: RequestStatus.Approved,
      createdAt: '2024-02-20',
      updatedAt: '2024-02-21'
    },
    {
      id: 'pto-2',
      employeeId: 'manager-1',
      employeeName: 'Manager User',
      managerId: 'upper-manager',
      managerName: 'Upper Manager',
      startDate: '2024-04-01',
      endDate: '2024-04-03',
      requestType: 'pto',
      reason: 'Personal',
      status: RequestStatus.Pending_Manager_Approval,
      createdAt: '2024-03-15',
      updatedAt: '2024-03-15'
    }
  ];

  const mockOvertimeRequests: OvertimeRequest[] = [
    {
      id: 'ot-1',
      employeeId: 'report-1',
      employeeFullName: 'John Doe',
      department: 'Construction',
      market: SupportedMarket.Texas,
      emailedSriLead: true,
      sriLeadName: 'Lead User',
      approvalStatus: OvertimeRequestStatus.Approved,
      submissionDate: '2024-03-01',
      overtimeStartDate: '2024-03-02',
      estimatedHours: 4,
      estimatedMinutes: 0,
      estimatedDuration: { hours: 4, minutes: 0 },
      justification: 'Project deadline',
      managerId: managerId,
      managerName: 'Manager User',
      approvalHistory: [],
      createdAt: '2024-03-01',
      updatedAt: '2024-03-01'
    },
    {
      id: 'ot-2',
      employeeId: 'manager-1',
      employeeFullName: 'Manager User',
      department: 'Engineering',
      market: SupportedMarket.Utah,
      emailedSriLead: false,
      sriLeadName: 'Other Lead',
      approvalStatus: OvertimeRequestStatus.Pending_Manager_Approval,
      submissionDate: '2024-03-10',
      overtimeStartDate: '2024-03-11',
      estimatedHours: 2,
      estimatedMinutes: 30,
      estimatedDuration: { hours: 2, minutes: 30 },
      justification: 'Urgent fix',
      managerId: 'upper-manager',
      managerName: 'Upper Manager',
      approvalHistory: [],
      createdAt: '2024-03-10',
      updatedAt: '2024-03-10'
    }
  ];

  beforeEach(() => {
    const managerTeamServiceSpy = jasmine.createSpyObj('ManagerTeamService', [
      'getDirectReports'
    ]);
    const ptoApiServiceSpy = jasmine.createSpyObj('PtoApiService', [
      'getTeamRequests'
    ]);
    const overtimeApiServiceSpy = jasmine.createSpyObj('OvertimeApiService', [
      'getTeamRequests'
    ]);

    TestBed.configureTestingModule({
      providers: [
        TeamRequestsEffects,
        provideMockActions(() => actions$),
        { provide: ManagerTeamService, useValue: managerTeamServiceSpy },
        { provide: PtoApiService, useValue: ptoApiServiceSpy },
        { provide: OvertimeApiService, useValue: overtimeApiServiceSpy }
      ]
    });

    effects = TestBed.inject(TeamRequestsEffects);
    managerTeamService = TestBed.inject(ManagerTeamService) as jasmine.SpyObj<ManagerTeamService>;
    ptoApiService = TestBed.inject(PtoApiService) as jasmine.SpyObj<PtoApiService>;
    overtimeApiService = TestBed.inject(OvertimeApiService) as jasmine.SpyObj<OvertimeApiService>;
  });

  describe('loadTeamPto$', () => {
    it('should call hierarchy API and dispatch success with team PTO requests on success', (done) => {
      // Requirement 6.2: Use employeeId values from hierarchy response to fetch PTO requests
      const action = TeamRequestsActions.loadTeamPtoRequests({ managerId });
      const expectedEmployeeIds = [managerId, 'report-1', 'report-2'];

      actions$ = of(action);
      managerTeamService.getDirectReports.and.returnValue(of(mockDirectReportsResponse));
      ptoApiService.getTeamRequests.and.returnValue(of(mockPtoRequests));

      effects.loadTeamPto$.subscribe((result) => {
        expect(result).toEqual(
          TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests: mockPtoRequests })
        );
        expect(managerTeamService.getDirectReports).toHaveBeenCalledWith(managerId);
        expect(ptoApiService.getTeamRequests).toHaveBeenCalledWith(expectedEmployeeIds);
        done();
      });
    });

    it('should dispatch success with empty requests when hierarchy returns empty directReports', (done) => {
      // Requirement 6.2: Empty directReports → success with empty array, no API call to getTeamRequests
      const action = TeamRequestsActions.loadTeamPtoRequests({ managerId });

      actions$ = of(action);
      managerTeamService.getDirectReports.and.returnValue(of(mockEmptyDirectReportsResponse));

      effects.loadTeamPto$.subscribe((result) => {
        expect(result).toEqual(
          TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests: [] })
        );
        expect(managerTeamService.getDirectReports).toHaveBeenCalledWith(managerId);
        expect(ptoApiService.getTeamRequests).not.toHaveBeenCalled();
        done();
      });
    });

    it('should dispatch failure with timeout message when hierarchy exceeds 10 seconds', fakeAsync(() => {
      // Requirement 6.1: 10-second timeout on hierarchy call
      const action = TeamRequestsActions.loadTeamPtoRequests({ managerId });

      actions$ = of(action);
      // Simulate a response that takes 11 seconds (exceeds the 10s timeout)
      managerTeamService.getDirectReports.and.returnValue(
        of(mockDirectReportsResponse).pipe(delay(11000))
      );

      let result: any;
      effects.loadTeamPto$.subscribe((r) => {
        result = r;
      });

      tick(11000);

      expect(result).toEqual(
        TeamRequestsActions.loadTeamPtoRequestsFailure({
          error: 'Team hierarchy request timed out. Please try again.'
        })
      );
      expect(ptoApiService.getTeamRequests).not.toHaveBeenCalled();
    }));

    it('should dispatch failure with error message when hierarchy returns HTTP error', (done) => {
      // Requirement 6.4: HTTP error from hierarchy → dispatch failure
      const action = TeamRequestsActions.loadTeamPtoRequests({ managerId });
      const httpError = new Error('Server error: 500 Internal Server Error');

      actions$ = of(action);
      managerTeamService.getDirectReports.and.returnValue(throwError(() => httpError));

      effects.loadTeamPto$.subscribe((result) => {
        expect(result).toEqual(
          TeamRequestsActions.loadTeamPtoRequestsFailure({
            error: 'Server error: 500 Internal Server Error'
          })
        );
        expect(ptoApiService.getTeamRequests).not.toHaveBeenCalled();
        done();
      });
    });

    it('should dispatch failure when hierarchy succeeds but getTeamRequests fails', (done) => {
      // Requirement 6.4: Team API error after successful hierarchy call
      const action = TeamRequestsActions.loadTeamPtoRequests({ managerId });
      const apiError = new Error('Failed to load team PTO requests');

      actions$ = of(action);
      managerTeamService.getDirectReports.and.returnValue(of(mockDirectReportsResponse));
      ptoApiService.getTeamRequests.and.returnValue(throwError(() => apiError));

      effects.loadTeamPto$.subscribe((result) => {
        expect(result).toEqual(
          TeamRequestsActions.loadTeamPtoRequestsFailure({
            error: 'Failed to load team PTO requests'
          })
        );
        done();
      });
    });

    it('should use default error message when hierarchy error has no message', (done) => {
      const action = TeamRequestsActions.loadTeamPtoRequests({ managerId });

      actions$ = of(action);
      managerTeamService.getDirectReports.and.returnValue(throwError(() => ({})));

      effects.loadTeamPto$.subscribe((result) => {
        expect(result).toEqual(
          TeamRequestsActions.loadTeamPtoRequestsFailure({
            error: 'Failed to load team hierarchy'
          })
        );
        done();
      });
    });
  });

  describe('loadTeamOvertime$', () => {
    it('should call hierarchy API and dispatch success with team overtime requests on success', (done) => {
      // Requirement 6.2: Use employeeId values from hierarchy response to fetch overtime requests
      const action = TeamRequestsActions.loadTeamOvertimeRequests({ managerId });
      const expectedEmployeeIds = [managerId, 'report-1', 'report-2'];

      actions$ = of(action);
      managerTeamService.getDirectReports.and.returnValue(of(mockDirectReportsResponse));
      overtimeApiService.getTeamRequests.and.returnValue(of(mockOvertimeRequests));

      effects.loadTeamOvertime$.subscribe((result) => {
        expect(result).toEqual(
          TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests: mockOvertimeRequests })
        );
        expect(managerTeamService.getDirectReports).toHaveBeenCalledWith(managerId);
        expect(overtimeApiService.getTeamRequests).toHaveBeenCalledWith(expectedEmployeeIds);
        done();
      });
    });

    it('should dispatch success with empty requests when hierarchy returns empty directReports', (done) => {
      // Requirement 6.2: Empty directReports → success with empty array, no API call to getTeamRequests
      const action = TeamRequestsActions.loadTeamOvertimeRequests({ managerId });

      actions$ = of(action);
      managerTeamService.getDirectReports.and.returnValue(of(mockEmptyDirectReportsResponse));

      effects.loadTeamOvertime$.subscribe((result) => {
        expect(result).toEqual(
          TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests: [] })
        );
        expect(managerTeamService.getDirectReports).toHaveBeenCalledWith(managerId);
        expect(overtimeApiService.getTeamRequests).not.toHaveBeenCalled();
        done();
      });
    });

    it('should dispatch failure with timeout message when hierarchy exceeds 10 seconds', fakeAsync(() => {
      // Requirement 6.1: 10-second timeout on hierarchy call
      const action = TeamRequestsActions.loadTeamOvertimeRequests({ managerId });

      actions$ = of(action);
      managerTeamService.getDirectReports.and.returnValue(
        of(mockDirectReportsResponse).pipe(delay(11000))
      );

      let result: any;
      effects.loadTeamOvertime$.subscribe((r) => {
        result = r;
      });

      tick(11000);

      expect(result).toEqual(
        TeamRequestsActions.loadTeamOvertimeRequestsFailure({
          error: 'Team hierarchy request timed out. Please try again.'
        })
      );
      expect(overtimeApiService.getTeamRequests).not.toHaveBeenCalled();
    }));

    it('should dispatch failure with error message when hierarchy returns HTTP error', (done) => {
      // Requirement 6.4: HTTP error from hierarchy → dispatch failure
      const action = TeamRequestsActions.loadTeamOvertimeRequests({ managerId });
      const httpError = new Error('Service unavailable');

      actions$ = of(action);
      managerTeamService.getDirectReports.and.returnValue(throwError(() => httpError));

      effects.loadTeamOvertime$.subscribe((result) => {
        expect(result).toEqual(
          TeamRequestsActions.loadTeamOvertimeRequestsFailure({
            error: 'Service unavailable'
          })
        );
        expect(overtimeApiService.getTeamRequests).not.toHaveBeenCalled();
        done();
      });
    });

    it('should dispatch failure when hierarchy succeeds but getTeamRequests fails', (done) => {
      // Requirement 6.4: Team API error after successful hierarchy call
      const action = TeamRequestsActions.loadTeamOvertimeRequests({ managerId });
      const apiError = new Error('Failed to load team overtime requests');

      actions$ = of(action);
      managerTeamService.getDirectReports.and.returnValue(of(mockDirectReportsResponse));
      overtimeApiService.getTeamRequests.and.returnValue(throwError(() => apiError));

      effects.loadTeamOvertime$.subscribe((result) => {
        expect(result).toEqual(
          TeamRequestsActions.loadTeamOvertimeRequestsFailure({
            error: 'Failed to load team overtime requests'
          })
        );
        done();
      });
    });

    it('should use default error message when hierarchy error has no message', (done) => {
      const action = TeamRequestsActions.loadTeamOvertimeRequests({ managerId });

      actions$ = of(action);
      managerTeamService.getDirectReports.and.returnValue(throwError(() => ({})));

      effects.loadTeamOvertime$.subscribe((result) => {
        expect(result).toEqual(
          TeamRequestsActions.loadTeamOvertimeRequestsFailure({
            error: 'Failed to load team hierarchy'
          })
        );
        done();
      });
    });
  });
});
