import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { TimeCardApiService } from '../../../services/timecard-api.service';
import { AuthService } from '../../../services/auth.service';
import { 
  TimeCard, 
  TimeCardListItem, 
  TimeCardRequest, 
  TimeCardEntry, 
  TimeCardHistorySummary,
  TimeCardSuggestion
} from '../../../models/timecard.model';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-employee-timecards-page',
  templateUrl: './employee-timecards-page.component.html',
  styleUrls: ['./employee-timecards-page.component.scss']
})
export class EmployeeTimeCardsPageComponent implements OnInit {
  // Weekly grid view state
  currentWeekEnding: Date = this.getNextSunday(new Date());
  weekDays: Date[] = [];
  timecardForm!: FormGroup;
  currentTimeCardId: string | null = null;
  
  // List of recent timecards (sidebar)
  recentTimecards: TimeCardListItem[] = [];
  loading = false;
  saving = false;
  
  // Auto-save functionality
  private autoSaveSubject = new Subject<void>();
  
  // Suggestions and automation
  suggestions: TimeCardSuggestion[] = [];
  loadingSuggestions = false;
  previousWeekData: TimeCardEntry[] = [];
  
  // Days of the week
  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  constructor(
    private fb: FormBuilder,
    private timecardApi: TimeCardApiService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.initForm();
    this.setupAutoSave();
  }

  ngOnInit(): void {
    this.initializeWeek();
    this.loadRecentTimeCards();
    this.loadSuggestions();
    this.loadPreviousWeekData();
  }

  // Auto-save setup with debounce
  setupAutoSave(): void {
    this.autoSaveSubject.pipe(
      debounceTime(2000), // Wait 2 seconds after user stops typing
      distinctUntilChanged()
    ).subscribe(() => {
      this.autoSave();
    });
  }

  // Initialize weekly grid
  initializeWeek(): void {
    this.weekDays = this.getWeekDays(this.currentWeekEnding);
    this.loadOrCreateTimeCard();
  }

  // Get array of dates for the week
  getWeekDays(weekEnding: Date): Date[] {
    const days: Date[] = [];
    const sunday = new Date(weekEnding);
    
    for (let i = 6; i >= 0; i--) {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() - i);
      days.push(day);
    }
    
