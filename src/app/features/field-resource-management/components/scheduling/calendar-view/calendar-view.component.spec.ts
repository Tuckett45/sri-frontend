import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { CalendarViewComponent } from './calendar-view.component';
import { CalendarViewType, ScheduleViewMode } from '../../../state/ui/ui.state';
import { JobStatus } from '../../../models/job.model';
import * as UIActions from '../../../state/ui/ui.actions';
import * as AssignmentActions from '../../../state/assignments/assignment.actions';
import * as JobActions from '../../../state/jobs/job.actions';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import * as CrewActions from '../../../state/crews/crew.actions';

describe('CalendarViewComponent', () => {
  let component: CalendarViewComponent;
  let fixture: ComponentFixture<CalendarViewComponent>;
  let store: MockStore;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const initialState = {
    ui: {
      calendarView: CalendarViewType.Day,
      scheduleViewMode: ScheduleViewMode.Technicians,
      selectedDate: new Date('2024-01-15'),
      sidebarOpen: false,
      mobileMenuOpen: false,
      mapView: { center: { lat: 0, lng: 0 }, zoom: 4, showTechnicians: true, showCrews: true, showJobs: true, clusteringEnabled: true },
      selectedFilters: {},
      notifications: [],
      connectionState: { status: 'disconnected', reconnectAttempts: 0 }
    },
    assignments: { ids: [], entities: {}, conflicts: [], qualifiedTechnicians: [], loading: false, error: null },
    jobs: { ids: [], entities: {}, selectedId: null, loading: false, error: null, filters: {} },
    technicians: { ids: [], entities: {}, selectedId: null, loading: false, error: null, filters: {} },
    crews: { ids: [], entities: {}, selectedId: null, loading: false, error: null, filters: {} }
  };

  beforeEach(async () => {
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [CalendarViewComponent],
      imports: [
        RouterTestingModule,
        DragDropModule,
        NoopAnimationsModule,
        MatButtonToggleModule,
        MatIconModule,
        MatButtonModule,
        MatMenuModule,
        MatDividerModule,
        MatTooltipModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideMockStore({ initialState }),
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;

    fixture = TestBed.createComponent(CalendarViewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch setCalendarView action when view changes', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onViewChange(CalendarViewType.Week);
    expect(dispatchSpy).toHaveBeenCalledWith(UIActions.setCalendarView({ view: CalendarViewType.Week }));
  });

  it('should dispatch setScheduleViewMode action when mode changes', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onViewModeChange(ScheduleViewMode.Crews);
    expect(dispatchSpy).toHaveBeenCalledWith(UIActions.setScheduleViewMode({ mode: ScheduleViewMode.Crews }));
  });

  it('should navigate to previous day in day view', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.calendarView = CalendarViewType.Day;
    component.selectedDate = new Date('2024-01-15');
    component.onPrevious();
    expect(dispatchSpy).toHaveBeenCalledWith(jasmine.objectContaining({ type: UIActions.setSelectedDate.type }));
  });

  it('should navigate to today', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onToday();
    expect(dispatchSpy).toHaveBeenCalledWith(jasmine.objectContaining({ type: UIActions.setSelectedDate.type }));
  });

  it('should get correct status color class', () => {
    expect(component.getStatusColor(JobStatus.NotStarted)).toBe('status-not-started');
    expect(component.getStatusColor(JobStatus.EnRoute)).toBe('status-en-route');
    expect(component.getStatusColor(JobStatus.OnSite)).toBe('status-on-site');
    expect(component.getStatusColor(JobStatus.Completed)).toBe('status-completed');
    expect(component.getStatusColor(JobStatus.Issue)).toBe('status-issue');
    expect(component.getStatusColor(JobStatus.Cancelled)).toBe('status-cancelled');
  });

  it('should return correct row header label per view mode', () => {
    component.viewMode = ScheduleViewMode.Technicians;
    expect(component.getRowHeaderLabel()).toBe('Technician');
    component.viewMode = ScheduleViewMode.Crews;
    expect(component.getRowHeaderLabel()).toBe('Crew');
    component.viewMode = ScheduleViewMode.Jobs;
    expect(component.getRowHeaderLabel()).toBe('Job');
    component.viewMode = ScheduleViewMode.Sites;
    expect(component.getRowHeaderLabel()).toBe('Site');
  });

  it('should format time slot for day view', () => {
    component.calendarView = CalendarViewType.Day;
    const slot = new Date('2024-01-15T10:00:00');
    expect(component.formatTimeSlot(slot)).toContain('10');
  });

  it('should format selected date for day view', () => {
    component.calendarView = CalendarViewType.Day;
    component.selectedDate = new Date('2024-01-15');
    expect(component.formatSelectedDate()).toContain('2024');
  });

  it('should handle context menu', () => {
    const event = new MouseEvent('contextmenu', { clientX: 100, clientY: 200 });
    const job = { id: '1', jobId: 'JOB-001' } as any;
    spyOn(event, 'preventDefault');
    component.onJobContextMenu(event, job);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.contextMenuJob).toBe(job);
    expect(component.showContextMenu).toBeTrue();
  });

  it('should close context menu', () => {
    component.showContextMenu = true;
    component.contextMenuJob = { id: '1' } as any;
    component.closeContextMenu();
    expect(component.showContextMenu).toBeFalse();
    expect(component.contextMenuJob).toBeNull();
  });

  it('should clean up subscriptions on destroy', () => {
    const destroySpy = spyOn(component['destroy$'], 'next');
    const completeSpy = spyOn(component['destroy$'], 'complete');
    component.ngOnDestroy();
    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });

  it('should display loading indicator when loading is true', () => {
    store.setState({
      ...initialState,
      assignments: { ...initialState.assignments, loading: true }
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.loading-container')).toBeTruthy();
    expect(compiled.querySelector('mat-spinner')).toBeTruthy();
  });

  it('should display error message when error is set', () => {
    store.setState({
      ...initialState,
      assignments: { ...initialState.assignments, error: 'Failed to load schedule' }
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error-card')).toBeTruthy();
    expect(compiled.textContent).toContain('Failed to load schedule');
  });

  it('should dispatch load actions on retry', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onRetry();

    expect(dispatchSpy).toHaveBeenCalledWith(TechnicianActions.loadTechnicians({ filters: {} }));
    expect(dispatchSpy).toHaveBeenCalledWith(JobActions.loadJobs({ filters: {} }));
    expect(dispatchSpy).toHaveBeenCalledWith(AssignmentActions.loadAssignments({}));
    expect(dispatchSpy).toHaveBeenCalledWith(CrewActions.loadCrews({}));
  });
});
