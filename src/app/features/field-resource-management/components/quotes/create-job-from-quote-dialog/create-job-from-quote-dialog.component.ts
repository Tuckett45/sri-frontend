import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-create-job-from-quote-dialog',
  templateUrl: './create-job-from-quote-dialog.component.html',
  styleUrls: ['./create-job-from-quote-dialog.component.scss']
})
export class CreateJobFromQuoteDialogComponent {
  form: FormGroup;
  priorities = ['Low', 'Medium', 'High', 'Critical'];

  constructor(
    private dialogRef: MatDialogRef<CreateJobFromQuoteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public quote: any,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      title: [quote?.projectTitle || '', Validators.required],
      priority: ['Medium', Validators.required],
      scheduledStart: ['', Validators.required]
    });
  }

  confirm(): void {
    if (this.form.valid) {
      this.dialogRef.close({ ...this.form.value, quoteId: this.quote?.id });
    }
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
