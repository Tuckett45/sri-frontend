import { Component, OnInit } from '@angular/core';
import { TimeCardApiService } from '../../../services/timecard-api.service';
import { TimeCardDashboardStats } from '../../../models/timecard.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-timecard-dashboard',
  templateUrl: './timecard-dashboard.component.html',
  styleUrls: ['./timecard-dashboard.component.scss']
})
export class TimeCardDashboardComponent implements OnInit {
  stats: TimeCardDashboardStats | null = null;
  loading = false;

  constructor(
    private timecardApi: TimeCardApiService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  loadDashboardStats(): void {
    this.loading = true;
    this.timecardApi.getDashboardStats().subscribe({
      next: stats => {
        this.stats = stats;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load dashboard statistics');
        this.loading = false;
      }
    });
  }
}

