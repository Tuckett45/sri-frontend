import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';
import { TimelineModule } from 'primeng/timeline';
import { Deployment, DeploymentStatus } from '../../models/deployment.models';
import { DeploymentService } from '../../services/deployment.service';
import { DeploymentStateService } from '../../services/deployment-state.service';
import { Subscription } from 'rxjs';

interface TimelineStep {
  status: DeploymentStatus;
  title: string;
  summary: string;
  substeps: readonly string[];
}

type TimelineState = 'complete' | 'current' | 'pending';

@Component({
  selector: 'ark-deployment-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    ButtonModule,
    TagModule,
    DividerModule,
    ProgressBarModule,
    TimelineModule,
  ],
  templateUrl: './deployment-detail.component.html',
  styleUrls: ['./deployment-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeploymentDetailComponent implements OnInit, OnDestroy {
  protected readonly statusSteps = Object.values(DeploymentStatus).map(label => ({ label }));
  protected readonly project = signal<Deployment | null>(null);
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

  private readonly state = inject(DeploymentStateService);
  private readonly service = inject(DeploymentService);
  private readonly route = inject(ActivatedRoute);
  private subscription?: Subscription;

  private readonly timelineSteps: TimelineStep[] = [
    {
      status: DeploymentStatus.Survey,
      title: 'Site Survey',
      summary: 'Site readiness verification',
      substeps: [
        'Validate rack space, power and cooling availability',
        'Capture photos and site notes for installers',
        'Confirm change window and on-site contacts'
      ]
    },
    {
      status: DeploymentStatus.Inventory,
      title: 'Receiving & Inventory',
      summary: 'Equipment receipt & tracking',
      substeps: [
        'Log all shipments and record serial numbers',
        'Stage hardware in secure build area',
        'Flag damaged or missing items for resolution'
      ]
    },
    {
      status: DeploymentStatus.Install,
      title: 'Installation',
      summary: 'Mounting & powering gear',
      substeps: [
        'Rack and secure network & compute devices',
        'Connect dual power feeds and verify indicators',
        'Complete initial boot and firmware validation'
      ]
    },
    {
      status: DeploymentStatus.Cabling,
      title: 'Cabling',
      summary: 'Data, power, and fiber cabling',
      substeps: [
        'Run copper and fiber to design specifications',
        'Dress, label, and secure cable pathways',
        'Perform continuity and light-level testing'
      ]
    },
    {
      status: DeploymentStatus.Labeling,
      title: 'Labeling',
      summary: 'Label generation & placement',
      substeps: [
        'Generate label sets for racks, devices, and cabling',
        'Apply labels and capture verification photos',
        'Update documentation with label references'
      ]
    },
    {
      status: DeploymentStatus.Handoff,
      title: 'Handoff',
      summary: 'Validation & final sign-off',
      substeps: [
        'Compile checklists, photos, and test results',
        'Conduct onsite or virtual walkthrough with stakeholders',
        'Collect final approvals and schedule turnover'
      ]
    }
  ];

  private readonly timelineOrder = this.timelineSteps.map(step => step.status);

  protected readonly timelineEntries = computed(() => {
    const project = this.project();
    const status = project?.status ?? DeploymentStatus.Planned;

    const currentIndex = (() => {
      if (status === DeploymentStatus.Complete) return this.timelineOrder.length - 1;
      const idx = this.timelineOrder.indexOf(status);
      return idx;
    })();

    return this.timelineSteps.map((step, index) => {
      let state: TimelineState = 'pending';
      if (currentIndex >= this.timelineOrder.length - 1 && status === DeploymentStatus.Complete) {
        state = 'complete';
      } else if (currentIndex === -1) {
        state = 'pending';
      } else if (index < currentIndex) {
        state = 'complete';
      } else if (index === currentIndex) {
        state = status === DeploymentStatus.Planned ? 'pending' : 'current';
      }

      return {
        ...step,
        state
      };
    });
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.service.get(id).then((project) => {
        this.project.set(project);
        this.state.setProject(project);
      });
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  protected progress(status: DeploymentStatus): number {
    const order = Object.values(DeploymentStatus);
    const index = order.indexOf(status);
    return index >= 0 ? Math.round(((index + 1) / order.length) * 100) : 0;
  }

  protected statusSeverity(
    status: DeploymentStatus,
  ): "warn" | "success" | "danger" | "secondary" | "info" | "contrast" | undefined {
    return this.severityMap.get(status) ?? "secondary";
  }
}

