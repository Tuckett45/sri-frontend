import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { Actions, ofType } from '@ngrx/effects';

import { IssueSeverity, Project } from '../../models/construction.models';
import * as IssueActions from '../../state/issues/issue.actions';
import * as ProjectActions from '../../state/projects/project.actions';
import { selectIssuesSaving, selectIssuesError } from '../../state/issues/issue.selectors';
import { selectAllProjects } from '../../state/projects/project.selectors';

@Component({
  selector: 'app-issue-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './issue-create.component.html',
  styleUrls: ['./issue-create.component.scss']
})
export class IssueCreateComponent implements OnInit, OnDestroy {
  issueForm!: FormGroup;
  saving$ = this.store.select(selectIssuesSaving);
  error$ = this.store.select(selectIssuesError);
  projects$!: Observable<Project[]>;

  readonly severities = [
    { value: IssueSeverity.LOW, label: 'Low' },
    { value: IssueSeverity.MEDIUM, label: 'Medium' },
    { value: IssueSeverity.HIGH, label: 'High' },
    { value: IssueSeverity.CRITICAL, label: 'Critical' }
  ];

  private subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private actions$: Actions
  ) {}

  ngOnInit(): void {
    this.store.dispatch(ProjectActions.loadProjects());
    this.projects$ = this.store.select(selectAllProjects);

    this.issueForm = this.fb.group({
      projectId: ['', Validators.required],
      description: ['', Validators.required],
      severity: ['', Validators.required]
    });

    this.subscription.add(
      this.actions$.pipe(ofType(IssueActions.createIssueSuccess)).subscribe(() => {
        this.router.navigate(['/construction/issues']);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onSubmit(): void {
    if (this.issueForm.invalid) {
      this.issueForm.markAllAsTouched();
      return;
    }
    this.store.dispatch(IssueActions.createIssue({ issue: this.issueForm.value }));
  }

  hasError(field: string): boolean {
    const control = this.issueForm.get(field);
    return !!(control && control.invalid && control.touched);
  }
}
