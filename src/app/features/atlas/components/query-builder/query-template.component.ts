/**
 * Query Template Component
 * 
 * Display saved query templates, template execution with parameter input,
 * and template management (create, delete).
 * 
 * Requirements: 7.1, 7.2, 7.5
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

// Models
import {
  QueryTemplate,
  CreateTemplateRequest,
  TemplateExecutionRequest,
  TemplateParameter
} from '../../models/query-builder.model';

// State
import * as QueryBuilderActions from '../../state/query-builder/query-builder.actions';
import * as QueryBuilderSelectors from '../../state/query-builder/query-builder.selectors';

@Component({
  selector: 'app-query-template',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    InputTextarea,
    CheckboxModule,
    TooltipModule,
    ProgressSpinnerModule,
    TagModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  templateUrl: './query-template.component.html',
  styleUrls: ['./query-template.component.scss']
})
export class QueryTemplateComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Observables
  templates$: Observable<QueryTemplate[]>;
  publicTemplates$: Observable<QueryTemplate[]>;
  privateTemplates$: Observable<QueryTemplate[]>;
  templatesLoading$: Observable<boolean>;
  templateCreating$: Observable<boolean>;
  templateDeleting$: Observable<boolean>;
  templateExecuting$: Observable<boolean>;
  selectedTemplateDetail$: Observable<QueryTemplate | null>;

  // Dialog states
  showCreateDialog = false;
  showExecuteDialog = false;

  // Forms
  createTemplateForm: FormGroup;
  executeTemplateForm: FormGroup;

  // Selected template for execution
  selectedTemplate: QueryTemplate | null = null;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private confirmationService: ConfirmationService
  ) {
    // Initialize observables
    this.templates$ = this.store.select(QueryBuilderSelectors.selectAllTemplates);
    this.publicTemplates$ = this.store.select(QueryBuilderSelectors.selectPublicTemplates);
    this.privateTemplates$ = this.store.select(QueryBuilderSelectors.selectPrivateTemplates);
    this.templatesLoading$ = this.store.select(QueryBuilderSelectors.selectTemplatesLoading);
    this.templateCreating$ = this.store.select(QueryBuilderSelectors.selectTemplateCreating);
    this.templateDeleting$ = this.store.select(QueryBuilderSelectors.selectTemplateDeleting);
    this.templateExecuting$ = this.store.select(QueryBuilderSelectors.selectTemplateExecuting);
    this.selectedTemplateDetail$ = this.store.select(QueryBuilderSelectors.selectSelectedTemplateDetail);

    // Initialize create template form
    this.createTemplateForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      dataSource: ['', Validators.required],
      sqlTemplate: ['', Validators.required],
      isPublic: [false]
    });

    // Initialize execute template form (will be built dynamically)
    this.executeTemplateForm = this.fb.group({});
  }

  ngOnInit(): void {
    // Load templates
    this.store.dispatch(QueryBuilderActions.loadTemplates());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Template Creation
   */

  openCreateDialog(): void {
    this.createTemplateForm.reset({ isPublic: false });
    this.showCreateDialog = true;
  }

  closeCreateDialog(): void {
    this.showCreateDialog = false;
    this.createTemplateForm.reset();
  }

  createTemplate(): void {
    if (this.createTemplateForm.invalid) {
      this.createTemplateForm.markAllAsTouched();
      return;
    }

    const formValue = this.createTemplateForm.value;

    const request: CreateTemplateRequest = {
      name: formValue.name,
      description: formValue.description,
      dataSource: formValue.dataSource,
      sqlTemplate: formValue.sqlTemplate,
      isPublic: formValue.isPublic,
      parameters: [] // Could be extended to support parameter definition
    };

    this.store.dispatch(QueryBuilderActions.createTemplate({ request }));

    // Close dialog after dispatch
    this.closeCreateDialog();
  }

  /**
   * Template Execution
   */

  openExecuteDialog(template: QueryTemplate): void {
    this.selectedTemplate = template;
    this.buildExecuteForm(template);
    this.showExecuteDialog = true;
  }

  closeExecuteDialog(): void {
    this.showExecuteDialog = false;
    this.selectedTemplate = null;
    this.executeTemplateForm = this.fb.group({});
  }

  buildExecuteForm(template: QueryTemplate): void {
    const formControls: any = {};

    if (template.parameters && template.parameters.length > 0) {
      template.parameters.forEach(param => {
        const validators = param.isRequired ? [Validators.required] : [];
        formControls[param.name || ''] = [param.defaultValue || null, validators];
      });
    }

    this.executeTemplateForm = this.fb.group(formControls);
  }

  executeTemplate(): void {
    if (this.executeTemplateForm.invalid) {
      this.executeTemplateForm.markAllAsTouched();
      return;
    }

    if (!this.selectedTemplate || !this.selectedTemplate.id) {
      return;
    }

    const parameters = this.executeTemplateForm.value;

    const request: TemplateExecutionRequest = {
      parameters
    };

    this.store.dispatch(QueryBuilderActions.executeTemplate({
      templateId: this.selectedTemplate.id,
      request
    }));

    // Close dialog after dispatch
    this.closeExecuteDialog();
  }

  /**
   * Template Deletion
   */

  deleteTemplate(template: QueryTemplate): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the template "${template.name}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (template.id) {
          this.store.dispatch(QueryBuilderActions.deleteTemplate({
            templateId: template.id
          }));
        }
      }
    });
  }

  /**
   * Template Selection
   */

  selectTemplate(template: QueryTemplate): void {
    if (template.id) {
      this.store.dispatch(QueryBuilderActions.selectTemplate({
        templateId: template.id
      }));
      this.store.dispatch(QueryBuilderActions.loadTemplateDetail({
        templateId: template.id
      }));
    }
  }

  /**
   * Refresh Templates
   */

  refreshTemplates(): void {
    this.store.dispatch(QueryBuilderActions.loadTemplates());
  }

  /**
   * Get parameter input type based on data type
   */

  getParameterInputType(param: TemplateParameter): string {
    switch (param.dataType?.toLowerCase()) {
      case 'number':
      case 'integer':
      case 'decimal':
        return 'number';
      case 'date':
        return 'date';
      case 'datetime':
        return 'datetime-local';
      case 'boolean':
        return 'checkbox';
      default:
        return 'text';
    }
  }

  /**
   * Format date for display
   */

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  }

  /**
   * Get visibility tag severity
   */

  getVisibilityTagSeverity(isPublic: boolean): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    return isPublic ? 'success' : 'info';
  }

  /**
   * Get visibility tag label
   */

  getVisibilityTagLabel(isPublic: boolean): string {
    return isPublic ? 'Public' : 'Private';
  }
}
