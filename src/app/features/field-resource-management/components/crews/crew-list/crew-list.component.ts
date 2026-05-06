import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-crew-list',
  templateUrl: './crew-list.component.html',
  styleUrls: ['./crew-list.component.scss']
})
export class CrewListComponent implements OnInit, OnDestroy {
  displayedColumns = ['name', 'leadTechnician', 'memberCount', 'currentAssignment', 'status', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  searchTerm = '';
  private destroy$ = new Subject<void>();

  constructor(private store: Store, private router: Router) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilter(): void {
    this.dataSource.filter = this.searchTerm.trim().toLowerCase();
  }

  navigateToCreate(): void {
    this.router.navigate(['field-resource-management', 'crews', 'new']);
  }

  viewCrew(id: string): void {
    this.router.navigate(['field-resource-management', 'crews', id]);
  }

  editCrew(id: string): void {
    this.router.navigate(['field-resource-management', 'crews', id, 'edit']);
  }
}
