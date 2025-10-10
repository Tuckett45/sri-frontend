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
import { ToastrService } from 'ngx-toastr';
import { Deployment, DeploymentStatus } from '../../models/deployment.models';
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
  private readonly toastr = inject(ToastrService);
  private readonly wizardPhaseCount = 6; // mirrors the number of phases defined in the start deployment wizard

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

  protected readonly deployments = signal<Deployment[]>([]);
  protected readonly showFilters = signal(true);
  private readonly draftProgress = signal<Record<string, StartDeploymentProgressPayload>>({});
  protected readonly filters = signal<DeploymentFilter>({});

  protected readonly filtered = computed(() => {
    const { status, vendor, dataCenter } = this.filters();
    return this.deployments().filter(project => {
      const matchesStatus = status ? project.status === status : true;
      const matchesVendor = vendor ? project.vendorName?.toLowerCase().includes(vendor.toLowerCase()) : true;
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
      .pipe()
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

    const demo: Deployment[] = [
      {
        id: 'demo-001',
        name: 'Chicago Edge Expansion',
        dataCenter: 'Chicago RDC',
        vendorName: 'Westward Infrastructure',
        status: DeploymentStatus.Survey,
        startDate: '2024-09-15',
        targetHandoffDate: '2024-11-30',
      },
      {
        id: 'demo-002',
        name: 'Phoenix Fiber Retrofit',
        dataCenter: 'Phoenix Core',
        vendorName: 'Copperline Cabling',
        status: DeploymentStatus.Install,
        startDate: '2024-10-01',
        targetHandoffDate: '2024-12-15',
      },
      {
        id: 'demo-003',
        name: 'Newark Inventory Staging',
        dataCenter: 'Newark Hub',
        vendorName: 'BrightLine Logistics',
        status: DeploymentStatus.Inventory,
        startDate: '2024-08-10',
        targetHandoffDate: '2024-10-05',
      },
      {
        id: 'demo-004',
        name: 'Austin Labeling Refresh',
        dataCenter: 'Austin Edge',
        vendorName: 'LabelCraft Services',
        status: DeploymentStatus.Labeling,
        startDate: '2024-09-22',
        targetHandoffDate: '2024-11-12',
      },
      {
        id: 'demo-005',
        name: 'Nashville Hand-Off',
        dataCenter: 'Nashville RDC',
        vendorName: 'Equinix Field Services',
        status: DeploymentStatus.Handoff,
        startDate: '2024-11-02',
        targetHandoffDate: '2025-01-05',
      },
    ];

    this.deploymentService
      .list()
      .pipe()
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
      .pipe()
      .subscribe(result => this.handleWizardResult(null, result ?? undefined));
  }

  protected openDeployment(project: Deployment): void {
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
      .pipe()
      .subscribe(result => this.handleWizardResult(project, result ?? undefined));
  }

  private handleWizardResult(
    project: Deployment | null,
    result?: StartDeploymentDialogResult | undefined
  ): void {
    if (!result || result.action !== 'save') return;

    const deploymentId = project?.id ?? result.progress.projectId ?? null;
    const normalized = this.normalizeProgressPayload(result.progress, deploymentId);
    const cacheKey = deploymentId ?? '__new';
    this.draftProgress.update(curr => ({ ...curr, [cacheKey]: normalized }));

    if (!deploymentId) {
      this.toastr.info('Deployment wizard progress saved as a draft. Associate a project to sync it.');
      return;
    }

    const projectLabel = project?.name ?? 'deployment';
    const isWizardComplete = normalized.activePhaseIndex >= this.wizardPhaseCount - 1;

    this.deploymentService
      .saveProgress(deploymentId, normalized)
      .pipe()
      .subscribe({
        next: () => {
          const message = isWizardComplete
            ? `${projectLabel} wizard completed. Deployment is ready for the next phase.`
            : `Saved progress for ${projectLabel}.`;
          this.toastr.success(message);
        },
        error: (err) => {
          console.error('Failed to save progress', err);
          this.toastr.error('Failed to save deployment progress. Please try again.');
        },
      });
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
    deploymentId: string | null
  ): StartDeploymentProgressPayload {
    const clonedPhaseTasks = Object.entries(progress.phaseTasks ?? {}).reduce(
      (acc, [phase, tasks]) => { acc[phase] = { ...tasks }; return acc; },
      {} as Record<string, Record<string, boolean>>
    );

    return {
      ...progress,
      projectId: deploymentId, // keep if you need it for caching/UI; server will ignore it
      siteSurvey: { responses: progress.siteSurvey.responses.map(e => ({ ...e })) },
      receiving: progress.receiving
        ? { responses: progress.receiving.responses.map(e => ({ ...e, followUps: e.followUps?.map(f => ({ ...f })) ?? [] })) }
        : null, // <- prefer null over undefined
      phaseTasks: clonedPhaseTasks,
      submittedSiteSurvey: progress.submittedSiteSurvey
        ? { ...progress.submittedSiteSurvey, responses: progress.submittedSiteSurvey.responses.map(e => ({ ...e })) }
        : null, // <- prefer null over undefined
    };
  }

}
