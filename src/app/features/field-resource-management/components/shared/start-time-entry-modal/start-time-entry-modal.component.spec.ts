import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { StartTimeEntryModalComponent } from './start-time-entry-modal.component';
import { SharedMaterialModule } from '../../../shared-material.module';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import * as TimeEntryActions from '../../../state/time-entries/time-entry.actions';

describe('StartTimeEntryModalComponent', () => {
  let component: StartTimeEntryModalComponent;
  let fixture: ComponentFixture<StartTimeEntryModalComponent>;
  let store: MockStore;
  let dialogRef: jasmine.SpyObj<MatDialogRef<StartTimeEntryModalComponent>>;

  const mockJobs = [
    {
      id: '1',
      jobId: 'JOB-001',
      client: 'Test Client',
      siteName: 'Test Site',
      status: 'NotStarted'
    }
  ];

  beforeEach(async () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [StartTimeEntryModalComponent],
      imports: [
        SharedMaterialModule,
        FormsModule,
        NoopAnimationsModule,
        MatDialogModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideMockStore({
          initialState: {
            jobs: {
              entities: {},
              ids: []
            }
          }
        }),
        { provide: MatDialogRef, useValue: dialogRefSpy }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<StartTimeEntryModalComponent>>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StartTimeEntryModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should select a job', () => {
    component.selectJob('job-1');
    expect(component.selectedJobId).toBe('job-1');
  });

  it('should dispatch clockIn action and close dialog when starting time entry', () => {
    spyOn(store, 'dispatch');
    component.selectedJobId = 'job-1';
    
    component.startTimeEntry();
    
    expect(store.dispatch).toHaveBeenCalledWith(
      TimeEntryActions.clockIn({
        jobId: 'job-1',
        technicianId: component.currentTechnicianId
      })
    );
    expect(dialogRef.close).toHaveBeenCalledWith({ started: true, jobId: 'job-1' });
  });

  it('should not start time entry if no job is selected', () => {
    spyOn(store, 'dispatch');
    component.selectedJobId = null;
    
    component.startTimeEntry();
    
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should close dialog when cancel is clicked', () => {
    component.cancel();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
