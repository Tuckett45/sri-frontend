import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { JobDetailComponent } from './job-detail.component';
import { Job, JobStatus, JobType, Priority } from '../../../models/job.model';
import * as JobSelectors from '../../../state/jobs/job.selectors';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';

describe('JobDetailComponent', () => {
  let component: JobDetailComponent;
  let fixture: ComponentFixture<JobDetailComponent>;
  let store: MockStore;

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
    customerPOC: {
      name: 'John Doe',
      phone: '555-0100',
      email: 'john@example.com'
    },
    createdBy: 'user1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
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
        MatProgressSpinnerModule
      ],
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

  it('should display job details', () => {
    store.overrideSelector(JobSelectors.selectSelectedJob, mockJob);
    store.overrideSelector(JobSelectors.selectJobsLoading, false);
    
    fixture.detectChanges();

    expect(component.job).toEqual(mockJob);
  });

  it('should navigate to edit job', () => {
    component.job = mockJob;
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    
    component.editJob();
    
    expect(navigateSpy).toHaveBeenCalledWith(['/field-resource-management/jobs', '1', 'edit']);
  });

  it('should navigate to reassign job', () => {
    component.job = mockJob;
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    
    component.reassignJob();
    
    expect(navigateSpy).toHaveBeenCalledWith(['/field-resource-management/jobs', '1', 'reassign']);
  });

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

  it('should add note', () => {
    component.job = mockJob;
    component.newNoteText = 'test note';
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.addNote();
    
    expect(dispatchSpy).toHaveBeenCalled();
    expect(component.isAddingNote).toBe(false);
  });

  it('should not add empty note', () => {
    component.job = mockJob;
    component.newNoteText = '   ';
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.addNote();
    
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should check if note can be edited', () => {
    const recentNote = {
      id: '1',
      jobId: '1',
      text: 'test',
      author: 'user1',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const oldNote = {
      id: '2',
      jobId: '1',
      text: 'test',
      author: 'user1',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    };

    expect(component.canEditNote(recentNote)).toBe(true);
    expect(component.canEditNote(oldNote)).toBe(false);
  });

  it('should start editing note', () => {
    const note = {
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

  it('should calculate total labor hours', () => {
    component.timeEntries = [
      {
        id: '1',
        jobId: '1',
        technicianId: 'tech1',
        clockInTime: new Date(),
        clockOutTime: new Date(),
        totalHours: 4,
        isManuallyAdjusted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        jobId: '1',
        technicianId: 'tech2',
        clockInTime: new Date(),
        clockOutTime: new Date(),
        totalHours: 3.5,
        isManuallyAdjusted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    expect(component.totalLaborHours).toBe(7.5);
  });

  it('should calculate total mileage', () => {
    component.timeEntries = [
      {
        id: '1',
        jobId: '1',
        technicianId: 'tech1',
        clockInTime: new Date(),
        clockOutTime: new Date(),
        mileage: 25.5,
        isManuallyAdjusted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        jobId: '1',
        technicianId: 'tech2',
        clockInTime: new Date(),
        clockOutTime: new Date(),
        mileage: 30.2,
        isManuallyAdjusted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    expect(component.totalMileage).toBe(55.7);
  });

  it('should format date correctly', () => {
    const date = new Date('2024-01-15');
    const formatted = component.formatDate(date);
    
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
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

  it('should navigate back', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    
    component.goBack();
    
    expect(navigateSpy).toHaveBeenCalledWith(['/field-resource-management/jobs']);
  });

  it('should dispatch select job action on destroy', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.ngOnDestroy();
    
    expect(dispatchSpy).toHaveBeenCalledWith(JobActions.selectJob({ id: null }));
  });
});
