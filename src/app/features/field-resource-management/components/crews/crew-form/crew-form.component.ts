import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-crew-form',
  templateUrl: './crew-form.component.html',
  styleUrls: ['./crew-form.component.scss']
})
export class CrewFormComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isEdit = false;
  crewId: string | null = null;
  technicians: any[] = [];
  loading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      leadTechnicianId: ['', Validators.required],
      memberIds: [[]]
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.crewId = params.get('id');
      this.isEdit = !!this.crewId;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    if (this.form.valid) {
      // dispatch create or update action
      this.router.navigate(['field-resource-management', 'crews']);
    }
  }

  cancel(): void {
    this.router.navigate(['field-resource-management', 'crews']);
  }
}
