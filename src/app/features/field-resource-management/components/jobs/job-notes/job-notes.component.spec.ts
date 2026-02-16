import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import { JobNotesComponent } from './job-notes.component';
import { JobNote } from '../../../models/job.model';

describe('JobNotesComponent', () => {
  let component: JobNotesComponent;
  let fixture: ComponentFixture<JobNotesComponent>;
  let store: MockStore;

  const mockNotes: JobNote[] = [
    {
      id: '1',
      jobId: 'job1',
      text: 'First note',
      author: 'User 1',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      jobId: 'job1',
      text: 'Second note',
      author: 'User 2',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JobNotesComponent],
      imports: [
        FormsModule,
        NoopAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatSnackBarModule
      ],
      providers: [
        provideMockStore({})
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(JobNotesComponent);
    component = fixture.componentInstance;
    component.jobId = 'job1';
    component.notes = [...mockNotes];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sort notes by creation date on init', () => {
    component.ngOnInit();
    
    expect(component.notes[0].id).toBe('1'); // Most recent first
    expect(component.notes[1].id).toBe('2');
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
    component.newNoteText = 'test note';
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.addNote();
    
    expect(dispatchSpy).toHaveBeenCalled();
    expect(component.isAddingNote).toBe(false);
  });

  it('should not add empty note', () => {
    component.newNoteText = '   ';
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.addNote();
    
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should not add note exceeding 2000 characters', () => {
    component.newNoteText = 'a'.repeat(2001);
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.addNote();
    
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should check if note can be edited', () => {
    const recentNote = mockNotes[0];
    const oldNote = mockNotes[1];
    
    expect(component.canEditNote(recentNote)).toBe(true);
    expect(component.canEditNote(oldNote)).toBe(false);
  });

  it('should start editing note', () => {
    const note = mockNotes[0];
    
    component.startEditNote(note);
    
    expect(component.editingNoteId).toBe('1');
    expect(component.editingNoteText).toBe('First note');
  });

  it('should not start editing old note', () => {
    const oldNote = mockNotes[1];
    
    component.startEditNote(oldNote);
    
    expect(component.editingNoteId).toBeNull();
  });

  it('should cancel editing note', () => {
    component.editingNoteId = '1';
    component.editingNoteText = 'test';
    
    component.cancelEditNote();
    
    expect(component.editingNoteId).toBeNull();
    expect(component.editingNoteText).toBe('');
  });

  it('should save edited note', () => {
    component.editingNoteText = 'updated note';
    const note = mockNotes[0];
    
    component.saveEditNote(note);
    
    expect(component.editingNoteId).toBeNull();
  });

  it('should not save empty edited note', () => {
    component.editingNoteText = '   ';
    const note = mockNotes[0];
    
    component.saveEditNote(note);
    
    expect(component.editingNoteId).not.toBeNull();
  });

  it('should format date time', () => {
    const date = new Date('2024-01-15T10:30:00');
    const formatted = component.formatDateTime(date);
    
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('should get relative time for recent note', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    const relativeTime = component.getRelativeTime(fiveMinutesAgo);
    
    expect(relativeTime).toContain('minute');
  });

  it('should get relative time for old note', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    
    const relativeTime = component.getRelativeTime(twoDaysAgo);
    
    expect(relativeTime).toContain('day');
  });

  it('should get new note character count', () => {
    component.newNoteText = 'test';
    
    expect(component.newNoteCharCount).toBe(4);
  });

  it('should get edit note character count', () => {
    component.editingNoteText = 'test edit';
    
    expect(component.editNoteCharCount).toBe(9);
  });

  it('should check if add note button is disabled', () => {
    component.newNoteText = '';
    expect(component.isAddNoteDisabled).toBe(true);
    
    component.newNoteText = 'valid note';
    expect(component.isAddNoteDisabled).toBe(false);
    
    component.newNoteText = 'a'.repeat(2001);
    expect(component.isAddNoteDisabled).toBe(true);
  });

  it('should check if save edit button is disabled', () => {
    component.editingNoteText = '';
    expect(component.isSaveEditDisabled).toBe(true);
    
    component.editingNoteText = 'valid edit';
    expect(component.isSaveEditDisabled).toBe(false);
    
    component.editingNoteText = 'a'.repeat(2001);
    expect(component.isSaveEditDisabled).toBe(true);
  });

  it('should display empty state when no notes', () => {
    component.notes = [];
    component.isAddingNote = false;
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const emptyState = compiled.querySelector('.empty-state');
    
    expect(emptyState).toBeTruthy();
  });

  it('should display notes list when notes exist', () => {
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const noteItems = compiled.querySelectorAll('.note-item');
    
    expect(noteItems.length).toBe(2);
  });
});
