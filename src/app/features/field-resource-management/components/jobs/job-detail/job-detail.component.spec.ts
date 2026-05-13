import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { JobDetailComponent } from './job-detail.component';
import { Job, JobStatus, JobType, Priority, JobNote } from '../../../models/job.model';
import * as JobSelectors from '../../../state/jobs/job.selectors';
import * as JobActions from '../../../state/jobs/job.actions';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';

describe('JobDetailComponent', () => {
  let component: JobDetailComponent;
  let fixture: ComponentFixture<JobDetailComponent>;
  let store: MockStore;
  let snackBar: MatSnackBar;
  let dialog: MatDialog;

  const mockJob: Job = {
    id: '1',
    jobId: 'JOB-001',
    client: 'Test Client',
    siteName: 'Test Site',
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
    market: 'TEST_MARKET',
    company: 'TEST_COMPANY',
    customerPOC: {
      name: 'John Doe',
      phone: '555-0100',
      email: 'john@example.com'
    },
    createdBy: 'user1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockJobWithNotes: Job = {
    ...mockJob,
    notes: [
      {
        id: 'note-1',
        jobId: '1',
        text: 'First note',
        author: 'dispatcher1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'note-2',
        jobId: '1',
        text: 'Second note',
        author: 'admin1',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ],
    attachments: [
      {
        id: 'att-1',
        fileName: 'photo.jpg',
        fileSize: 2048,
        fileType: 'image/jpeg',
        blobUrl: 'http://example.com/photo.jpg',
        uploadedBy: 'user1',
        uploadedAt: new Date()
      }
    ]
  };

  const initialState = {
    jobs: {
      entities: { '1': mockJob },
      ids: ['1'],
      selectedId: '1',
      loading: false,
      error: null,
      filters: {}
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        JobDetailComponent,
        StatusBadgeComponent
      ],
      imports: [
        RouterTestingModule,
        NoopAnimationsModule,
        FormsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatFormFieldModule,
        MatInputModule,
        MatChipsModule,
        MatTableModule,
        MatSnackBarModule,
        MatDialogModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatTabsModule,
        HttpClientTestingModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideMockStore({ initialState }),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: '1' })
          }
        }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    snackBar = TestBed.inject(MatSnackBar);
    dialog = TestBed.inject(MatDialog);
    fixture = TestBed.createComponent(JobDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load job on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.ngOnInit();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  // Requirement 7.1: Display all job fields including notes, attachments, and status history
  describe('Requirement 7.1 - Job Detail Display', () => {
    it('should display job details when job is loaded', () => {
      store.overrideSelector(JobSelectors.selectSelectedJob, mockJob);
      store.overrideSelector(JobSelectors.selectJobsLoading, false);
      fixture.detectChanges();
      expect(component.job).toEqual(mockJob);
    });

    it('should display job with notes and attachments', () => {
      store.overrideSelector(JobSelectors.selectSelectedJob, mockJobWithNotes);
      store.overrideSelector(JobSelectors.selectJobsLoading, false);
      fixture.detectChanges();
      expect(component.job).toEqual(mockJobWithNotes);
      expect(component.job!.notes.length).toBe(2);
      expect(component.job!.attachments.length).toBe(1);
    });

    it('should render status history section in template', () => {
      store.overrideSelector(JobSelectors.selectSelectedJob, mockJob);
      store.overrideSelector(JobSelectors.selectJobsLoading, false);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      // The template includes frm-job-status-timeline component
      const statusTimeline = compiled.querySelector('frm-job-status-timeline');
      expect(statusTimeline).toBeTruthy();
    });

    it('should render notes section in template', () => {
      store.overrideSelector(JobSelectors.selectSelectedJob, mockJobWithNotes);
      store.overrideSelector(JobSelectors.selectJobsLoading, false);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const noteAuthors = compiled.querySelectorAll('.note-author');
      expect(noteAuthors.length).toBe(2);
    });

    it('should render attachments section in template', () => {
      store.overrideSelector(JobSelectors.selectSelectedJob, mockJobWithNotes);
      store.overrideSelector(JobSelectors.selectJobsLoading, false);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const attachmentItems = compiled.querySelectorAll('.attachment-item');
      expect(attachmentItems.length).toBe(1);
    });
  });

  // Requirement 7.2: Status change dispatches updateJobStatus action
  describe('Requirement 7.2 - Status Change Dispatches Action', () => {
    it('should dispatch updateJobStatus action on valid status change', () => {
      component.job = { ...mockJob, status: JobStatus.NotStarted };
      const dispatchSpy = spyOn(store, 'dispatch');

      component.changeStatus(JobStatus.EnRoute);

      expect(dispatchSpy).toHaveBeenCalledWith(
        JobActions.updateJobStatus({ id: '1', status: JobStatus.EnRoute, reason: undefined })
      );
    });

    it('should dispatch updateJobStatus with reason when provided', () => {
      component.job = { ...mockJob, status: JobStatus.NotStarted };
      const dispatchSpy = spyOn(store, 'dispatch');

      component.changeStatus(JobStatus.Issue, 'Equipment failure');

      expect(dispatchSpy).toHaveBeenCalledWith(
        JobActions.updateJobStatus({ id: '1', status: JobStatus.Issue, reason: 'Equipment failure' })
      );
    });
  });

  // Requirement 7.3: Valid status transitions enforced
  describe('Requirement 7.3 - Valid Status Transitions', () => {
    it('should allow NotStarted → EnRoute', () => {
      expect(component.isValidStatusTransition(JobStatus.NotStarted, JobStatus.EnRoute)).toBe(true);
    });

    it('should allow EnRoute → OnSite', () => {
      expect(component.isValidStatusTransition(JobStatus.EnRoute, JobStatus.OnSite)).toBe(true);
    });

    it('should allow OnSite → Completed', () => {
      expect(component.isValidStatusTransition(JobStatus.OnSite, JobStatus.Completed)).toBe(true);
    });

    it('should allow any status → Issue', () => {
      expect(component.isValidStatusTransition(JobStatus.NotStarted, JobStatus.Issue)).toBe(true);
      expect(component.isValidStatusTransition(JobStatus.EnRoute, JobStatus.Issue)).toBe(true);
      expect(component.isValidStatusTransition(JobStatus.OnSite, JobStatus.Issue)).toBe(true);
    });

    it('should allow any status → Cancelled', () => {
      expect(component.isValidStatusTransition(JobStatus.NotStarted, JobStatus.Cancelled)).toBe(true);
      expect(component.isValidStatusTransition(JobStatus.EnRoute, JobStatus.Cancelled)).toBe(true);
      expect(component.isValidStatusTransition(JobStatus.OnSite, JobStatus.Cancelled)).toBe(true);
      expect(component.isValidStatusTransition(JobStatus.Completed, JobStatus.Cancelled)).toBe(true);
      expect(component.isValidStatusTransition(JobStatus.Issue, JobStatus.Cancelled)).toBe(true);
    });

    it('should return valid transitions for a given status', () => {
      const transitions = component.getValidTransitions(JobStatus.NotStarted);
      expect(transitions).toContain(JobStatus.EnRoute);
      expect(transitions).toContain(JobStatus.Issue);
      expect(transitions).toContain(JobStatus.Cancelled);
      expect(transitions).not.toContain(JobStatus.OnSite);
      expect(transitions).not.toContain(JobStatus.Completed);
    });
  });

  // Requirement 7.4: Invalid transitions show validation error
  describe('Requirement 7.4 - Invalid Transitions Show Error', () => {
    it('should reject NotStarted → Completed (skipping steps)', () => {
      expect(component.isValidStatusTransition(JobStatus.NotStarted, JobStatus.Completed)).toBe(false);
    });

    it('should reject NotStarted → OnSite (skipping EnRoute)', () => {
      expect(component.isValidStatusTransition(JobStatus.NotStarted, JobStatus.OnSite)).toBe(false);
    });

    it('should reject Completed → NotStarted (backward)', () => {
      expect(component.isValidStatusTransition(JobStatus.Completed, JobStatus.NotStarted)).toBe(false);
    });

    it('should reject Cancelled → any (terminal state)', () => {
      expect(component.isValidStatusTransition(JobStatus.Cancelled, JobStatus.NotStarted)).toBe(false);
      expect(component.isValidStatusTransition(JobStatus.Cancelled, JobStatus.EnRoute)).toBe(false);
      expect(component.isValidStatusTransition(JobStatus.Cancelled, JobStatus.OnSite)).toBe(false);
      expect(component.isValidStatusTransition(JobStatus.Cancelled, JobStatus.Completed)).toBe(false);
    });

    it('should set statusTransitionError on invalid transition', () => {
      component.job = { ...mockJob, status: JobStatus.NotStarted };
      const dispatchSpy = spyOn(store, 'dispatch');

      component.changeStatus(JobStatus.Completed);

      expect(component.statusTransitionError).toBeTruthy();
      expect(component.statusTransitionError).toContain('Invalid status transition');
      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should show snackbar on invalid transition', () => {
      component.job = { ...mockJob, status: JobStatus.NotStarted };
      const snackBarSpy = spyOn(snackBar, 'open');

      component.changeStatus(JobStatus.Completed);

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('Invalid status transition'),
        'Close',
        { duration: 5000 }
      );
    });

    it('should clear error on subsequent valid transition', () => {
      component.job = { ...mockJob, status: JobStatus.NotStarted };
      spyOn(store, 'dispatch');

      // First: invalid transition
      component.changeStatus(JobStatus.Completed);
      expect(component.statusTransitionError).toBeTruthy();

      // Second: valid transition
      component.changeStatus(JobStatus.EnRoute);
      expect(component.statusTransitionError).toBeNull();
    });
  });

  // Requirement 7.5: Add note persists with author and timestamp
  describe('Requirement 7.5 - Add Note', () => {
    it('should dispatch addJobNote action when adding a note', () => {
      component.job = mockJob;
      component.newNoteText = 'This is a test note';
      const dispatchSpy = spyOn(store, 'dispatch');

      component.addNote();

      expect(dispatchSpy).toHaveBeenCalledWith(
        JobActions.addJobNote({ jobId: '1', note: 'This is a test note' })
      );
    });

    it('should not dispatch addJobNote for empty note', () => {
      component.job = mockJob;
      component.newNoteText = '   ';
      const dispatchSpy = spyOn(store, 'dispatch');

      component.addNote();

      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should reset form state after adding note', () => {
      component.job = mockJob;
      component.newNoteText = 'test note';
      component.isAddingNote = true;
      spyOn(store, 'dispatch');

      component.addNote();

      expect(component.isAddingNote).toBe(false);
      expect(component.newNoteText).toBe('');
    });

    it('should display notes with author and timestamp in template', () => {
      store.overrideSelector(JobSelectors.selectSelectedJob, mockJobWithNotes);
      store.overrideSelector(JobSelectors.selectJobsLoading, false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const noteAuthors = compiled.querySelectorAll('.note-author span');
      const noteDates = compiled.querySelectorAll('.note-date');

      // Notes should show author
      expect(noteAuthors.length).toBe(2);
      expect(noteAuthors[0].textContent).toContain('dispatcher1');
      expect(noteAuthors[1].textContent).toContain('admin1');

      // Notes should show timestamp
      expect(noteDates.length).toBe(2);
    });
  });

  // Existing tests (fixed)
  describe('Note editing', () => {
    it('should show add note form', () => {
      component.showAddNoteForm();
      expect(component.isAddingNote).toBe(true);
      expect(component.newNoteText).toBe('');
    });

    it('should cancel add note', () => {
      component.isAddingNote = true;
      component.newNoteText = 'test note';
      component.cancelAddNote();
      expect(component.isAddingNote).toBe(false);
      expect(component.newNoteText).toBe('');
    });

    it('should check if note can be edited (within 1 hour)', () => {
      const recentNote: JobNote = {
        id: '1',
        jobId: '1',
        text: 'test',
        author: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const oldNote: JobNote = {
        id: '2',
        jobId: '1',
        text: 'test',
        author: 'user1',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      };

      expect(component.canEditNote(recentNote)).toBe(true);
      expect(component.canEditNote(oldNote)).toBe(false);
    });

    it('should start editing note', () => {
      const note: JobNote = {
        id: '1',
        jobId: '1',
        text: 'test note',
        author: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      component.startEditNote(note);
      expect(component.editingNoteId).toBe('1');
      expect(component.editingNoteText).toBe('test note');
    });

    it('should cancel editing note', () => {
      component.editingNoteId = '1';
      component.editingNoteText = 'test';
      component.cancelEditNote();
      expect(component.editingNoteId).toBeNull();
      expect(component.editingNoteText).toBe('');
    });
  });

  describe('Attachments', () => {
    it('should check if attachment is image', () => {
      const imageAttachment = {
        id: '1',
        fileName: 'test.jpg',
        fileSize: 1024,
        fileType: 'image/jpeg',
        blobUrl: 'http://example.com/test.jpg',
        uploadedBy: 'user1',
        uploadedAt: new Date()
      };

      const pdfAttachment = {
        id: '2',
        fileName: 'test.pdf',
        fileSize: 2048,
        fileType: 'application/pdf',
        blobUrl: 'http://example.com/test.pdf',
        uploadedBy: 'user1',
        uploadedAt: new Date()
      };

      expect(component.isImage(imageAttachment)).toBe(true);
      expect(component.isImage(pdfAttachment)).toBe(false);
    });
  });

  describe('Calculations', () => {
    it('should calculate total labor hours', () => {
      component.timeEntries = [
        {
          id: '1', jobId: '1', technicianId: 'tech1',
          clockInTime: new Date(), clockOutTime: new Date(),
          totalHours: 4, isManuallyAdjusted: false, isLocked: false,
          createdAt: new Date(), updatedAt: new Date()
        },
        {
          id: '2', jobId: '1', technicianId: 'tech2',
          clockInTime: new Date(), clockOutTime: new Date(),
          totalHours: 3.5, isManuallyAdjusted: false, isLocked: false,
          createdAt: new Date(), updatedAt: new Date()
        }
      ];
      expect(component.totalLaborHours).toBe(7.5);
    });

    it('should calculate total mileage', () => {
      component.timeEntries = [
        {
          id: '1', jobId: '1', technicianId: 'tech1',
          clockInTime: new Date(), clockOutTime: new Date(),
          mileage: 25.5, isManuallyAdjusted: false, isLocked: false,
          createdAt: new Date(), updatedAt: new Date()
        },
        {
          id: '2', jobId: '1', technicianId: 'tech2',
          clockInTime: new Date(), clockOutTime: new Date(),
          mileage: 30.2, isManuallyAdjusted: false, isLocked: false,
          createdAt: new Date(), updatedAt: new Date()
        }
      ];
      expect(component.totalMileage).toBe(55.7);
    });
  });

  describe('Formatting', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15');
      const formatted = component.formatDate(date);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('should return N/A for undefined date', () => {
      expect(component.formatDate(undefined)).toBe('N/A');
    });

    it('should format file size correctly', () => {
      expect(component.formatFileSize(500)).toBe('500 B');
      expect(component.formatFileSize(1536)).toBe('1.5 KB');
      expect(component.formatFileSize(2097152)).toBe('2.0 MB');
    });

    it('should get full address', () => {
      component.job = mockJob;
      const address = component.getFullAddress();
      expect(address).toBe('123 Main St, Test City, TS 12345');
    });
  });

  describe('Navigation', () => {
    it('should navigate back using relative path', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = spyOn(router, 'navigate');
      component.goBack();
      // Component uses relative navigation ['..'] with relativeTo
      expect(navigateSpy).toHaveBeenCalledWith(
        ['..'],
        jasmine.objectContaining({ relativeTo: jasmine.anything() })
      );
    });

    it('should open edit dialog when editJob is called', () => {
      component.job = mockJob;
      const dialogSpy = spyOn(dialog, 'open').and.returnValue({
        afterClosed: () => of(null)
      } as any);

      component.editJob();

      expect(dialogSpy).toHaveBeenCalled();
    });

    it('should open reassign dialog when reassignJob is called', () => {
      component.job = mockJob;
      const dialogSpy = spyOn(dialog, 'open').and.returnValue({
        afterClosed: () => of(null)
      } as any);

      component.reassignJob();

      expect(dialogSpy).toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should dispatch select job action on destroy', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.ngOnDestroy();
      expect(dispatchSpy).toHaveBeenCalledWith(JobActions.selectJob({ id: null }));
    });
  });
});
