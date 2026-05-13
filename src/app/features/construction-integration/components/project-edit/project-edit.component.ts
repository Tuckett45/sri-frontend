import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Actions, ofType } from '@ngrx/effects';

import { ProjectCategory } from '../../models/construction.models';
import * as ProjectActions from '../../state/projects/project.actions';
import { selectSelectedProject, selectProjectsLoading, selectProjectsError } from '../../state/projects/project.selectors';

@Component({
  selector: 'app-project-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './project-edit.component.html',
  styleUrls: ['./project-edit.component.scss']
})
export class ProjectEditComponent implements OnInit, OnDestroy {
  projectForm!: FormGroup;
  loading$ = this.store.select(selectProjectsLoading);
  error$ = this.store.select(selectProjectsError);

  readonly categories = [
    { value: ProjectCategory.BULK_LABOR_SUPPORT, label: 'Bulk Labor Support' },
    { value: ProjectCategory.HYPERSCALE_DEPLOYMENT, label: 'Hyperscale Deployment' }
  ];

  private projectId = '';
  private subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private actions$: Actions
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId') || '';

    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      clientName: ['', Validators.required],
      location: ['', Validators.required],
      category: ['', Validators.required]
    });

    this.store.dispatch(ProjectActions.selectProject({ id: this.projectId }));
    this.store.dispatch(ProjectActions.loadProject({ id: this.projectId }));

    this.subscription.add(
      this.store.select(selectSelectedProject).pipe(
        filter(project => !!project)
      ).subscribe(project => {
        if (project) {
          this.projectForm.patchValue({
            name: project.name,
            clientName: project.clientName,
            location: project.location,
            category: project.category
          });
        }
      })
    );

    this.subscription.add(
      this.actions$.pipe(ofType(ProjectActions.updateProjectSuccess)).subscribe(() => {
        this.router.navigate(['/construction/projects', this.projectId]);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    this.store.dispatch(ProjectActions.updateProject({
      id: this.projectId,
      project: this.projectForm.value
    }));
  }

  hasError(field: string): boolean {
    const control = this.projectForm.get(field);
    return !!(control && control.invalid && control.touched);
  }
}
