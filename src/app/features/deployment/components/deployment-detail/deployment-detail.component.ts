import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';
import { DeploymentProject, DeploymentStatus } from '../../models/deployment.models';
import { DeploymentService } from '../../services/deployment.service';
import { DeploymentStateService } from '../../services/deployment-state.service';
import { Subscription } from 'rxjs';

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
  ],
  templateUrl: './deployment-detail.component.html',
  styleUrls: ['./deployment-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeploymentDetailComponent implements OnInit, OnDestroy {
  protected readonly statusSteps = Object.values(DeploymentStatus).map(label => ({ label }));
  protected readonly project = signal<DeploymentProject | null>(null);
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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.subscription = this.service.get(id).subscribe(project => {
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

