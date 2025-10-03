import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';
import { DeploymentProject, DeploymentStatus } from '../../models/deployment.models';
import { DeploymentService } from '../../services/deployment.service';

interface DeploymentFilter {
  status?: DeploymentStatus | null;
  vendor?: string | null;
  dataCenter?: string | null;
}

@Component({
  selector: 'ark-deployment-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    TableModule,
    TagModule,
    ProgressBarModule,
    DialogModule,
    CardModule,
  ],
  templateUrl: './deployment-dashboard.component.html',
  styleUrls: ['./deployment-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeploymentDashboardComponent implements OnInit {
  protected readonly statusOptions = Object.values(DeploymentStatus);
  private readonly severityMap = new Map<DeploymentStatus, "success" | "secondary" | "info" | "warn" | "danger" | "contrast">([
    [DeploymentStatus.Planned, "secondary"],
    [DeploymentStatus.Survey, "secondary"],
    [DeploymentStatus.Inventory, "secondary"],
    [DeploymentStatus.Install, "warn"],
    [DeploymentStatus.Cabling, "warn"],
    [DeploymentStatus.Labeling, "info"],
    [DeploymentStatus.Handoff, "info"],
    [DeploymentStatus.Complete, "success"],
  ]);
  protected readonly filterForm = inject(FormBuilder).nonNullable.group({
    status: [''],
    vendor: [''],
    dataCenter: [''],
  });

  protected readonly deployments = signal<DeploymentProject[]>([]);
  protected readonly showFilters = signal(true);
  protected readonly filters = signal<DeploymentFilter>({});
  protected readonly filtered = computed(() => {
    const { status, vendor, dataCenter } = this.filters();
    return this.deployments().filter(project => {
      const matchesStatus = status ? project.status === status : true;
      const matchesVendor = vendor ? project.vendor?.toLowerCase().includes(vendor.toLowerCase()) : true;
      const matchesDc = dataCenter ? project.dataCenter?.toLowerCase().includes(dataCenter.toLowerCase()) : true;
      return matchesStatus && matchesVendor && matchesDc;
    });
  });

  protected showCreateDialog = signal(false);

  private readonly deploymentService = inject(DeploymentService);

  ngOnInit(): void {
    this.filterForm.valueChanges.subscribe(value => this.filters.set(value as DeploymentFilter));
    this.filters.set(this.filterForm.getRawValue() as DeploymentFilter);
    this.loadDeployments();
  }

  protected loadDeployments(): void {
    this.deploymentService.list().subscribe(projects => this.deployments.set(projects));
  }

  protected progressFor(status: DeploymentStatus): number {
    const index = this.statusOptions.indexOf(status);
    return index >= 0 ? Math.round(((index + 1) / this.statusOptions.length) * 100) : 0;
  }

  protected statusSeverity(status: DeploymentStatus): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" {
    return this.severityMap.get(status) ?? "secondary";
  }

  protected toggleFilters(): void {
    this.showFilters.update(visible => !visible);
  }

  protected onCreateDeployment(): void {
    // TODO: wire modal and form for project creation
    this.showCreateDialog.set(false);
  }
}



