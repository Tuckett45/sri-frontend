import {
  Component,
  OnInit,
  OnDestroy,
  Input} from '@angular/core';
import { Router } from '@angular/router';

interface PipelineStage {
  name: string;
  count: number;
  color: string;
}

@Component({
  selector: 'app-quote-pipeline-dashboard',
  templateUrl: './quote-pipeline-dashboard.component.html',
  styleUrls: ['./quote-pipeline-dashboard.component.scss']
})
export class QuotePipelineDashboardComponent implements OnInit, OnDestroy {
  @Input() compact = false;

  stages: PipelineStage[] = [
    { name: 'Intake', count: 4, color: '#9e9e9e' },
    { name: 'Estimating', count: 3, color: '#2196f3' },
    { name: 'BOM Review', count: 2, color: '#ff9800' },
    { name: 'Assembly', count: 1, color: '#9c27b0' },
    { name: 'Delivery', count: 2, color: '#4caf50' }
  ];

  get totalQuotes(): number {
    return this.stages.reduce((sum, s) => sum + s.count, 0);
  }

  constructor(private router: Router) {}
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }
  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }

  viewAll(): void {
    this.router.navigate(['/field-resource-management/quotes']);
  }
}
