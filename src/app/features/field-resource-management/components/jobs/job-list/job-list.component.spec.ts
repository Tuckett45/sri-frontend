import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSortModule } from '@angular/material/sort';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { JobListComponent } from './job-list.component';
import { Job, JobStatus, JobType, Priority } from '../../../models/job.model';
import * as JobSelectors from '../../../state/jobs/job.selectors';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { DateRangePickerComponent } from '../../shared/date-range-picker/date-range-picker.component';
import { HighlightPipe } from '../../../pipes/highlight.pipe';

describe('JobListComponent', () => {
  let component: JobListComponent;
  let fixture: ComponentFixture<JobListComponent>;
  let store: MockStore;

  const mockJobs: Job[] = [
    {
      id: '1',
      jobId: 'JOB-001',
      client: 'Test Client 1',
      siteName: 'Test Site 1',
      siteAddress: {
        street: '123 Main St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345'
      },
      jobType: JobType.Install,
      priority: Priority.P1,
      status: JobStatus.NotStarted,
      scopeDescription: 'Test description',
      requiredSkills: [],
      requiredCrewSize: 2,
      estimatedLaborHours: 8,
      scheduledStartDate: new Date('2024-01-15'),
      scheduledEndDate: new Date('2024-01-15'),
      attachments: [],
      notes: [],
      market: 'DALLAS',
    company: 'TestCompany',
    createdBy: 'user1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: '2',
      jobId: 'JOB-002',
      client: 'Test Client 2',
      siteName: 'Test Site 2',
      siteAddress: {
        street: '456 Oak Ave',
        city: 'Test City',
        state: 'TS',
        zipCode: '12346'
      },
      jobType: JobType.PM,
      priority: Priority.Normal,
      status: JobStatus.Completed,
      scopeDescription: 'Test description 2',
      requiredSkills: [],
      requiredCrewSize: 1,
      estimatedLaborHours: 4,
      scheduledStartDate: new Date('2024-01-16'),
      scheduledEndDate: new Date('2024-01-16'),
      attachments: [],
      notes: [],
      market: 'DALLAS',
    company: 'TestCompany',
    createdBy: 'user1',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    }
  ];

  const initialState = {
    jobs: {
      entities: {},
      ids: [],
      selectedId: null,
      loading: false,
      error: null,
      filters: {}
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        JobListComponent,
        StatusBadgeComponent,
        DateRangePickerComponent,
        HighlightPipe
      ],
      imports: [
        RouterTestingModule,
        NoopAnimationsModule,
        FormsModule,
        MatTableModule,
        MatCheckboxModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatMenuModule,
        MatPaginatorModule,
        MatCardModule,
        MatSnackBarModule,
        MatDialogModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatChipsModule,
        MatSortModule,
        MatExpansionModule,
        MatDatepickerModule,
        MatNativeDateModule,
        ScrollingModule,
        ReactiveFormsModule,
        HttpClientTestingModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(JobListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load jobs on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.ngOnInit();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should display jobs in table', () => {
    store.overrideSelector(JobSelectors.selectFilteredJobs, mockJobs);
    store.overrideSelector(JobSelectors.selectJobsLoading, false);
    store.overrideSelector(JobSelectors.selectJobsError, null);
    store.overrideSelector(JobSelectors.selectJobFilters, {});

    fixture.detectChanges();

    expect(component.displayedJobs.length).toBeGreaterThan(0);
  });

  it('should handle search input with debounce', (done) => {
    store.overrideSelector(JobSelectors.selectFilteredJobs, mockJobs);
    store.overrideSelector(JobSelectors.selectJobsLoading, false);
    store.overrideSelector(JobSelectors.selectJobsError, null);
    store.overrideSelector(JobSelectors.selectJobFilters, {});
    store.overrideSelector(JobSelectors.selectAllJobs, mockJobs);
    fixture.detectChanges(); // triggers ngOnInit

    component.onSearchChange('test');
    
    setTimeout(() => {
      expect(component.searchTerm).toBe('test');
      done();
    }, 350);
  });

  it('should apply filters', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.selectedStatus = JobStatus.Completed;
    component.applyFilters();
    
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should clear filters', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.searchTerm = 'test';
    component.selectedStatus = JobStatus.Completed;
    
    component.clearFilters();
    
    expect(component.searchTerm).toBe('');
    expect(component.selectedStatus).toBeNull();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should handle pagination', () => {
    store.overrideSelector(JobSelectors.selectFilteredJobs, mockJobs);
    fixture.detectChanges();

    const event = { pageIndex: 1, pageSize: 50, length: 100 };
    component.onPageChange(event);

    expect(component.pageIndex).toBe(1);
    expect(component.pageSize).toBe(50);
  });

  it('should select all jobs', () => {
    component.displayedJobs = mockJobs;
    component.toggleAllRows();
    
    expect(component.selection.selected.length).toBe(mockJobs.length);
  });

  it('should clear selection', () => {
    component.displayedJobs = mockJobs;
    component.toggleAllRows();
    component.clearSelection();
    
    expect(component.selection.selected.length).toBe(0);
  });

  it('should check if all selected', () => {
    component.displayedJobs = mockJobs;
    component.toggleAllRows();
    
    expect(component.isAllSelected()).toBe(true);
  });

  it('should check if indeterminate', () => {
    component.displayedJobs = mockJobs;
    component.selection.select(mockJobs[0]);
    
    expect(component.isIndeterminate()).toBe(true);
  });

  it('should navigate to job detail', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    
    component.viewJob(mockJobs[0]);
    
    expect(navigateSpy).toHaveBeenCalledWith(['/field-resource-management/jobs', '1']);
  });

  it('should open edit dialog for job', () => {
    const dialog = TestBed.inject(MatDialog);
    const dialogSpy = spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(null) } as any);
    
    component.editJob(mockJobs[0]);
    
    expect(dialogSpy).toHaveBeenCalled();
  });

  it('should format date correctly', () => {
    const date = new Date('2024-01-15');
    const formatted = component.formatDate(date);
    
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('should get priority class', () => {
    const p1Class = component.getPriorityClass(Priority.P1);
    expect(p1Class).toBe('priority-critical');

    const p2Class = component.getPriorityClass(Priority.P2);
    expect(p2Class).toBe('priority-high');

    const normalClass = component.getPriorityClass(Priority.Normal);
    expect(normalClass).toBe('priority-normal');
  });

  it('should show empty state when no jobs', () => {
    store.overrideSelector(JobSelectors.selectFilteredJobs, []);
    store.overrideSelector(JobSelectors.selectJobsLoading, false);
    store.overrideSelector(JobSelectors.selectJobsError, null);
    store.overrideSelector(JobSelectors.selectJobFilters, {});
    store.overrideSelector(JobSelectors.selectAllJobs, []);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const emptyState = compiled.querySelector('.empty-state');
    
    expect(emptyState).toBeTruthy();
  });

  it('should show loading spinner when loading', () => {
    store.overrideSelector(JobSelectors.selectJobsLoading, true);
    store.overrideSelector(JobSelectors.selectJobsError, null);
    store.overrideSelector(JobSelectors.selectFilteredJobs, []);
    store.overrideSelector(JobSelectors.selectJobFilters, {});
    store.overrideSelector(JobSelectors.selectAllJobs, []);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const spinner = compiled.querySelector('mat-spinner');
    
    expect(spinner).toBeTruthy();
  });

  it('should update displayed jobs on pagination', () => {
    const manyJobs = Array.from({ length: 100 }, (_, i) => ({
      ...mockJobs[0],
      id: `${i}`,
      jobId: `JOB-${i.toString().padStart(3, '0')}`
    }));

    store.overrideSelector(JobSelectors.selectFilteredJobs, manyJobs);
    store.overrideSelector(JobSelectors.selectAllJobs, manyJobs);
    fixture.detectChanges();

    expect(component.displayedJobs.length).toBeLessThanOrEqual(component.pageSize);
  });

  // Requirement 6.1: Verify job list displays jobId, client, siteName, jobType, priority, status
  it('should include jobType in displayed columns', () => {
    expect(component.displayedColumns).toContain('jobType');
  });

  it('should include all required columns: jobId, client, siteName, jobType, priority, status', () => {
    expect(component.displayedColumns).toContain('jobId');
    expect(component.displayedColumns).toContain('client');
    expect(component.displayedColumns).toContain('siteName');
    expect(component.displayedColumns).toContain('jobType');
    expect(component.displayedColumns).toContain('priority');
    expect(component.displayedColumns).toContain('status');
  });

  // Requirement 6.2: Verify all filters work (status, priority, jobType, client, market, search)
  it('should apply status filter', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.selectedStatus = JobStatus.NotStarted;
    component.applyFilters();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should apply priority filter', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.selectedPriority = Priority.P1;
    component.applyFilters();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should apply jobType filter', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.selectedJobType = JobType.Install;
    component.applyFilters();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should apply client filter', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.selectedClient = 'Test Client 1';
    component.applyFilters();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should apply market filter', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.selectedMarket = 'DALLAS';
    component.applyFilters();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should include client and market in active filters', () => {
    component.selectedClient = 'Test Client 1';
    component.selectedMarket = 'DALLAS';
    const activeFilters = component.getActiveFilters();
    expect(activeFilters.find(f => f.key === 'client')).toBeTruthy();
    expect(activeFilters.find(f => f.key === 'market')).toBeTruthy();
  });

  it('should remove client filter', () => {
    component.selectedClient = 'Test Client 1';
    const dispatchSpy = spyOn(store, 'dispatch');
    component.removeFilter('client');
    expect(component.selectedClient).toBeNull();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should remove market filter', () => {
    component.selectedMarket = 'DALLAS';
    const dispatchSpy = spyOn(store, 'dispatch');
    component.removeFilter('market');
    expect(component.selectedMarket).toBeNull();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should clear client and market filters on clearFilters', () => {
    component.selectedClient = 'Test Client 1';
    component.selectedMarket = 'DALLAS';
    spyOn(store, 'dispatch');
    component.clearFilters();
    expect(component.selectedClient).toBeNull();
    expect(component.selectedMarket).toBeNull();
  });

  // Requirement 6.5: Error state with retry
  it('should show error state when error exists', () => {
    store.overrideSelector(JobSelectors.selectFilteredJobs, []);
    store.overrideSelector(JobSelectors.selectJobsLoading, false);
    store.overrideSelector(JobSelectors.selectJobsError, 'Failed to load jobs');
    store.overrideSelector(JobSelectors.selectJobFilters, {});
    store.overrideSelector(JobSelectors.selectAllJobs, []);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const errorState = compiled.querySelector('.error-state');
    expect(errorState).toBeTruthy();
  });

  it('should show retry button in error state', () => {
    store.overrideSelector(JobSelectors.selectFilteredJobs, []);
    store.overrideSelector(JobSelectors.selectJobsLoading, false);
    store.overrideSelector(JobSelectors.selectJobsError, 'Failed to load jobs');
    store.overrideSelector(JobSelectors.selectJobFilters, {});
    store.overrideSelector(JobSelectors.selectAllJobs, []);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const retryButton = compiled.querySelector('.error-state button');
    expect(retryButton).toBeTruthy();
  });

  it('should dispatch loadJobs on retryLoad', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.retryLoad();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should not show table when error exists', () => {
    store.overrideSelector(JobSelectors.selectFilteredJobs, []);
    store.overrideSelector(JobSelectors.selectJobsLoading, false);
    store.overrideSelector(JobSelectors.selectJobsError, 'Failed to load jobs');
    store.overrideSelector(JobSelectors.selectJobFilters, {});
    store.overrideSelector(JobSelectors.selectAllJobs, []);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const tableContainer = compiled.querySelector('.table-container');
    expect(tableContainer).toBeFalsy();
  });
});
