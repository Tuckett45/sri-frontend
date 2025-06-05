import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { OspCoordinatorService, CoordinatorStat } from 'src/app/services/osp-coordinator.service';
import * as Papa from 'papaparse';
import { OspCoordinatorModalComponent } from '../modals/osp-coordinator-modal/osp-coordinator-modal.component';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';

@Component({
  selector: 'app-osp-coordinator-tracker',
  templateUrl: './osp-coordinator-tracker.component.html',
  styleUrls: ['./osp-coordinator-tracker.component.scss']
})
export class OspCoordinatorTrackerComponent implements OnInit {
  statCards: CoordinatorStat[] = [];
  displayedColumns: string[] = ['description', 'value', 'actions'];
  dataSource = new MatTableDataSource<CoordinatorStat>();

  constructor(
    private coordinatorService: OspCoordinatorService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.coordinatorService.getStats().subscribe(stats => this.statCards = stats);
    this.coordinatorService.getMetrics().subscribe(metrics => this.dataSource.data = metrics);
  }

  openAddEditModal(metric?: CoordinatorStat): void {
    const dialogRef = this.dialog.open(OspCoordinatorModalComponent, {
      width: '400px',
      data: metric || null
    });

    dialogRef.afterClosed().subscribe((result: CoordinatorStat) => {
      if (result) {
        if (metric) {
          this.coordinatorService.updateMetric(result).subscribe();
        } else {
          this.coordinatorService.addMetric(result).subscribe();
        }
      }
    });
  }

  editMetric(metric: CoordinatorStat): void {
    this.openAddEditModal(metric);
  }

  openDeleteConfirmationDialog(metric: CoordinatorStat): void {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.coordinatorService.deleteMetric(metric.id).subscribe();
      }
    });
  }

  importFromCSV(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[];
          rows.forEach(row => {
            const metric: CoordinatorStat = {
              description: row['description'] || row['Description'] || '',
              value: Number(row['value'] || row['Value'] || 0),
              id: 0
            };
            this.coordinatorService.addMetric(metric).subscribe();
          });
        }
      });
    }
  }
}
