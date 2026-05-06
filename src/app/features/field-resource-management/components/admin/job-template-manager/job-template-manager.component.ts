import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-job-template-manager',
  templateUrl: './job-template-manager.component.html',
  styleUrls: ['./job-template-manager.component.scss']
})
export class JobTemplateManagerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  templates: any[] = [];
  showForm = false;
  editingTemplate: any = null;
  searchQuery = '';
  displayedColumns = ['name', 'type', 'description', 'lastModified', 'actions'];
  templateForm!: FormGroup;

  templateTypes = ['Installation', 'Maintenance', 'Repair', 'Inspection', 'Survey'];

  get filteredTemplates(): any[] {
    if (!this.searchQuery) return this.templates;
    const q = this.searchQuery.toLowerCase();
    return this.templates.filter(t => t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q));
  }

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.templateForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      description: ['']
    });
  }

  openForm(template?: any): void {
    this.editingTemplate = template || null;
    if (template) {
      this.templateForm.patchValue(template);
    } else {
      this.templateForm.reset();
    }
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingTemplate = null;
    this.templateForm.reset();
  }

  onSubmit(): void {
    if (this.templateForm.valid) {
      const data = { ...this.templateForm.value, lastModified: new Date() };
      if (this.editingTemplate) {
        const idx = this.templates.indexOf(this.editingTemplate);
        this.templates[idx] = { ...this.editingTemplate, ...data };
      } else {
        this.templates = [{ ...data, id: Date.now() }, ...this.templates];
      }
      this.closeForm();
    }
  }

  deleteTemplate(template: any): void {
    this.templates = this.templates.filter(t => t !== template);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
