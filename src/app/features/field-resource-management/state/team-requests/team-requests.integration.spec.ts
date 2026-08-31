/**
 * Team Requests Integration Tests
 *
 * State-level integration tests that verify the full flow through effects,
 * reducers, and selectors together. API services are mocked, but the NgRx
 * infrastructure (Store, Effects) is real.
 *
 * Test cases:
 * 1. Full toggle → load → display cycle
 * 2. Timeout handling (>10s hierarchy response)
 * 3. State isolation between personal and team slices
 * 4. Re-fetch behavior (two activations = two hierarchy API calls)
 * 5. Department filter on loaded team data
 *
 * Requirements: 3.2, 3.3, 5.2, 6.1, 6.4, 6.5, 7.3
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Store, StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { first } from 'rxjs/operators';

import { TeamRequestsEffects } from './team-requests.effects';
import { teamRequestsReducer, TEAM_REQUESTS_FEATURE_KEY, TeamRequestsState } from './team-requests.reducer';
import * as TeamRequestsActions from './team-requests.actions';
import {
  selectAllTeamPtoRequests,
  selectTeamPtoLoading,
  selectTeamPtoError,
  selectAllTeamOvertimeRequests,
  selectTeamOvertimeByDepartment,
  selectTeamOvertimeLoading
} from './team-requests.selectors';

import { ManagerTeamService, DirectReportsResponse } from '../../services/manager-team.service';
import { PtoApiService } from '../../services/pto-api.service';
import { OvertimeApiService } from '../../services/overtime-api.service';
import { PtoRequest, RequestStatus } from '../../models/pto.models';
import { OvertimeRequest, OvertimeRequestStatus, SupportedMarket } from '../../models/overtime.models';

describe('Team Requests Integration Tests', () => {
  let store: Store;
  let managerTeamService: jasmine.SpyObj<ManagerTeamService>;
  let ptoApiService: jasmine.SpyObj<PtoApiService>;
  let overtimeApiService: jasmine.SpyObj<OvertimeApiService>;

  const managerId = 'mgr-001';

  const mockDirectReportsResponse: DirectReportsResponse = {
    managerId,
    directReports: [
      {
        id: 'emp-001',
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@example.com',
        isAvailable: true,
        isActive: true
      },
      {
        id: 'emp-002',
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bob@example.com',
        isAvailable: true,
        isActive: true
      }
    ],
    totalCount: 2
  };

  const mockPtoRequests: PtoRequest[] = [
    {
      id: 'pto-1',
      employeeId: 'emp-001',
      employeeName: 'Alice Johnson',
      managerId,
      managerName: 'Manager',
      startDate: '2024-06-01',
      endDate: '2024-06-03',
      requestType: 'pto',
      reason: 'Vacation',
      status: RequestStatus.Approved,
      createdAt: '2024-05-20',
      updatedAt: '2024-05-21'
    },
    {
      id: 'pto-2',
      employeeId: 'emp-002',
      employeeName: 'Bob Smith',
      managerId,
      managerName: 'Manager',
      startDate: '2024-07-10',
      endDate: '2024-07-12',
      requestType: 'pto',
      reason: 'Personal',
      status: RequestStatus.Pending_Manager_Approval,
      createdAt: '2024-06-25',
      updatedAt: '2024-06-25'
    },
    {
      id: 'pto-3',
      employeeId: managerId,
      employeeName: 'Manager User',
      managerId: 'upper-mgr',
      managerName: 'Upper Manager',
      startDate: '2024-08-01',
      endDate: '2024-08-02',
      requestType: 'pto',
      reason: 'Doctor',
      status: RequestStatus.Approved,
      createdAt: '2024-07-15',
      updatedAt: '2024-07-16'
    }
  ];

  const mockOvertimeRequests: OvertimeRequest[] = [
    {
      id: 'ot-1',
      employeeId: 'emp-001',
      employeeFullName: 'Alice Johnson',
      department: 'Construction',
      market: SupportedMarket.Texas,
      emailedSriLead: true,
      sriLeadName: 'Lead A',
      approvalStatus: OvertimeRequestStatus.Approved,
      submissionDate: '2024-06-01',
      overtimeStartDate: '2024-06-02',
      estimatedHours: 3,
      estimatedMinutes: 0,
      estimatedDuration: { hours: 3, minutes: 0 },
      justification: 'Deadline',
      managerId,
      managerName: 'Manager',
      approvalHistory: [],
      createdAt: '2024-06-01',
      updatedAt: '2024-06-01'
    },
    {
      id: 'ot-2',
      employeeId: 'emp-002',
      employeeFullName: 'Bob Smith',
      department: 'Engineering',
      market: SupportedMarket.Utah,
      emailedSriLead: false,
      sriLeadName: 'Lead B',
      approvalStatus: OvertimeRequestStatus.Pending_Manager_Approval,
      submissionDate: '2024-06-05',
      overtimeStartDate: '2024-06-06',
      estimatedHours: 2,
      estimatedMinutes: 30,
      estimatedDuration: { hours: 2, minutes: 30 },
      justification: 'Urgent fix',
      managerId,
      managerName: 'Manager',
      approvalHistory: [],
      createdAt: '2024-06-05',
      updatedAt: '2024-06-05'
    },
    {
      id: 'ot-3',
      employeeId: managerId,
      employeeFullName: 'Manager User',
      department: 'Construction',
      market: SupportedMarket.Texas,
      emailedSriLead: true,
      sriLeadName: 'Lead C',
      approvalStatus: OvertimeRequestStatus.Approved,
      submissionDate: '2024-06-10',
      overtimeStartDate: '2024-06-11',
      estimatedHours: 4,
      estimatedMinutes: 0,
      estimatedDuration: { hours: 4, minutes: 0 },
      justification: 'Project push',
      managerId: 'upper-mgr',
      managerName: 'Upper Manager',
      approvalHistory: [],
      createdAt: '2024-06-10',
      updatedAt: '2024-06-10'
    }
  ];

  beforeEach(() => {
    managerTeamService = jasmine.createSpyObj('ManagerTeamService', ['getDirectReports']);
    ptoApiService = jasmine.createSpyObj('PtoApiService', ['getTeamRequests']);
    overtimeApiService = jasmine.createSpyObj('OvertimeApiService', ['getTeamRequests']);

    TestBed.configureTestingModule({
      imports: [
        StoreModule.forRoot({}),
        StoreModule.forFeature(TEAM_REQUESTS_FEATURE_KEY, teamRequestsReducer),
        EffectsModule.forRoot([]),
        EffectsModule.forFeature([TeamRequestsEffects])
      ],
      providers: [
        { provide: ManagerTeamService, useValue: managerTeamService },
        { provide: PtoApiService, useValue: ptoApiService },
        { provide: OvertimeApiService, useValue: overtimeApiService }
      ]
    });

    store = TestBed.inject(Store);
  });

  describe('1. Full toggle → load → display cycle (Requirement 3.2, 3.3)', () => {
    it('should dispatch loadTeamPtoRequests and receive 3 requests through the full effects pipeline', fakeAsync(() => {
      // Arrange: Mock hierarchy returns 2 reports, PTO API returns 3 requests
      managerTeamService.getDirectReports.and.returnValue(of(mockDirectReportsResponse));
      ptoApiService.getTeamRequests.and.returnValue(of(mockPtoRequests));

      // Act: Dispatch loadTeamPtoRequests (simulates "Team View" toggle activation)
      store.dispatch(TeamRequestsActions.loadTeamPtoRequests({ managerId }));
      tick(); // Allow effects to process

      // Assert: selectAllTeamPtoRequests should contain all 3 requests
      let teamRequests: PtoRequest[] = [];
      store.select(selectAllTeamPtoRequests).pipe(first()).subscribe(r => teamRequests = r);
      expect(teamRequests.length).toBe(3);

      // Assert: selectTeamPtoLoading should be false after completion
      let loading = true;
      store.select(selectTeamPtoLoading).pipe(first()).subscribe(l => loading = l);
      expect(loading).toBe(false);

      // Verify the hierarchy API was called with the correct managerId
      expect(managerTeamService.getDirectReports).toHaveBeenCalledWith(managerId);
      // Verify PTO API was called with managerId + direct report IDs
      expect(ptoApiService.getTeamRequests).toHaveBeenCalledWith([managerId, 'emp-001', 'emp-002']);
    }));

    it('should correctly populate the store so loaded requests are selectable by their IDs', fakeAsync(() => {
      managerTeamService.getDirectReports.and.returnValue(of(mockDirectReportsResponse));
      ptoApiService.getTeamRequests.and.returnValue(of(mockPtoRequests));

      store.dispatch(TeamRequestsActions.loadTeamPtoRequests({ managerId }));
      tick();

      let teamRequests: PtoRequest[] = [];
      store.select(selectAllTeamPtoRequests).pipe(first()).subscribe(r => teamRequests = r);

      // Verify all individual requests are present
      const ids = teamRequests.map(r => r.id);
      expect(ids).toContain('pto-1');
      expect(ids).toContain('pto-2');
      expect(ids).toContain('pto-3');
    }));
  });

  describe('2. Timeout handling (Requirement 6.1, 6.4)', () => {
    it('should dispatch failure with timeout error when hierarchy response exceeds 10 seconds', fakeAsync(() => {
      // Arrange: Mock hierarchy response delayed by 11 seconds (exceeds 10s timeout)
      managerTeamService.getDirectReports.and.returnValue(
        of(mockDirectReportsResponse).pipe(delay(11000))
      );

      // Act: Dispatch loadTeamPtoRequests
      store.dispatch(TeamRequestsActions.loadTeamPtoRequests({ managerId }));
      tick(11000); // Advance time past the 10s timeout

      // Assert: selectTeamPtoError should contain timeout message
      let error: string | null = null;
      store.select(selectTeamPtoError).pipe(first()).subscribe(e => error = e);
      expect(error).not.toBeNull();
      expect(error!).toBe('Team hierarchy request timed out. Please try again.');

      // Assert: loading should be false (Employee View fallback implied)
      let loading = true;
      store.select(selectTeamPtoLoading).pipe(first()).subscribe(l => loading = l);
      expect(loading).toBe(false);

      // Verify PTO API was never called (hierarchy failed before reaching it)
      expect(ptoApiService.getTeamRequests).not.toHaveBeenCalled();
    }));

    it('should leave team requests empty after a timeout failure', fakeAsync(() => {
      managerTeamService.getDirectReports.and.returnValue(
        of(mockDirectReportsResponse).pipe(delay(11000))
      );

      store.dispatch(TeamRequestsActions.loadTeamPtoRequests({ managerId }));
      tick(11000);

      let teamRequests: PtoRequest[] = [];
      store.select(selectAllTeamPtoRequests).pipe(first()).subscribe(r => teamRequests = r);
      expect(teamRequests.length).toBe(0);
    }));
  });

  describe('3. State isolation (Requirement 7.3)', () => {
    it('should not affect team overtime state when team PTO actions are dispatched', fakeAsync(() => {
      // Arrange: Pre-load some overtime data into the store
      const overtimeData: OvertimeRequest[] = [mockOvertimeRequests[0]];
      store.dispatch(TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests: overtimeData }));
      tick();

      // Verify overtime data is present
      let overtimeRequests: OvertimeRequest[] = [];
      store.select(selectAllTeamOvertimeRequests).pipe(first()).subscribe(r => overtimeRequests = r);
      expect(overtimeRequests.length).toBe(1);

      // Act: Dispatch team PTO success with PTO data
      managerTeamService.getDirectReports.and.returnValue(of(mockDirectReportsResponse));
      ptoApiService.getTeamRequests.and.returnValue(of(mockPtoRequests));

      store.dispatch(TeamRequestsActions.loadTeamPtoRequests({ managerId }));
      tick();

      // Assert: Team overtime state remains intact (personal-equivalent isolation)
      let afterOvertimeRequests: OvertimeRequest[] = [];
      store.select(selectAllTeamOvertimeRequests).pipe(first()).subscribe(r => afterOvertimeRequests = r);
      expect(afterOvertimeRequests.length).toBe(1);
      expect(afterOvertimeRequests[0].id).toBe('ot-1');
    }));

    it('should not affect team PTO state when team overtime actions are dispatched', fakeAsync(() => {
      // Arrange: Pre-load some PTO data into the store
      store.dispatch(TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests: mockPtoRequests }));
      tick();

      let ptoRequests: PtoRequest[] = [];
      store.select(selectAllTeamPtoRequests).pipe(first()).subscribe(r => ptoRequests = r);
      expect(ptoRequests.length).toBe(3);

      // Act: Dispatch team overtime success
      store.dispatch(TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests: mockOvertimeRequests }));
      tick();

      // Assert: Team PTO state remains intact
      let afterPtoRequests: PtoRequest[] = [];
      store.select(selectAllTeamPtoRequests).pipe(first()).subscribe(r => afterPtoRequests = r);
      expect(afterPtoRequests.length).toBe(3);
      expect(afterPtoRequests.map(r => r.id).sort()).toEqual(['pto-1', 'pto-2', 'pto-3']);
    }));

    it('should preserve loaded team data when a PTO load failure occurs', fakeAsync(() => {
      // Pre-load overtime data
      store.dispatch(TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests: mockOvertimeRequests }));
      tick();

      // Dispatch PTO failure
      store.dispatch(TeamRequestsActions.loadTeamPtoRequestsFailure({ error: 'Network error' }));
      tick();

      // Overtime data should be unaffected
      let overtimeRequests: OvertimeRequest[] = [];
      store.select(selectAllTeamOvertimeRequests).pipe(first()).subscribe(r => overtimeRequests = r);
      expect(overtimeRequests.length).toBe(3);
    }));
  });

  describe('4. Re-fetch behavior (Requirement 6.5)', () => {
    it('should call getDirectReports twice when Team View is activated twice', fakeAsync(() => {
      // Arrange
      managerTeamService.getDirectReports.and.returnValue(of(mockDirectReportsResponse));
      ptoApiService.getTeamRequests.and.returnValue(of(mockPtoRequests));

      // Act: Dispatch loadTeamPtoRequests twice (simulates two Team View activations)
      store.dispatch(TeamRequestsActions.loadTeamPtoRequests({ managerId }));
      tick();

      store.dispatch(TeamRequestsActions.loadTeamPtoRequests({ managerId }));
      tick();

      // Assert: getDirectReports should have been called twice (no caching)
      expect(managerTeamService.getDirectReports).toHaveBeenCalledTimes(2);
    }));

    it('should call getTeamRequests twice for two separate Team View activations', fakeAsync(() => {
      managerTeamService.getDirectReports.and.returnValue(of(mockDirectReportsResponse));
      ptoApiService.getTeamRequests.and.returnValue(of(mockPtoRequests));

      store.dispatch(TeamRequestsActions.loadTeamPtoRequests({ managerId }));
      tick();

      store.dispatch(TeamRequestsActions.loadTeamPtoRequests({ managerId }));
      tick();

      expect(ptoApiService.getTeamRequests).toHaveBeenCalledTimes(2);
    }));

    it('should call hierarchy API for overtime Team View on each activation', fakeAsync(() => {
      managerTeamService.getDirectReports.and.returnValue(of(mockDirectReportsResponse));
      overtimeApiService.getTeamRequests.and.returnValue(of(mockOvertimeRequests));

      store.dispatch(TeamRequestsActions.loadTeamOvertimeRequests({ managerId }));
      tick();

      store.dispatch(TeamRequestsActions.loadTeamOvertimeRequests({ managerId }));
      tick();

      expect(managerTeamService.getDirectReports).toHaveBeenCalledTimes(2);
      expect(overtimeApiService.getTeamRequests).toHaveBeenCalledTimes(2);
    }));
  });

  describe('5. Department filter (Requirement 5.2)', () => {
    it('should filter overtime requests by department using selectTeamOvertimeByDepartment selector', fakeAsync(() => {
      // Arrange: Load overtime requests from multiple departments
      store.dispatch(TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests: mockOvertimeRequests }));
      tick();

      // Act & Assert: Filter by 'Construction' should return only matching requests
      let constructionRequests: OvertimeRequest[] = [];
      store.select(selectTeamOvertimeByDepartment('Construction')).pipe(first()).subscribe(r => constructionRequests = r);
      expect(constructionRequests.length).toBe(2);
      expect(constructionRequests.every(r => r.department === 'Construction')).toBe(true);
    }));

    it('should return all requests when "All Departments" is selected', fakeAsync(() => {
      // Arrange: Load overtime requests
      store.dispatch(TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests: mockOvertimeRequests }));
      tick();

      // Act & Assert: "All Departments" returns everything
      let allRequests: OvertimeRequest[] = [];
      store.select(selectTeamOvertimeByDepartment('All Departments')).pipe(first()).subscribe(r => allRequests = r);
      expect(allRequests.length).toBe(3);
    }));

    it('should return only Engineering requests when filtered by Engineering', fakeAsync(() => {
      store.dispatch(TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests: mockOvertimeRequests }));
      tick();

      let engRequests: OvertimeRequest[] = [];
      store.select(selectTeamOvertimeByDepartment('Engineering')).pipe(first()).subscribe(r => engRequests = r);
      expect(engRequests.length).toBe(1);
      expect(engRequests[0].department).toBe('Engineering');
      expect(engRequests[0].id).toBe('ot-2');
    }));

    it('should return empty array when filtering by a department with no matching requests', fakeAsync(() => {
      store.dispatch(TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests: mockOvertimeRequests }));
      tick();

      let noResults: OvertimeRequest[] = [];
      store.select(selectTeamOvertimeByDepartment('Finance')).pipe(first()).subscribe(r => noResults = r);
      expect(noResults.length).toBe(0);
    }));

    it('should update filtered results when new data is loaded after filter is applied', fakeAsync(() => {
      // Load initial data
      store.dispatch(TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests: [mockOvertimeRequests[0]] }));
      tick();

      let constructionRequests: OvertimeRequest[] = [];
      store.select(selectTeamOvertimeByDepartment('Construction')).pipe(first()).subscribe(r => constructionRequests = r);
      expect(constructionRequests.length).toBe(1);

      // Load new data with more Construction entries
      store.dispatch(TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests: mockOvertimeRequests }));
      tick();

      store.select(selectTeamOvertimeByDepartment('Construction')).pipe(first()).subscribe(r => constructionRequests = r);
      expect(constructionRequests.length).toBe(2);
    }));
  });
});
