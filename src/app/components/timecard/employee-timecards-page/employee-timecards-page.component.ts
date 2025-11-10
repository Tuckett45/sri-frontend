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

@Component({
  selector: 'app-employee-timecards-page',
  templateUrl: './employee-timecards-page.component.html',
  styleUrls: ['./employee-timecards-page.component.scss']
})
export class EmployeeTimeCardsPageComponent implements OnInit {
  // List view
  timecards: TimeCardListItem[] = [];
  loading = false;
  currentPage = 0;
  pageSize = 10;
  totalItems = 0;

  // Form view
  isEditing = false;
  editingTimeCardId: string | null = null;
  timecardForm!: FormGroup;

  // Suggestions
  suggestions: TimeCardSuggestion[] = [];
  loadingSuggestions = false;

  // Days of the week
  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  constructor(
    private fb: FormBuilder,
    private timecardApi: TimeCardApiService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadMyTimeCards();
  }

  initForm(): void {
    this.timecardForm = this.fb.group({
      weekEnding: ['', Validators.required],
      entries: this.fb.array([])
    });
  }

  get entriesArray(): FormArray {
    return this.timecardForm.get('entries') as FormArray;
  }

  loadMyTimeCards(): void {
    this.loading = true;
    this.timecardApi.getMyTimeCards({
      page: this.currentPage + 1,
      pageSize: this.pageSize,
      includeEntries: false
    }).subscribe({
      next: (response) => {
        this.timecards = response.items;
        this.totalItems = response.total || 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading timecards:', error);
        this.toastr.error('Failed to load timecards');
        this.loading = false;
      }
    });
  }

  startNewTimeCard(): void {
    this.isEditing = true;
    this.editingTimeCardId = null;
    this.initForm();
    this.addDefaultWeekEntries();
    this.loadSuggestions();
  }

  addDefaultWeekEntries(): void {
    const weekEnding = this.timecardForm.get('weekEnding')?.value;
    if (!weekEnding) {
      // Add 7 empty entries for a standard week
      for (let i = 0; i < 7; i++) {
        this.addEntryRow();
      }
      return;
    }

    // Calculate dates for the week
    const endDate = new Date(weekEnding);
    for (let i = 6; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      this.addEntryRow(date.toISOString().split('T')[0]);
    }
  }

  addEntryRow(date?: string): void {
    const entryGroup = this.fb.group({
      date: [date || '', Validators.required],
      hours: [0, [Validators.required, Validators.min(0), Validators.max(24)]],
      jobCode: ['', Validators.required],
      projectId: [''],
      notes: ['']
    });

    this.entriesArray.push(entryGroup);
  }

  removeEntry(index: number): void {
    if (this.entriesArray.length > 1) {
      this.entriesArray.removeAt(index);
    } else {
      this.toastr.warning('At least one entry is required');
    }
  }

  editTimeCard(timecard: TimeCardListItem): void {
    this.loading = true;
    this.timecardApi.getTimeCardById(timecard.id, true).subscribe({
      next: (fullTimeCard) => {
        this.isEditing = true;
        this.editingTimeCardId = timecard.id;
        this.populateForm(fullTimeCard);
        this.loadSuggestions();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading timecard details:', error);
        this.toastr.error('Failed to load timecard details');
        this.loading = false;
      }
    });
  }

  populateForm(timecard: TimeCard): void {
    this.timecardForm.patchValue({
      weekEnding: timecard.weekEnding
    });

    this.entriesArray.clear();
    timecard.entries.forEach(entry => {
      const entryGroup = this.fb.group({
        date: [entry.date, Validators.required],
        hours: [entry.hours, [Validators.required, Validators.min(0), Validators.max(24)]],
        jobCode: [entry.jobCode, Validators.required],
        projectId: [entry.projectId || ''],
        notes: [entry.notes || '']
      });
      this.entriesArray.push(entryGroup);
    });
  }

