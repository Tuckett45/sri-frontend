import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { DeploymentProject, DeploymentStatus } from '../../models/deployment.models';
import { DeploymentService } from '../../services/deployment.service';
import { StartDeploymentProgressPayload } from '../../models/deployment-progress.model';
import {
  StartDeploymentModalComponent,
  StartDeploymentDialogData,
  StartDeploymentDialogResult,
} from 'src/app/components/modals/start-deployment-modal/start-deployment-modal.component';

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
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TableModule,
    TagModule,
    ProgressBarModule,
  ],
  templateUrl: './deployment-dashboard.component.html',
  styleUrls: ['./deployment-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeploymentDashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly deploymentService = inject(DeploymentService);

  protected readonly statusOptions = Object.values(DeploymentStatus);
  private readonly severityMap = new Map<DeploymentStatus, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'>([
    [DeploymentStatus.Planned, 'secondary'],
    [DeploymentStatus.Survey, 'secondary'],
    [DeploymentStatus.Inventory, 'secondary'],
    [DeploymentStatus.Install, 'warn'],
    [DeploymentStatus.Cabling, 'warn'],
    [DeploymentStatus.Labeling, 'info'],
    [DeploymentStatus.Handoff, 'info'],
    [DeploymentStatus.Complete, 'success'],
  ]);

  private readonly phaseIndexByStatus: Record<DeploymentStatus, number> = {
    [DeploymentStatus.Planned]: 0,
    [DeploymentStatus.Survey]: 0,
    [DeploymentStatus.Inventory]: 1,
    [DeploymentStatus.Install]: 2,
    [DeploymentStatus.Cabling]: 3,
    [DeploymentStatus.Labeling]: 4,
    [DeploymentStatus.Handoff]: 5,
    [DeploymentStatus.Complete]: 5,
  };

  protected readonly filterForm = this.fb.nonNullable.group({
    status: [''],
    vendor: [''],
    dataCenter: [''],
  });

  protected readonly deployments = signal<DeploymentProject[]>([]);
  protected readonly showFilters = signal(true);
  private readonly draftProgress = signal<Record<string, StartDeploymentProgressPayload>>({});
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

  protected readonly statusDescriptions: Record<DeploymentStatus, string> = {
    [DeploymentStatus.Planned]: 'Planned kickoff pending readiness checks',
    [DeploymentStatus.Survey]: 'Site survey activities underway',
    [DeploymentStatus.Inventory]: 'Receiving & inventory in progress',
    [DeploymentStatus.Install]: 'Hardware installation active',
    [DeploymentStatus.Cabling]: 'Cabling standards being applied',
    [DeploymentStatus.Labeling]: 'Labeling and documentation wrapping up',
    [DeploymentStatus.Handoff]: 'Final validation and handoff underway',
    [DeploymentStatus.Complete]: 'Deployment closed and fully handed off',
  } satisfies Record<DeploymentStatus, string>;

  ngOnInit(): void {
    this.filterForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(raw => {
        this.filters.set({
          status: (raw.status as DeploymentStatus | '') || null,
          vendor: raw.vendor?.trim() || null,
          dataCenter: raw.dataCenter?.trim() || null,
        });
      });

    // Prime the filters with the initial form state.
    const initial = this.filterForm.getRawValue();
    this.filters.set({
      status: (initial.status as DeploymentStatus | '') || null,
      vendor: initial.vendor?.trim() || null,
      dataCenter: initial.dataCenter?.trim() || null,
    });

    const demo: DeploymentProject[] = [
      {
        id: 'demo-001',
        name: 'Chicago Edge Expansion',
        dataCenter: 'Chicago RDC',
        vendor: 'Westward Infrastructure',
        status: DeploymentStatus.Survey,
        startDate: '2024-09-15',
        targetCompletion: '2024-11-30',
      },
      {
        id: 'demo-002',
        name: 'Phoenix Fiber Retrofit',
        dataCenter: 'Phoenix Core',
        vendor: 'Copperline Cabling',
        status: DeploymentStatus.Install,
        startDate: '2024-10-01',
        targetCompletion: '2024-12-15',
      },
      {
        id: 'demo-003',
        name: 'Newark Inventory Staging',
        dataCenter: 'Newark Hub',
        vendor: 'BrightLine Logistics',
        status: DeploymentStatus.Inventory,
        startDate: '2024-08-10',
        targetCompletion: '2024-10-05',
      },
      {
        id: 'demo-004',
        name: 'Austin Labeling Refresh',
        dataCenter: 'Austin Edge',
        vendor: 'LabelCraft Services',
        status: DeploymentStatus.Labeling,
        startDate: '2024-09-22',
        targetCompletion: '2024-11-12',
      },
      {
        id: 'demo-005',
        name: 'Nashville Hand-Off',
        dataCenter: 'Nashville RDC',
        vendor: 'Equinix Field Services',
        status: DeploymentStatus.Handoff,
        startDate: '2024-11-02',
        targetCompletion: '2025-01-05',
      },
    ];

    this.deploymentService
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: projects => {
          if (projects?.length) {
            this.deployments.set(projects);
          } else {
            this.deployments.set(demo);
          }
        },
        error: () => this.deployments.set(demo),
      });
  }

  protected describeStatus(status: DeploymentStatus): string {
    return this.statusDescriptions[status];
  }

  protected progressFor(status: DeploymentStatus): number {
    const index = this.statusOptions.indexOf(status);
    return index >= 0 ? Math.round(((index + 1) / this.statusOptions.length) * 100) : 0;
  }

  protected statusSeverity(status: DeploymentStatus): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    return this.severityMap.get(status) ?? 'secondary';
  }

  protected toggleFilters(): void {
    this.showFilters.update(visible => !visible);
  }

  protected openDeploymentWizard(): void {
    const dialogRef = this.dialog.open<
      StartDeploymentModalComponent,
      StartDeploymentDialogData,
      StartDeploymentDialogResult
    >(StartDeploymentModalComponent, {
      width: '920px',
      maxWidth: '95vw',
      data: {
        progress: null,
      },
    });
    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed())
      .subscribe(result => this.handleWizardResult(null, result ?? undefined));
  }

  protected openDeployment(project: DeploymentProject): void {
    const initialPhaseIndex = this.phaseIndexByStatus[project.status] ?? 0;
    const dialogRef = this.dialog.open<
      StartDeploymentModalComponent,
      StartDeploymentDialogData,
      StartDeploymentDialogResult
    >(StartDeploymentModalComponent, {
      width: '920px',
      maxWidth: '95vw',
      data: {
        project,
        initialPhaseIndex,
        progress: this.getCachedProgress(project.id),
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed())
      .subscribe(result => this.handleWizardResult(project, result ?? undefined));
  }

  private handleWizardResult(
    project: DeploymentProject | null,
    result?: StartDeploymentDialogResult | undefined
  ): void {
    if (!result || result.action !== 'save') {
      return;
    }

    const targetProjectId = result.progress.projectId ?? project?.id ?? null;

    const normalizedProgress = this.normalizeProgressPayload(result.progress, targetProjectId);
    const cacheKey = targetProjectId ?? '__new';
    this.draftProgress.update(current => ({ ...current, [cacheKey]: normalizedProgress }));

    if (targetProjectId) {
      this.deploymentService
        .saveProgress(targetProjectId, normalizedProgress)
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: () => console.debug('Deployment progress saved', targetProjectId, normalizedProgress),
          error: error => console.error('Failed to save deployment progress', error),
        });
    } else {
      console.debug('Captured deployment wizard progress (no project id)', normalizedProgress);
    }
  }

  private getCachedProgress(projectId: string | null): StartDeploymentProgressPayload | null {
    const key = projectId ?? '__new';
    const cached = this.draftProgress()[key];
    if (!cached) {
      return null;
    }
    return this.normalizeProgressPayload(cached, cached.projectId ?? projectId ?? null);
  }

  private normalizeProgressPayload(
    progress: StartDeploymentProgressPayload,
    projectId: string | null
  ): StartDeploymentProgressPayload {
    const clonedPhaseTasks = Object.entries(progress.phaseTasks ?? {}).reduce(
      (acc, [phase, tasks]) => {
        acc[phase] = { ...tasks };
        return acc;
      },
      {} as Record<string, Record<string, boolean>>
    );

    return {
      ...progress,
      projectId,
      siteSurvey: {
        responses: progress.siteSurvey.responses.map(entry => ({ ...entry })),
      },
      phaseTasks: clonedPhaseTasks,
      submittedSiteSurvey: progress.submittedSiteSurvey
        ? {
            ...progress.submittedSiteSurvey,
            responses: progress.submittedSiteSurvey.responses.map(entry => ({ ...entry })),
          }
        : undefined,
    };
  }
}
