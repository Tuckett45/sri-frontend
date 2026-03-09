/**
 * Deployment Form Component
 *
 * Handles create and edit flows for Atlas deployments.
 * Mode is determined by the presence of an :id route param.
 *
 * Requirements: 7.1, 3.11
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Models
import { DeploymentType } from '../../models/deployment.model';

// State
import * as DeploymentActions from '../../state/deployments/deployment.actions';
import * as DeploymentSelectors from '../../state/deployments/deployment.selectors';

export type FormMode = 'create' | 'edit';

@Component({
  selector: 'app-deployment-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    ProgressSpinnerModule,
    MessageModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './deployment-form.component.html',
  styleUrls: ['./deployment-form.component.scss']
})
export class DeploymentFormComponent implements OnInit, OnDestroy {
  mode: FormMode = 'create';
  deploymentId: string | null = null;
  loading = false;
  error: string | null = null;

  deploymentForm!: FormGroup;

  readonly typeOptions = Object.values(DeploymentType).map((t) => ({
    label: t.charAt(0) + t.slice(1).toLowerCase(),
    value: t
  }));

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.deploymentId = this.route.snapshot.paramMap.get('id');
    this.mode = this.deploymentId ? 'edit' : 'create';

    this.deploymentForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      type: [DeploymentType.STANDARD, Validators.required],
      metadata: ['']
    });

    // Subscribe to creating/updating loading state
    this.store
      .select(DeploymentSelectors.selectDeploymentCreating)
      .pipe(takeUntil(this.destroy$))
      .subscribe((l) => (this.loading = l));

    this.store
      .select(DeploymentSelectors.selectDeploymentUpdating)
      .pipe(takeUntil(this.destroy$))
      .subscribe((l) => { if (l) this.loading = l; });

    this.store
      .select(DeploymentSelectors.selectDeploymentCreatingError)
      .pipe(takeUntil(this.destroy$))
      .subscribe((e) => (this.error = e));

    // Prefill form in edit mode
    if (this.mode === 'edit' && this.deploymentId) {
      this.store.dispatch(DeploymentActions.loadDeploymentDetail({ id: this.deploymentId }));
      this.store
        .select(DeploymentSelectors.selectSelectedDeployment)
        .pipe(
          filter((d) => !!d),
          takeUntil(this.destroy$)
        )
        .subscribe((deployment) => {
          if (deployment) {
            this.deploymentForm.patchValue({
              title: deployment.title ?? '',
              type: deployment.type,
              metadata: deployment.metadata
                ? JSON.stringify(deployment.metadata, null, 2)
                : ''
            });
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.deploymentForm.invalid) return;

    const { title, type, metadata } = this.deploymentForm.value;
    let parsedMetadata: Record<string, any> | undefined;

    if (metadata?.trim()) {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch {
        this.error = 'Metadata must be valid JSON.';
        return;
      }
    }

    if (this.mode === 'create') {
      this.store.dispatch(
        DeploymentActions.createDeployment({ request: { title, type, metadata: parsedMetadata } })
      );
      // Navigate back after success (effects trigger list reload)
      this.store
        .select(DeploymentSelectors.selectDeploymentCreating)
        .pipe(
          filter((l) => !l),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          if (!this.error) this.router.navigate(['/atlas/deployments']);
        });
    } else if (this.deploymentId) {
      this.store.dispatch(
        DeploymentActions.updateDeployment({
          id: this.deploymentId,
          request: { title, type, metadata: parsedMetadata }
        })
      );
      this.store
        .select(DeploymentSelectors.selectDeploymentUpdating)
        .pipe(
          filter((l) => !l),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          if (!this.error) this.router.navigate(['/atlas/deployments', this.deploymentId]);
        });
    }
  }

  onCancel(): void {
    if (this.mode === 'edit' && this.deploymentId) {
      this.router.navigate(['/atlas/deployments', this.deploymentId]);
    } else {
      this.router.navigate(['/atlas/deployments']);
    }
  }

  getFormTitle(): string {
    return this.mode === 'create' ? 'New Deployment' : 'Edit Deployment';
  }

  getSubmitButtonLabel(): string {
    return this.mode === 'create' ? 'Create' : 'Save Changes';
  }

  hasError(controlName: string, errorType: string): boolean {
    const control = this.deploymentForm.get(controlName);
    return !!(control?.hasError(errorType) && (control.dirty || control.touched));
  }

  getErrorMessage(controlName: string): string {
    const control = this.deploymentForm.get(controlName);
    if (!control) return '';
    if (control.hasError('required')) return 'This field is required.';
    if (control.hasError('minlength')) return `Minimum ${control.getError('minlength').requiredLength} characters.`;
    if (control.hasError('maxlength')) return `Maximum ${control.getError('maxlength').requiredLength} characters.`;
    return '';
  }
}