  saveTimeCard(submit: boolean = false): void {
    if (this.timecardForm.invalid) {
      this.markFormGroupTouched(this.timecardForm);
      this.toastr.error('Please fill in all required fields');
      return;
    }

    const formValue = this.timecardForm.value;
    const entries: TimeCardEntry[] = formValue.entries.filter((e: any) => e.hours > 0);

    if (entries.length === 0) {
      this.toastr.error('Please add at least one entry with hours');
      return;
    }

    const userId = this.authService.currentUser?.id;
    if (!userId) {
      this.toastr.error('User not authenticated');
      this.loading = false;
      return;
    }

    const request: TimeCardRequest = {
      userId: userId,
      weekEnding: formValue.weekEnding,
      entries: entries
    };

    this.loading = true;

    const operation = this.editingTimeCardId
      ? this.timecardApi.updateTimeCard(this.editingTimeCardId, request)
      : this.timecardApi.createTimeCard(request);

    operation.subscribe({
      next: (response) => {
        const message = this.editingTimeCardId ? 'TimeCard updated' : 'TimeCard created';
        this.toastr.success(message);

        // If user wants to submit right away
        if (submit && response.timecard?.id) {
          this.submitTimeCard(response.timecard.id);
        } else {
          this.cancelEdit();
          this.loadMyTimeCards();
        }
      },
      error: (error) => {
        console.error('Error saving timecard:', error);
        this.toastr.error('Failed to save timecard');
        this.loading = false;
      }
    });
  }

  submitTimeCard(timecardId?: string): void {
    const id = timecardId || this.editingTimeCardId;
    if (!id) {
      this.toastr.error('No timecard to submit');
      return;
    }

    this.loading = true;
    this.timecardApi.submitTimeCard(id).subscribe({
      next: () => {
        this.toastr.success('TimeCard submitted for approval');
        this.cancelEdit();
        this.loadMyTimeCards();
      },
      error: (error) => {
        console.error('Error submitting timecard:', error);
        this.toastr.error('Failed to submit timecard');
        this.loading = false;
      }
    });
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
        this.loadMyTimeCards();
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
        this.loadMyTimeCards();
      },
      error: (error) => {
        console.error('Error recalling timecard:', error);
        this.toastr.error('Failed to recall timecard');
        this.loading = false;
      }
    });
  }

  copyTimeCard(timecard: TimeCardListItem): void {
    const newWeekEnding = prompt('Enter new week ending date (YYYY-MM-DD):');
    if (!newWeekEnding) {
      return;
    }

    this.loading = true;
    this.timecardApi.copyTimeCard(timecard.id, newWeekEnding).subscribe({
      next: () => {
        this.toastr.success('TimeCard copied successfully');
        this.loadMyTimeCards();
      },
      error: (error) => {
        console.error('Error copying timecard:', error);
        this.toastr.error('Failed to copy timecard');
        this.loading = false;
      }
    });
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

  applySuggestion(suggestion: TimeCardSuggestion, index: number): void {
    const entryGroup = this.entriesArray.at(index) as FormGroup;
    entryGroup.patchValue({
      hours: suggestion.averageHours,
      jobCode: suggestion.jobCode,
      projectId: suggestion.projectId || ''
    });
    this.toastr.success('Suggestion applied');
  }

  applyWeeklyPattern(): void {
    if (this.suggestions.length === 0) {
      this.toastr.info('No suggestions available');
      return;
    }

    // Apply most frequent suggestion to all weekday entries (Mon-Fri)
    const mainSuggestion = this.suggestions[0];
    
    for (let i = 0; i < Math.min(5, this.entriesArray.length); i++) {
      const entryGroup = this.entriesArray.at(i) as FormGroup;
      entryGroup.patchValue({
        hours: mainSuggestion.averageHours,
        jobCode: mainSuggestion.jobCode,
        projectId: mainSuggestion.projectId || ''
      });
    }

    this.toastr.success('Weekly pattern applied to weekdays');
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingTimeCardId = null;
    this.initForm();
  }

  getTotalHours(): number {
    return this.entriesArray.controls.reduce((total, control) => {
      const hours = control.get('hours')?.value || 0;
      return total + hours;
    }, 0);
  }

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

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadMyTimeCards();
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
