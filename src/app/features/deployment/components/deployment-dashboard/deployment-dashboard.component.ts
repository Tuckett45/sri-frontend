import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
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
import { User } from 'src/app/models/user.model';
import { AuthService } from 'src/app/services/auth.service';

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
  user!: User;
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly deploymentService = inject(DeploymentService);
  private readonly wizardPhaseCount = 6;

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

  private readonly statusByPhaseIndex: DeploymentStatus[] = [
    DeploymentStatus.Survey,
    DeploymentStatus.Inventory,
    DeploymentStatus.Install,
    DeploymentStatus.Cabling,
    DeploymentStatus.Labeling,
    DeploymentStatus.Handoff,
  ];

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

  constructor(
      private toastr: ToastrService,
      public authService: AuthService,
    ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
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
            void this.refreshProgressForProjects(projects);
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

  protected progressFor(project: Deployment): number {
    const explicit = project.progressPercent;
    if (typeof explicit === 'number' && Number.isFinite(explicit)) {
      return Math.max(0, Math.min(100, Math.round(explicit)));
    }
    return this.progressFromStatus(project.status);
  }

  private progressFromStatus(status: DeploymentStatus): number {
    const index = this.statusOptions.indexOf(status);
    return index >= 0 ? Math.round(((index + 1) / this.statusOptions.length) * 100) : 0;
  }

  private statusFromPhaseIndex(phaseIndex: number | null | undefined): DeploymentStatus {
    if (typeof phaseIndex !== 'number' || !Number.isFinite(phaseIndex)) {
      return DeploymentStatus.Planned;
    }
    const clamped = Math.max(0, Math.min(Math.floor(phaseIndex), this.statusByPhaseIndex.length - 1));
    return this.statusByPhaseIndex[clamped] ?? DeploymentStatus.Planned;
  }

  protected statusSeverity(status: DeploymentStatus): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    return this.severityMap.get(status) ?? 'secondary';
  }

  private calculateProgressPercentage(progress: StartDeploymentProgressPayload | null): number {
    if (!progress) return 0;
    let total = 0;
    let completed = 0;

    const siteResponses = progress.siteSurvey?.responses ?? [];
    total += siteResponses.length;
    completed += siteResponses.filter(response => response.status !== null && response.status !== undefined).length;

    const receivingResponses = progress.receiving?.responses ?? [];
    receivingResponses.forEach(response => {
      total += 1;
      switch (response.controlType) {
        case 'radio':
          if (response.status) completed += 1;
          break;
        case 'checkbox':
          if (response.checked) completed += 1;
          break;
        case 'text': {
          const answer = response.textResponse ?? response.notes ?? '';
          if (typeof answer === 'string' && answer.trim().length) {
            completed += 1;
          }
          break;
        }
        default: {
          const status = (response as any).status;
          if (status) completed += 1;
        }
      }
    });

    Object.values(progress.phaseTasks ?? {}).forEach(taskGroup => {
      Object.values(taskGroup ?? {}).forEach(flag => {
        total += 1;
        if (flag) completed += 1;
      });
    });

    if (total === 0) return 0;
    return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
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
      .subscribe(result => { void this.handleNewDeploymentResult(result ?? undefined); });
  }

  protected async openDeployment(project: Deployment): Promise<void> {
    const initialPhaseIndex = this.phaseIndexByStatus[project.status] ?? 0;
    let progress = this.getCachedProgress(project.id);

    try {
      const remote = await firstValueFrom(this.deploymentService.getProgress(project.id));
      if (remote) {
        progress = this.normalizeProgressPayload(remote, remote.projectId ?? project.id ?? null);
        if (progress) {
          this.cacheProgress(project.id, progress);
        }
      }
    } catch (error) {
      console.warn('Unable to load saved deployment progress, falling back to cached copy.', error);
      if (!progress) {
        this.toastr.warning('Unable to load saved deployment progress.', 'Progress unavailable', { timeOut: 4000 });
      }
    }

    if (progress) {
      const percent = this.calculateProgressPercentage(progress);
      const status =
        project.status === DeploymentStatus.Complete
          ? DeploymentStatus.Complete
          : this.statusFromPhaseIndex(progress.activePhaseIndex);
      this.updateDeploymentProgress(project.id, percent, status);
    }

    this.openDeploymentDialog(project, initialPhaseIndex, progress);
  }

  private async handleNewDeploymentResult(
    result?: StartDeploymentDialogResult | undefined
  ): Promise<void> {
    if (!result || (result.action !== 'save' && result.action !== 'complete')) return;
    const metadata = result.metadata ?? null;
    const isCompleteAction = result.action === 'complete';
    const phaseStatus = isCompleteAction
      ? DeploymentStatus.Complete
      : this.statusFromPhaseIndex(result.progress?.activePhaseIndex ?? null);
    const provisionalProject: Deployment | null = metadata
      ? {
          id: result.progress.projectId ?? '',
          name: metadata.name,
          dataCenter: metadata.dataCenter,
          vendorName: metadata.vendorName,
          status: phaseStatus,
        }
      : null;

    await this.handleWizardResult(provisionalProject, result);
  }

  private openDeploymentDialog(
    project: Deployment,
    initialPhaseIndex: number,
    progress: StartDeploymentProgressPayload | null
  ): void {
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
        progress,
      },
    });

    dialogRef
      .afterClosed()
      .pipe()
      .subscribe(result => { void this.handleWizardResult(project, result ?? undefined); });
  }

  private async handleWizardResult(
    project: Deployment | null,
    result?: StartDeploymentDialogResult | undefined
  ): Promise<void> {
    if (!result || (result.action !== 'save' && result.action !== 'complete')) return;

    const metadata = result.metadata ?? null;
    let mergedProject: Deployment | null = project
      ? {
          ...project,
          ...(metadata
            ? {
                name: metadata.name,
                dataCenter: metadata.dataCenter,
                vendorName: metadata.vendorName,
              }
            : {}),
        }
      : metadata
      ? {
          id: result.progress.projectId ?? '',
          name: metadata.name,
          dataCenter: metadata.dataCenter,
          vendorName: metadata.vendorName,
          status: DeploymentStatus.Planned,
        }
      : null;

    const candidateId = mergedProject?.id && mergedProject.id.length ? mergedProject.id : null;
    const incomingId = candidateId ?? result.progress.projectId ?? null;
    const normalized = this.normalizeProgressPayload(result.progress, incomingId);
    const projectLabel = mergedProject?.name ?? 'deployment';
    const progressPercent = this.calculateProgressPercentage(normalized);
    const isCompleteAction = result.action === 'complete';
    if (isCompleteAction) {
      normalized.activePhaseIndex = Math.max(normalized.activePhaseIndex, this.wizardPhaseCount - 1);
    }
    const phaseStatus = isCompleteAction
      ? DeploymentStatus.Complete
      : this.statusFromPhaseIndex(normalized.activePhaseIndex);

    if (incomingId) {
      normalized.projectId = incomingId;
      this.cacheProgress(incomingId, normalized);
      await this.persistProgress(incomingId, normalized, projectLabel, progressPercent, phaseStatus);
      return;
    }

    if (!metadata) {
      this.cacheProgress('__new', normalized);
      this.toastr.error('Deployment details are required before saving progress.');
      return;
    }

    mergedProject = mergedProject
      ? { ...mergedProject, status: phaseStatus }
      : null;

    const createdDate = new Date().toISOString();

    try {
      const createPayload: Partial<Deployment> = {
        name: metadata.name,
        dataCenter: metadata.dataCenter,
        vendorName: metadata.vendorName,
        status: phaseStatus,
        createdDate,
      };
      const created = await this.deploymentService.create(createPayload);
      const newId = created?.id;
      if (!newId) {
        throw new Error('Deployment creation did not return an id.');
      }

      const newProject: Deployment = {
        ...(mergedProject ?? {
          name: metadata.name,
          dataCenter: metadata.dataCenter,
          vendorName: metadata.vendorName,
        }),
        id: newId,
        status: phaseStatus,
        progressPercent,
        createdBy: this.user.id,
        createdDate,
      };

      normalized.projectId = newId;
      this.cacheProgress(newId, normalized);
      this.draftProgress.update(curr => {
        if (!('__new' in curr)) {
          return curr;
        }
        const { __new, ...rest } = curr;
        return rest;
      });

      this.deployments.update(list => [...list, newProject]);

      await this.persistProgress(newId, normalized, newProject.name, progressPercent, phaseStatus);
    } catch (error) {
      console.error('Failed to create deployment', error);
      this.cacheProgress('__new', normalized);
      this.toastr.error('Unable to create deployment. Progress saved locally.');
    }
  }

  private cacheProgress(cacheKey: string, progress: StartDeploymentProgressPayload): void {
    this.draftProgress.update(curr => ({ ...curr, [cacheKey]: progress }));
  }

  private updateDeploymentProgress(
    projectId: string,
    progressPercent: number,
    status?: DeploymentStatus
  ): void {
    this.deployments.update(list =>
      list.map(item =>
        item.id === projectId
          ? {
              ...item,
              progressPercent,
              ...(status ? { status } : {}),
            }
          : item
      )
    );
  }

  private async syncDeploymentStatus(projectId: string, status: DeploymentStatus): Promise<void> {
    if (!projectId) return;
    const current = this.deployments().find(item => item.id === projectId)?.status;
    if (current === status) {
      return;
    }
    try {
      await this.deploymentService.update(projectId, { status });
    } catch (error) {
      console.warn('Failed to update deployment status', projectId, error);
    }
  }

  private async refreshProgressForProjects(projects: Deployment[]): Promise<void> {
    await Promise.all(
      (projects ?? [])
        .filter(project => !!project.id)
        .map(async project => {
          try {
            const remote = await firstValueFrom(this.deploymentService.getProgress(project.id));
            if (!remote) return;
            const normalized = this.normalizeProgressPayload(remote, remote.projectId ?? project.id ?? null);
            this.cacheProgress(project.id, normalized);
            const percent = this.calculateProgressPercentage(normalized);
            const status =
              project.status === DeploymentStatus.Complete
                ? DeploymentStatus.Complete
                : this.statusFromPhaseIndex(normalized.activePhaseIndex);
            this.updateDeploymentProgress(project.id, percent, status);
          } catch (error) {
            console.warn('Unable to load progress for deployment', project.id, error);
          }
        })
    );
  }

  private async persistProgress(
    targetId: string,
    normalized: StartDeploymentProgressPayload,
    projectLabel: string,
    progressPercent: number,
    statusOverride?: DeploymentStatus
  ): Promise<void> {
    const isWizardComplete = normalized.activePhaseIndex >= this.wizardPhaseCount - 1;
    try {
      const phaseStatus = statusOverride ?? this.statusFromPhaseIndex(normalized.activePhaseIndex);
      await firstValueFrom(
        this.deploymentService
          .saveProgress(targetId, normalized)
          .pipe()
      );
      await this.syncDeploymentStatus(targetId, phaseStatus);
      this.updateDeploymentProgress(targetId, progressPercent, phaseStatus);
      const message =
        phaseStatus === DeploymentStatus.Complete
          ? `${projectLabel} marked complete.`
          : isWizardComplete
            ? `${projectLabel} wizard completed. Deployment is ready for the next phase.`
            : `Saved progress for ${projectLabel}.`;
      this.toastr.success(message);
    } catch (err) {
      console.error('Failed to save progress', err);
      this.toastr.error('Failed to save deployment progress. Please try again.');
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

