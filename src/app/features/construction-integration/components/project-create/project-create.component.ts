import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { Actions, ofType } from '@ngrx/effects';

import { ProjectCategory } from '../../models/construction.models';
import * as ProjectActions from '../../state/projects/project.actions';
import { selectProjectsLoading, selectProjectsError } from '../../state/projects/project.selectors';

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './project-create.component.html',
  styleUrls: ['./project-create.component.scss']
})
export class ProjectCreateComponent implements OnInit, OnDestroy {
  projectForm!: FormGroup;
  loading$ = this.store.select(selectProjectsLoading);
  error$ = this.store.select(selectProjectsError);

  readonly categories = [
    { value: ProjectCategory.BULK_LABOR_SUPPORT, label: 'Bulk Labor Support' },
    { value: ProjectCategory.HYPERSCALE_DEPLOYMENT, label: 'Hyperscale Deployment' }
  ];

  private subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private actions$: Actions
  ) {}

  ngOnInit(): void {
    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      clientName: ['', Validators.required],
      location: ['', Validators.required],
      category: ['', Validators.required]
    });

    this.subscription.add(
      this.actions$.pipe(ofType(ProjectActions.createProjectSuccess)).subscribe(() => {
        this.router.navigate(['/construction/forecast']);
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

    this.store.dispatch(ProjectActions.createProject({ project: this.projectForm.value }));
  }

  hasError(field: string): boolean {
    const control = this.projectForm.get(field);
    return !!(control && control.invalid && control.touched);
  }
}
