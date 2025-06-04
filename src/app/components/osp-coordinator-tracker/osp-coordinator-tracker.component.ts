import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { OspCoordinatorService, CoordinatorStat } from 'src/app/services/osp-coordinator.service';
import * as Papa from 'papaparse';

@Component({
  selector: 'app-osp-coordinator-tracker',
  templateUrl: './osp-coordinator-tracker.component.html',
  styleUrls: ['./osp-coordinator-tracker.component.scss']
})
export class OspCoordinatorTrackerComponent implements OnInit {
  statCards: CoordinatorStat[] = [];
  displayedColumns: string[] = ['description', 'value'];
  dataSource = new MatTableDataSource<CoordinatorStat>();
  showAddForm = false;
  addForm: FormGroup;

  constructor(private coordinatorService: OspCoordinatorService,
              private fb: FormBuilder) {
    this.addForm = this.fb.group({
      description: ['', Validators.required],
      value: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.coordinatorService.getStats().subscribe(stats => this.statCards = stats);
    this.coordinatorService.getMetrics().subscribe(metrics => this.dataSource.data = metrics);
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
  }

  onAddSubmit(): void {
    if (this.addForm.valid) {
      this.coordinatorService.addMetric(this.addForm.value).subscribe(() => {
        this.addForm.reset({ description: '', value: 0 });
        this.showAddForm = false;
      });
    }
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
              value: Number(row['value'] || row['Value'] || 0)
            };
            this.coordinatorService.addMetric(metric).subscribe();
          });
        }
      });
    }
  }
}