    return days;
  }

  // Get next Sunday from given date
  getNextSunday(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    result.setDate(result.getDate() + diff);
    return result;
  }

  initForm(): void {
    this.timecardForm = this.fb.group({
      weekEnding: [this.currentWeekEnding, Validators.required],
      entries: this.fb.array([])
    });
  }

  get entriesArray(): FormArray {
    return this.timecardForm.get('entries') as FormArray;
  }

  // Load recent timecards for sidebar
  loadRecentTimeCards(): void {
    this.loading = true;
    this.timecardApi.getMyTimeCards({
      page: 1,
      pageSize: 10,
      includeEntries: false
    }).subscribe({
      next: (response) => {
        this.recentTimecards = response.items;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading timecards:', error);
        this.toastr.error('Failed to load recent timecards');
        this.loading = false;
      }
    });
  }

  // Load or create timecard for current week
  loadOrCreateTimeCard(): void {
    this.loading = true;
    
    // Try to find existing timecard for this week
    const weekEndingStr = this.currentWeekEnding.toISOString().split('T')[0];
    
    this.timecardApi.getMyTimeCards({
      page: 1,
      pageSize: 1,
      from: weekEndingStr,
      to: weekEndingStr,
      includeEntries: false
    }).subscribe({
      next: (response) => {
        if (response.items && response.items.length > 0) {
          // Load full timecard with entries
          const timecardId = response.items[0].id;
          this.currentTimeCardId = timecardId;
          this.loadFullTimeCard(timecardId);
        } else {
          // Create new empty grid
          this.currentTimeCardId = null;
          this.createEmptyWeekGrid();
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading timecard:', error);
        this.createEmptyWeekGrid();
        this.loading = false;
      }
    });
  }

  // Load full timecard with entries
  loadFullTimeCard(timecardId: string): void {
    this.timecardApi.getTimeCardById(timecardId, true).subscribe({
      next: (timecard) => {
        this.populateFormFromTimeCard(timecard);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading timecard details:', error);
        this.createEmptyWeekGrid();
        this.loading = false;
      }
    });
  }

  // Create empty week grid with one row per day
  createEmptyWeekGrid(): void {
    this.entriesArray.clear();
    
    this.weekDays.forEach(date => {
      this.addEntryRow(date.toISOString().split('T')[0]);
    });
  }

  // Add a new entry row for a specific date
  addEntryRow(date?: string): void {
    const entryGroup = this.fb.group({
      date: [date || '', Validators.required],
      hours: [0, [Validators.required, Validators.min(0), Validators.max(24)]],
      jobCode: [''],
      projectId: [''],
      notes: ['']
    });

    // Subscribe to value changes for auto-save
    entryGroup.valueChanges.subscribe(() => {
      this.triggerAutoSave();
    });

    this.entriesArray.push(entryGroup);
  }

  // Populate form from existing timecard
  populateFormFromTimeCard(timecard: any): void {
    this.entriesArray.clear();
    
    // Create a map of existing entries by date
    const entriesByDate = new Map<string, any>();
    if (timecard.entries) {
      timecard.entries.forEach((entry: any) => {
        const dateStr = new Date(entry.date).toISOString().split('T')[0];
        if (!entriesByDate.has(dateStr)) {
          entriesByDate.set(dateStr, []);
        }
        entriesByDate.get(dateStr)!.push(entry);
      });
    }

    // Create rows for each day of the week
    this.weekDays.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayEntries = entriesByDate.get(dateStr) || [];
      
      if (dayEntries.length > 0) {
        // Add existing entries
        dayEntries.forEach((entry: any) => {
          this.addEntryRow(dateStr);
          const lastIndex = this.entriesArray.length - 1;
          this.entriesArray.at(lastIndex).patchValue({
            date: dateStr,
            hours: entry.hours,
            jobCode: entry.jobCode,
            projectId: entry.projectId || '',
            notes: entry.notes || ''
          });
        });
      } else {
        // Add empty row for day
        this.addEntryRow(dateStr);
      }
    });
  }

  removeEntry(index: number): void {
    if (this.entriesArray.length > 1) {
      this.entriesArray.removeAt(index);
    } else {
      this.toastr.warning('At least one entry is required');
    }
  }

  // Legacy methods kept for backward compatibility
  editTimeCard(timecard: TimeCardListItem): void {
    this.loadTimeCard(timecard);
  }

  saveTimeCard(submit: boolean = false): void {
    if (submit) {
      this.saveAndSubmit();
    } else {
      this.triggerAutoSave();
    }
  }

  submitTimeCard(timecardId?: string): void {
    this.saveAndSubmit();
  }

  deleteTimeCard(timecard: TimeCardListItem): void {
    if (timecard.status !== 'Draft') {
      this.toastr.warning('Only draft timecards can be deleted');
      return;
    }

    if (!confirm('Are you sure you want to delete this timecard?')) {
      return;
    }

    this.loading = true;
    this.timecardApi.deleteTimeCard(timecard.id).subscribe({
      next: () => {
        this.toastr.success('TimeCard deleted');
        this.loadRecentTimeCards();
      },
      error: (error) => {
        console.error('Error deleting timecard:', error);
        this.toastr.error('Failed to delete timecard');
        this.loading = false;
      }
    });
  }

  recallTimeCard(timecard: TimeCardListItem): void {
    if (timecard.status !== 'Submitted') {
      this.toastr.warning('Only submitted timecards can be recalled');
      return;
    }

    if (!confirm('Are you sure you want to recall this timecard? You can edit it after recalling.')) {
      return;
    }

    this.loading = true;
    this.timecardApi.recallTimeCard(timecard.id).subscribe({
      next: () => {
        this.toastr.success('TimeCard recalled');
        this.loadRecentTimeCards();
        if (new Date(timecard.weekEnding).getTime() === this.currentWeekEnding.getTime()) {
          this.initializeWeek();
        }
      },
      error: (error) => {
        console.error('Error recalling timecard:', error);
        this.toastr.error('Failed to recall timecard');
        this.loading = false;
      }
    });
  }

  copyTimeCard(timecard: TimeCardListItem): void {
    this.currentWeekEnding = new Date(timecard.weekEnding);
    const nextWeek = new Date(this.currentWeekEnding);
    nextWeek.setDate(nextWeek.getDate() + 7);
    this.currentWeekEnding = nextWeek;
    this.initializeWeek();
    
    setTimeout(() => {
      this.loadPreviousWeekData();
      setTimeout(() => this.copyFromPreviousWeek(), 300);
    }, 500);
  }

  loadSuggestions(): void {
    this.loadingSuggestions = true;
    this.timecardApi.getUserSuggestions().subscribe({
      next: (summary: TimeCardHistorySummary) => {
        this.suggestions = summary.recentJobs || [];
        this.loadingSuggestions = false;
      },
      error: (error) => {
        console.error('Error loading suggestions:', error);
        this.loadingSuggestions = false;
      }
    });
  }

  // ============================================
  // AUTOMATION FEATURES (ADP-style)
  // ============================================

  // Trigger auto-save
  triggerAutoSave(): void {
    this.autoSaveSubject.next();
  }

  // Auto-save current timecard
  autoSave(): void {
    if (this.saving || !this.hasAnyData()) {
      return;
    }

    this.saving = true;
    const formValue = this.timecardForm.value;
    const entries: TimeCardEntry[] = formValue.entries.filter((e: any) => e.hours > 0 && e.jobCode);

    if (entries.length === 0) {
      this.saving = false;
      return;
    }

    const userId = this.authService.currentUser?.id;
    if (!userId) {
      this.saving = false;
      return;
    }

    const request: TimeCardRequest = {
      userId: userId,
      weekEnding: this.currentWeekEnding.toISOString().split('T')[0],
      entries: entries
    };

    const operation = this.currentTimeCardId
      ? this.timecardApi.updateTimeCard(this.currentTimeCardId, request)
      : this.timecardApi.createTimeCard(request);

    operation.subscribe({
      next: (response) => {
        if (!this.currentTimeCardId && response.timecard?.id) {
          this.currentTimeCardId = response.timecard.id;
        }
        this.saving = false;
        // Silent save - no toast notification
      },
      error: (error) => {
        console.error('Auto-save failed:', error);
        this.saving = false;
      }
    });
  }

  // Check if form has any data
  hasAnyData(): boolean {
    const entries = this.entriesArray.value;
    return entries.some((e: any) => e.hours > 0 || e.jobCode || e.notes);
  }

  // Copy from previous week (ONE CLICK!)
  copyFromPreviousWeek(): void {
    if (this.previousWeekData.length === 0) {
      this.toastr.info('No previous week data available');
      return;
    }

    if (!confirm('Copy all entries from previous week? This will replace current entries.')) {
      return;
    }

    this.entriesArray.clear();
    
    // Create entries for current week based on previous week's pattern
    this.weekDays.forEach((date, index) => {
      const dateStr = date.toISOString().split('T')[0];
      const prevEntries = this.previousWeekData.filter(e => {
        const prevDate = new Date(e.date);
        return prevDate.getDay() === date.getDay(); // Same day of week
      });

      if (prevEntries.length > 0) {
        prevEntries.forEach(entry => {
          this.addEntryRow(dateStr);
          const lastIndex = this.entriesArray.length - 1;
          this.entriesArray.at(lastIndex).patchValue({
            date: dateStr,
            hours: entry.hours,
            jobCode: entry.jobCode,
            projectId: entry.projectId || '',
            notes: '' // Don't copy notes
          });
        });
      } else {
        this.addEntryRow(dateStr);
      }
    });

    this.toastr.success('Previous week copied! Data will auto-save.');
    this.triggerAutoSave();
  }

  // Load previous week's data for copying
  loadPreviousWeekData(): void {
    const previousSunday = new Date(this.currentWeekEnding);
    previousSunday.setDate(previousSunday.getDate() - 7);
    const prevWeekStr = previousSunday.toISOString().split('T')[0];

    this.timecardApi.getMyTimeCards({
      page: 1,
      pageSize: 1,
      from: prevWeekStr,
      to: prevWeekStr,
      includeEntries: false
    }).subscribe({
      next: (response) => {
        if (response.items && response.items.length > 0) {
          // Load full timecard with entries
          const timecardId = response.items[0].id;
          this.timecardApi.getTimeCardById(timecardId, true).subscribe({
            next: (timecard) => {
              this.previousWeekData = timecard.entries;
            },
            error: (error) => {
              console.error('Could not load previous week entries:', error);
            }
          });
        }
      },
      error: (error) => {
        console.error('Could not load previous week data:', error);
      }
    });
  }

  // Quick-apply suggestion to a specific row
  quickApplySuggestion(suggestion: TimeCardSuggestion, rowIndex: number): void {
    const entryGroup = this.entriesArray.at(rowIndex) as FormGroup;
    entryGroup.patchValue({
      hours: suggestion.averageHours,
      jobCode: suggestion.jobCode,
      projectId: suggestion.projectId || ''
    });
    this.toastr.success(`Applied: ${suggestion.jobCode}`);
    this.triggerAutoSave();
  }

  // Apply most common job code to all weekdays (Mon-Fri)
  applyToAllWeekdays(): void {
    if (this.suggestions.length === 0) {
      this.toastr.info('No suggestions available');
      return;
    }

    const topSuggestion = this.suggestions[0];
    let applied = 0;

    this.entriesArray.controls.forEach((control, index) => {
      const date = new Date(control.get('date')?.value);
      const dayOfWeek = date.getDay();
      
      // Apply to weekdays only (Mon-Fri)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const hours = control.get('hours')?.value;
        if (!hours || hours === 0) {
          control.patchValue({
            hours: topSuggestion.averageHours,
            jobCode: topSuggestion.jobCode,
            projectId: topSuggestion.projectId || ''
          });
          applied++;
        }
      }
    });

    if (applied > 0) {
      this.toastr.success(`Applied ${topSuggestion.jobCode} to ${applied} weekdays`);
      this.triggerAutoSave();
    } else {
      this.toastr.info('All weekdays already have hours entered');
    }
  }

  // Add row for specific day (for multiple entries per day)
  addRowForDay(dayIndex: number): void {
    const date = this.weekDays[dayIndex];
    const dateStr = date.toISOString().split('T')[0];
    
    // Find where to insert (after last entry for this day)
    let insertIndex = this.entriesArray.length;
    for (let i = 0; i < this.entriesArray.length; i++) {
      const entryDate = this.entriesArray.at(i).get('date')?.value;
      if (entryDate === dateStr) {
        insertIndex = i + 1;
      }
    }

    const entryGroup = this.fb.group({
      date: [dateStr, Validators.required],
      hours: [0, [Validators.required, Validators.min(0), Validators.max(24)]],
      jobCode: [''],
      projectId: [''],
      notes: ['']
    });

    entryGroup.valueChanges.subscribe(() => {
      this.triggerAutoSave();
    });

    this.entriesArray.insert(insertIndex, entryGroup);
    this.toastr.info('Row added - start typing to auto-save');
  }

  // Navigate to different week
  changeWeek(direction: 'prev' | 'next'): void {
    const newDate = new Date(this.currentWeekEnding);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    this.currentWeekEnding = newDate;
    this.initializeWeek();
  }

  // Manual save and submit
  saveAndSubmit(): void {
    if (!this.hasAnyData()) {
      this.toastr.error('Please add at least one entry with hours');
      return;
    }

    const userId = this.authService.currentUser?.id;
    if (!userId) {
      this.toastr.error('User not authenticated');
      return;
    }

    this.saving = true;
    const formValue = this.timecardForm.value;
    const entries: TimeCardEntry[] = formValue.entries.filter((e: any) => e.hours > 0 && e.jobCode);

    if (entries.length === 0) {
      this.toastr.error('Please add job codes to entries before submitting');
      this.saving = false;
      return;
    }

    const request: TimeCardRequest = {
      userId: userId,
      weekEnding: this.currentWeekEnding.toISOString().split('T')[0],
      entries: entries
    };

    const operation = this.currentTimeCardId
      ? this.timecardApi.updateTimeCard(this.currentTimeCardId, request)
      : this.timecardApi.createTimeCard(request);

    operation.subscribe({
      next: (response) => {
        const id = this.currentTimeCardId || response.timecard?.id;
        if (id) {
          this.timecardApi.submitTimeCard(id).subscribe({
            next: () => {
              this.toastr.success('TimeCard submitted for approval!');
              this.loadRecentTimeCards();
              this.initializeWeek();
            },
            error: (error) => {
              console.error('Error submitting:', error);
              this.toastr.error('Failed to submit timecard');
              this.saving = false;
            }
          });
        }
      },
      error: (error) => {
        console.error('Error saving:', error);
        this.toastr.error('Failed to save timecard');
        this.saving = false;
      }
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  canEdit(timecard: TimeCardListItem): boolean {
    return timecard.status === 'Draft' || timecard.status === 'Rejected';
  }

  canDelete(timecard: TimeCardListItem): boolean {
    return timecard.status === 'Draft';
  }

  canRecall(timecard: TimeCardListItem): boolean {
    return timecard.status === 'Submitted';
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString();
  }

  getDayName(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return this.daysOfWeek[d.getDay() === 0 ? 6 : d.getDay() - 1];
  }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'Draft': 'status-draft',
      'Submitted': 'status-submitted',
      'Approved': 'status-approved',
      'Rejected': 'status-rejected'
    };
    return statusMap[status] || '';
  }

  // Get total hours for the week
  getTotalHours(): number {
    return this.entriesArray.controls.reduce((sum, control) => {
      const hours = control.get('hours')?.value || 0;
      return sum + parseFloat(hours.toString());
    }, 0);
  }

  // Get hours for a specific day
  getDayHours(dayIndex: number): number {
    const date = this.weekDays[dayIndex];
    const dateStr = date.toISOString().split('T')[0];
    
    return this.entriesArray.controls
      .filter(control => control.get('date')?.value === dateStr)
      .reduce((sum, control) => {
        const hours = control.get('hours')?.value || 0;
        return sum + parseFloat(hours.toString());
      }, 0);
  }

  // Get entries for a specific day
  getEntriesForDay(dayIndex: number): FormGroup[] {
    const date = this.weekDays[dayIndex];
    const dateStr = date.toISOString().split('T')[0];
    
    return this.entriesArray.controls
      .map((control, index) => ({ control: control as FormGroup, index }))
      .filter(item => item.control.get('date')?.value === dateStr)
      .map(item => item.control);
  }

  // Load a specific timecard from sidebar
  loadTimeCard(timecard: TimeCardListItem): void {
    this.currentWeekEnding = new Date(timecard.weekEnding);
    this.initializeWeek();
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
