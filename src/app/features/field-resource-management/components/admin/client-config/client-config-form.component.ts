import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientConfiguration } from '../../../models/quote-workflow.model';
import { ClientConfigurationService } from '../../../services/client-configuration.service';

/**
 * Admin form component for creating and editing Client_Configuration records.
 * Fields: client name, tax/freight visibility toggle, default markup percentage.
 * Protected by `canAccessAdminPanel` permission via the admin module route guard.
 *
 * Requirements: 11.1–11.4
 */
@Component({
  selector: 'app-client-config-form',
  templateUrl: './client-config-form.component.html',
  styleUrls: ['./client-config-form.component.scss']
})
export class ClientConfigFormComponent implements OnInit {
  @Input() config: ClientConfiguration | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  configForm!: FormGroup;
  saving = false;

  get isEditMode(): boolean {
    return !!this.config?.id;
  }

  constructor(
    private fb: FormBuilder,
    private clientConfigService: ClientConfigurationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const defaults = this.clientConfigService.getDefaultConfiguration();

    this.configForm = this.fb.group({
      clientName: [
        this.config?.clientName || '',
        [Validators.required, Validators.maxLength(200)]
      ],
      taxFreightVisible: [
        this.config?.taxFreightVisible ?? defaults.taxFreightVisible
      ],
      defaultMarkupPercentage: [
        this.config?.defaultMarkupPercentage ?? defaults.defaultMarkupPercentage,
        [Validators.required, Validators.min(0), Validators.max(100)]
      ]
    });
  }

  onSave(): void {
    if (this.configForm.invalid) {
      this.configForm.markAllAsTouched();
      return;
    }

    this.saving = true;

    const formValue = this.configForm.value;
    const configToSave: ClientConfiguration = {
      id: this.config?.id || '',
      clientName: formValue.clientName,
      taxFreightVisible: formValue.taxFreightVisible,
      defaultMarkupPercentage: formValue.defaultMarkupPercentage,
      createdAt: this.config?.createdAt || '',
      updatedAt: this.config?.updatedAt || ''
    };

    this.clientConfigService.saveClientConfiguration(configToSave).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open(
          this.isEditMode ? 'Configuration updated successfully' : 'Configuration created successfully',
          'Close',
          { duration: 3000, horizontalPosition: 'end', verticalPosition: 'top' }
        );
        this.saved.emit();
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Failed to save configuration', 'Close', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
      }
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  getFieldError(fieldName: string): string {
    const control = this.configForm.get(fieldName);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Maximum length is ${maxLength} characters`;
    }
    if (control?.hasError('min')) {
      return `Value must be at least ${control.errors?.['min'].min}`;
    }
    if (control?.hasError('max')) {
      return `Value must be at most ${control.errors?.['max'].max}`;
    }
    return '';
  }
}
