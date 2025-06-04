import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { OspCoordinatorService, CoordinatorStat } from 'src/app/services/osp-coordinator.service';

@Component({
  selector: 'app-osp-coordinator-tracker',
  templateUrl: './osp-coordinator-tracker.component.html',
  styleUrls: ['./osp-coordinator-tracker.component.scss']
})
export class OspCoordinatorTrackerComponent implements OnInit {
  statCards: CoordinatorStat[] = [];
  displayedColumns: string[] = ['description', 'value'];
  dataSource = new MatTableDataSource<CoordinatorStat>();

  constructor(private coordinatorService: OspCoordinatorService) {}

  ngOnInit(): void {
    this.coordinatorService.getStats().subscribe(stats => this.statCards = stats);
    this.coordinatorService.getMetrics().subscribe(metrics => this.dataSource.data = metrics);
  }
}
