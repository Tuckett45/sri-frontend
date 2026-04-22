import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { JobTemplate } from '../../../models/job-template.model';
import { SkillLevel } from '../../../models/technician.model';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import * as JobActions from '../../../state/jobs/job.actions';

@Component({
  selector: 'app-job-template-manager',
  templateUrl: './job-template-manager.component.html',
  styleUrls: ['./job-template-manager.component.scss']
})
export class JobTemplateManagerComponent implements OnInit {
  displayedColumns: string[] = ['name', 'jobType', 'requiredSkills', 'estimatedHours', 'crewSize', 'actions'];
  dataSource = new MatTableDataSource<JobTemplate>();
  templates$!: Observable<JobTemplate[]>;

  constructor(
    private store: Store,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Load templates from state
    // this.templates$ = this.store.select(selectJobTemplates);
    // this.templates$.subscribe(templates => {
    //   this.dataSource.data = templates;
    // });
    
    // Mock data for demonstration
    this.dataSource.data = [
      {
        id: '1',
        name: 'Standard Installation',
        jobType: 'Install',
        requiredSkills: [
          { id: 's1', name: 'Cat6', category: 'Cabling', level: SkillLevel.Intermediate },
          { id: 's2', name: 'OSHA10', category: 'Safety', level: SkillLevel.Intermediate }
        ],
        estimatedHours: 8,
        crewSize: 2,
        scopeDescription: 'Standard ATLAS system installation',
        priority: 'Normal',
        createdBy: 'admin',
        createdAt: new Date()
      }
    ];
  }

  onCreateTemplate(): void {
    // Open template form dialog
    // const dialogRef = this.dialog.open(JobTemplateFormDialogComponent, {
    //   width: '600px',
    //   data: { mode: 'create' }
    // });
    
    // dialogRef.afterClosed().subscribe(result => {
    //   if (result) {
    //     this.store.dispatch(JobActions.createJobTemplate({ template: result }));
    //   }
    // });
  }

  onEditTemplate(template: JobTemplate): void {
    // Open template form dialog with existing data
    // const dialogRef = this.dialog.open(JobTemplateFormDialogComponent, {
    //   width: '600px',
    //   data: { mode: 'edit', template }
    // });
    
    // dialogRef.afterClosed().subscribe(result => {
    //   if (result) {
    //     this.store.dispatch(JobActions.updateJobTemplate({ 
    //       id: template.id, 
    //       template: result 
    //     }));
    //   }
    // });
  }

  onDeleteTemplate(template: JobTemplate): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Template',
        message: `Are you sure you want to delete the template "${template.name}"?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        // this.store.dispatch(JobActions.deleteJobTemplate({ id: template.id }));
      }
    });
  }

  onPreviewTemplate(template: JobTemplate): void {
    // Open preview dialog
    // this.dialog.open(JobTemplatePreviewDialogComponent, {
    //   width: '600px',
    //   data: { template }
    // });
  }

  onCreateJobFromTemplate(template: JobTemplate): void {
    // Navigate to job form with template pre-populated
    // this.router.navigate(['/field-resource-management/jobs/new'], {
    //   queryParams: { templateId: template.id }
    // });
  }

  getSkillNames(skills: any[]): string {
    return skills.map(s => s.name).join(', ');
  }
}
