import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-crew-detail',
  templateUrl: './crew-detail.component.html',
  styleUrls: ['./crew-detail.component.scss']
})
export class CrewDetailComponent implements OnInit, OnDestroy {
  crewId: string | null = null;
  crew: any = null;
  members: any[] = [];
  currentAssignments: any[] = [];
  pastAssignments: any[] = [];
  activeTab = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.crewId = params.get('id');
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  editCrew(): void {
    this.router.navigate(['field-resource-management', 'crews', this.crewId, 'edit']);
  }

  back(): void {
    this.router.navigate(['field-resource-management', 'crews']);
  }
}
