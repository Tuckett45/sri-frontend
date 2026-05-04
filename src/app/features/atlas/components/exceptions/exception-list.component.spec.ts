/**
 * Exception List Component Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Router } from '@angular/router';
import { ExceptionListComponent } from './exception-list.component';
import { ExceptionDto, ExceptionStatus } from '../../models/exception.model';
import * as ExceptionSelectors from '../../state/exceptions/exception.selectors';
import * as ExceptionActions from '../../state/exceptions/exception.actions';

describe('ExceptionListComponent', () => {
  let component: ExceptionListComponent;
  let fixture: ComponentFixture<ExceptionListComponent>;
  let store: MockStore;
  let router: Router;

  const mockExceptions: ExceptionDto[] = [
    {
      id: 'exc-1',
      exceptionType: 'COMPLIANCE_WAIVER',
      status: ExceptionStatus.PENDING,
      requestedBy: 'user1',
      requestedAt: new Date('2024-01-01'),
      expiresAt: new Date('2024-12-31'),
      justification: 'Emergency deployment required'
    },
    {
      id: 'exc-2',
      exceptionType: 'APPROVAL_BYPASS',
      status: ExceptionStatus.APPROVED,
      requestedBy: 'user2',
      requestedAt: new Date('2024-01-02'),
      justification: 'Critical security patch'
    }
  ];

  const initialState = {
    atlas: {
      exceptions: {
        ids: ['exc-1', 'exc-2'],
        entities: {
          'exc-1': mockExceptions[0],
          'exc-2': mockExceptions[1]
        },
        selectedId: null,
        loading: {
          list: false,
          detail: false,
          creating: false,
          validating: false,
          approving: false,
          denying: false,
          loadingActive: false
        },
        error: {
          list: null,
          detail: null,
          creating: null,
          validating: null,
          approving: null,
          denying: null,
          loadingActive: null
        },
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalCount: 2,
          totalPages: 1
        },
        filters: {},
        activeExceptions: [],
        validationResult: null,
        lastLoaded: Date.now()
      }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExceptionListComponent],
      providers: [
        provideMockStore({ initialState }),
        {
          provide: Router,
          useValue: { navigate: jasmine.createSpy('navigate') }
        }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ExceptionListComponent);
    component = fixture.componentInstance;

    // Setup selectors
    store.overrideSelector(ExceptionSelectors.selectAllExceptions, mockExceptions);
    store.overrideSelector(ExceptionSelectors.selectExceptionsLoading, false);
    store.overrideSelector(ExceptionSelectors.selectExceptionsError, null);
    store.overrideSelector(ExceptionSelectors.selectPagination, initialState.atlas.exceptions.pagination);
    store.overrideSelector(ExceptionSelectors.selectFilters, {});

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load exceptions on init with deploymentId', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.deploymentId = 'dep-123';
    component.ngOnInit();
    expect(dispatchSpy).toHaveBeenCalledWith(
      ExceptionActions.loadExceptions({ deploymentId: 'dep-123', page: 1, pageSize: 50 })
    );
  });

  it('should load exceptions for specific deployment when deploymentId is provided', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.deploymentId = 'dep-123';
    component.loadExceptions();
    expect(dispatchSpy).toHaveBeenCalledWith(
      ExceptionActions.loadExceptions({ deploymentId: 'dep-123', page: 1, pageSize: 50 })
    );
  });

  it('should display exceptions from store', () => {
    expect(component.exceptions).toEqual(mockExceptions);
  });

  it('should handle status filter change', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.deploymentId = 'dep-123';
    component.selectedStatus = ExceptionStatus.PENDING;
    component.onStatusFilterChange();
    
    const dispatchedAction = (dispatchSpy as jasmine.Spy).calls.mostRecent().args[0];
    expect(dispatchedAction.type).toBe(ExceptionActions.setExceptionFilters.type);
    expect(dispatchedAction.filters.status).toBe(ExceptionStatus.PENDING);
  });

  it('should handle page change', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.deploymentId = 'dep-123';
    const event = { first: 10, rows: 10 };
    component.onPageChange(event);
    
    expect(dispatchSpy).toHaveBeenCalledWith(
      ExceptionActions.loadExceptions({ deploymentId: 'dep-123', page: 2, pageSize: 10 })
    );
  });

  it('should open request exception dialog', () => {
    component.onRequestException();
    expect(component.showRequestDialog).toBe(true);
  });

  it('should close request exception dialog', () => {
    component.showRequestDialog = true;
    component.onCloseRequestDialog();
    expect(component.showRequestDialog).toBe(false);
  });

  it('should reload exceptions after exception requested', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.deploymentId = 'dep-123';
    component.onExceptionRequested();
    expect(component.showRequestDialog).toBe(false);
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should select exception on view', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onViewException(mockExceptions[0]);
    expect(dispatchSpy).toHaveBeenCalledWith(
      ExceptionActions.selectException({ id: 'exc-1' })
    );
  });

  it('should retry loading on error', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.deploymentId = 'dep-123';
    component.onRetry();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should return correct status severity', () => {
    expect(component.getStatusSeverity(ExceptionStatus.PENDING)).toBe('warn');
    expect(component.getStatusSeverity(ExceptionStatus.APPROVED)).toBe('success');
    expect(component.getStatusSeverity(ExceptionStatus.DENIED)).toBe('danger');
    expect(component.getStatusSeverity(ExceptionStatus.EXPIRED)).toBe('secondary');
  });

  it('should format status label correctly', () => {
    expect(component.formatStatusLabel(ExceptionStatus.PENDING)).toBe('Pending');
    expect(component.formatStatusLabel(ExceptionStatus.APPROVED)).toBe('Approved');
  });

  it('should format date correctly', () => {
    const date = new Date('2024-01-01T12:00:00Z');
    const formatted = component.formatDate(date);
    expect(formatted).toContain('2024');
  });

  it('should return N/A for undefined date', () => {
    expect(component.formatDate(undefined)).toBe('N/A');
  });

  it('should detect expired exceptions', () => {
    const expiredException: ExceptionDto = {
      ...mockExceptions[0],
      expiresAt: new Date('2020-01-01')
    };
    expect(component.isExpired(expiredException)).toBe(true);
  });

  it('should not mark exception as expired if no expiration date', () => {
    const noExpirationException: ExceptionDto = {
      ...mockExceptions[0],
      expiresAt: undefined
    };
    expect(component.isExpired(noExpirationException)).toBe(false);
  });

  it('should get total records from pagination', () => {
    expect(component.getTotalRecords()).toBe(2);
  });

  it('should get rows per page from pagination', () => {
    expect(component.getRowsPerPage()).toBe(10);
  });

  it('should calculate first record index correctly', () => {
    expect(component.getFirst()).toBe(0);
  });

  it('should handle loading state', () => {
    store.overrideSelector(ExceptionSelectors.selectExceptionsLoading, true);
    store.refreshState();
    fixture.detectChanges();
    expect(component.loading).toBe(true);
  });

  it('should handle error state', () => {
    const errorMessage = 'Failed to load exceptions';
    store.overrideSelector(ExceptionSelectors.selectExceptionsError, errorMessage);
    store.refreshState();
    fixture.detectChanges();
    expect(component.error).toBe(errorMessage);
  });
});
