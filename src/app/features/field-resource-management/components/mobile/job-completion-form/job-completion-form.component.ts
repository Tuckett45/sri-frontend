import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-job-completion-form',
  templateUrl: './job-completion-form.component.html',
  styleUrls: ['./job-completion-form.component.scss']
})
export class JobCompletionFormComponent implements OnInit, OnDestroy {
  @Input() jobId?: string;
  @Output() completed = new EventEmitter<any>();

  form!: FormGroup;
  selectedFiles: File[] = [];
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      completionNotes: ['', Validators.required],
      issuesFound: ['']
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
    }
  }

  submit(): void {
    if (this.form.valid) {
      this.completed.emit({ ...this.form.value, photos: this.selectedFiles, jobId: this.jobId, status: 'completed' });
      this.form.reset();
      this.selectedFiles = [];
    }
  }
}
