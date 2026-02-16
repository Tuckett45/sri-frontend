import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { CalendarViewComponent } from './calendar-view.component';
import { CalendarViewType } from '../../../state/ui/ui.state';
import { JobStatus } from '../../../models/job.model';
import * as UIActions from '../../../state/ui/ui.actions';
import * as AssignmentActions from '../../../state/assignments/assignment.actions';

describe('CalendarViewComponent', () => {
  let component: CalendarViewComponent;
  let fixture: ComponentFixture<CalendarViewComponent>;
  let store: MockStore;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const initialState = {
    ui: {
      calendarView: CalendarViewType.Day,
      selectedDate: new Date('2024-01-15'),
      sidebarOpen: false,
      mobileMenuOpen: false
    },
    assignments: {
      ids: [],
      entities: {},
      conflicts: [],
      qualifiedTechnicians: [],
      loading: false,
      error: null
    },
    jobs: {
      ids: [],
      entities: {},
      selectedId: null,
      loading: false,
      error: null,
      filters: {}
    },
    technicians: {
      ids: [],
      entities: {},
      selectedId: null,
      loading: false,
      error: null,
      filters: {}
    }
  };

  beforeEach(async () => {
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [CalendarViewComponent],
      imports: [
        DragDropModule,
        MatButtonToggleModule,
        MatIconModule,
        MatButtonModule,
        MatMenuModule,
        MatDividerModule
      ],
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

  it('should initialize with day view', () => {
    fixture.detectChanges();
    expect(component.calendarView).toBe(CalendarViewType.Day);
  });

  it('should dispatch setCalendarView action when view changes', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onViewChange(CalendarViewType.Week);
    expect(dispatchSpy).toHaveBeenCalledWith(
      UIActions.setCalendarView({ view: CalendarViewType.Week })
    );
  });

  it('should navigate to previous day in day view', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.calendarView = CalendarViewType.Day;
    component.selectedDate = new Date('2024-01-15');
    
    component.onPrevious();
    
    expect(dispatchSpy).toHaveBeenCalledWith(
      UIActions.setSelectedDate({ date: jasmine.any(Date) })
    );
  });

  it('should navigate to previous week in week view', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.calendarView = CalendarViewType.Week;
    component.selectedDate = new Date('2024-01-15');
    
    component.onPrevious();
    
    expect(dispatchSpy).toHaveBeenCalledWith(
      UIActions.setSelectedDate({ date: jasmine.any(Date) })
    );
  });

  it('should navigate to next day in day view', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.calendarView = CalendarViewType.Day;
    component.selectedDate = new Date('2024-01-15');
    
    component.onNext();
    
    expect(dispatchSpy).toHaveBeenCalledWith(
      UIActions.setSelectedDate({ date: jasmine.any(Date) })
    );
  });

  it('should navigate to today', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onToday();
    expect(dispatchSpy).toHaveBeenCalledWith(
      UIActions.setSelectedDate({ date: jasmine.any(Date) })
    );
  });

  it('should build time slots for day view', () => {
    component.calendarView = CalendarViewType.Day;
    component.selectedDate = new Date('2024-01-15');
    component['buildTimeSlots']();
    
    expect(component.timeSlots.length).toBe(15); // 6 AM to 8 PM = 15 hours
  });

  it('should build time slots for week view', () => {
    component.calendarView = CalendarViewType.Week;
    component.selectedDate = new Date('2024-01-15');
    component['buildTimeSlots']();
    
    expect(component.timeSlots.length).toBe(7); // 7 days
  });

  it('should get correct status color class', () => {
    expect(component.getStatusColor(JobStatus.NotStarted)).toBe('status-not-started');
    expect(component.getStatusColor(JobStatus.EnRoute)).toBe('status-en-route');
    expect(component.getStatusColor(JobStatus.OnSite)).toBe('status-on-site');
    expect(component.getStatusColor(JobStatus.Completed)).toBe('status-completed');
    expect(component.getStatusColor(JobStatus.Issue)).toBe('status-issue');
    expect(component.getStatusColor(JobStatus.Cancelled)).toBe('status-cancelled');
  });

  it('should format time slot for day view', () => {
    component.calendarView = CalendarViewType.Day;
    const slot = new Date('2024-01-15T10:00:00');
    const formatted = component.formatTimeSlot(slot);
    expect(formatted).toContain('10');
  });

  it('should format time slot for week view', () => {
    component.calendarView = CalendarViewType.Week;
    const slot = new Date('2024-01-15');
    const formatted = component.formatTimeSlot(slot);
    expect(formatted).toBeTruthy();
  });

  it('should format selected date for day view', () => {
    component.calendarView = CalendarViewType.Day;
    component.selectedDate = new Date('2024-01-15');
    const formatted = component.formatSelectedDate();
    expect(formatted).toContain('2024');
  });

  it('should format selected date for week view', () => {
    component.calendarView = CalendarViewType.Week;
    component.selectedDate = new Date('2024-01-15');
    const formatted = component.formatSelectedDate();
    expect(formatted).toContain('-');
  });

  it('should handle job click', () => {
    const job = {
      id: '1',
      jobId: 'JOB-001',
      client: 'Test Client',
      siteName: 'Test Site',
      status: JobStatus.NotStarted
    } as any;

    spyOn(console, 'log');
    component.onJobClick(job);
    expect(console.log).toHaveBeenCalledWith('Job clicked:', job);
  });

  it('should handle context menu', () => {
    const event = new MouseEvent('contextmenu', { clientX: 100, clientY: 200 });
    const job = { id: '1', jobId: 'JOB-001' } as any;

    spyOn(event, 'preventDefault');
    component.onJobContextMenu(event, job);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.contextMenuJob).toBe(job);
    expect(component.contextMenuPosition.x).toBe('100px');
    expect(component.contextMenuPosition.y).toBe('200px');
  });

  it('should handle context view action', () => {
    const job = { id: '1', jobId: 'JOB-001' } as any;
    component.contextMenuJob = job;

    spyOn(component, 'onJobClick');
    component.onContextView();

    expect(component.onJobClick).toHaveBeenCalledWith(job);
    expect(component.contextMenuJob).toBeNull();
  });

  it('should handle context delete action', () => {
    const job = { id: '1', jobId: 'JOB-001' } as any;
    component.contextMenuJob = job;

    spyOn(window, 'confirm').and.returnValue(true);
    const dispatchSpy = spyOn(store, 'dispatch');

    component.onContextDelete();

    expect(window.confirm).toHaveBeenCalled();
    expect(component.contextMenuJob).toBeNull();
  });

  it('should show snackbar when job already assigned', () => {
    const job = { id: '1', jobId: 'JOB-001' } as any;
    const technician = { id: 'tech1', firstName: 'John', lastName: 'Doe' } as any;
    const item = { technician, timeSlot: new Date(), jobs: [], hasConflict: false };

    component.assignments = [{
      id: 'assign1',
      jobId: '1',
      technicianId: 'tech1',
      assignedBy: 'admin',
      assignedAt: new Date(),
      isActive: true
    }];

    const event = {
      item: { data: job },
      container: { data: item }
    } as any;

    component.onJobDrop(event);

    expect(snackBar.open).toHaveBeenCalledWith(
      'Job is already assigned to this technician',
      'Close',
      { duration: 3000 }
    );
  });

  it('should dispatch assignTechnician action on valid drop', () => {
    const job = { id: '1', jobId: 'JOB-001' } as any;
    const technician = { id: 'tech1', firstName: 'John', lastName: 'Doe' } as any;
    const item = { technician, timeSlot: new Date(), jobs: [], hasConflict: false };

    component.assignments = [];

    const event = {
      item: { data: job },
      container: { data: item }
    } as any;

    const dispatchSpy = spyOn(store, 'dispatch');
    component.onJobDrop(event);

    expect(dispatchSpy).toHaveBeenCalledWith(
      AssignmentActions.assignTechnician({
        jobId: '1',
        technicianId: 'tech1'
      })
    );
  });

  it('should clean up subscriptions on destroy', () => {
    const destroySpy = spyOn(component['destroy$'], 'next');
    const completeSpy = spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
