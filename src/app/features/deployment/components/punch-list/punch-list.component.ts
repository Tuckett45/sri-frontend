import { ChangeDetectionStrategy, Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DeploymentService } from '../../services/deployment.service';
import { DeploymentStatus, PunchItem } from '../../models/deployment.models';

@Component({
  selector: 'ark-punch-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule, TagModule],
  templateUrl: './punch-list.component.html',
  styleUrls: ['./punch-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PunchListComponent implements OnChanges {
  @Input() projectId!: string;
  @Input() phase!: DeploymentStatus;

  protected readonly items = signal<PunchItem[]>([]);
  protected readonly form = inject(FormBuilder).nonNullable.group({ description: [''], owner: [''] });

  private readonly deploymentService = inject(DeploymentService);

  ngOnChanges(): void {
    if (this.projectId) {
      this.deploymentService.listPunch(this.projectId).subscribe(list => {
        this.items.set(list.filter(item => item.phase === this.phase));
      });
    }
  }

  protected add(): void {
    const { description, owner } = this.form.getRawValue();
    if (!description?.trim()) return;

    this.deploymentService
      .addPunch(this.projectId, {
        description,
        owner,
        phase: this.phase,
        createdAt: new Date().toISOString(),
      })
      .subscribe(item => {
        this.items.set([...this.items(), item]);
        this.form.reset();
      });
  }

  protected resolve(item: PunchItem): void {
    this.deploymentService
      .resolvePunch(this.projectId, item.id, { resolvedAt: new Date().toISOString() })
      .subscribe(resolved => {
        this.items.set(this.items().map(existing => (existing.id === resolved.id ? resolved : existing)));
      });
  }
}
