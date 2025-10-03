import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DeploymentStatus, ChecklistItem, PhaseRun } from '../../models/deployment.models';
import { ChecklistComponent } from '../checklist/checklist.component';
import { PunchListComponent } from '../punch-list/punch-list.component';
import { LabelGeneratorComponent } from '../label-generator/label-generator.component';
import { DeploymentService } from '../../services/deployment.service';
import { ChecklistTemplates } from '../../models/checklist.config';
import { isChecklistComplete } from '../../utils/checklist.utils';
import { DeploymentStateService } from '../../services/deployment-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'ark-phase-workspace',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    ToastModule,
    ChecklistComponent,
    PunchListComponent,
    LabelGeneratorComponent,
  ],
  providers: [MessageService],
  templateUrl: './phase-workspace.component.html',
  styleUrls: ['./phase-workspace.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhaseWorkspaceComponent implements OnInit, OnDestroy {
  protected readonly DeploymentStatus = DeploymentStatus;
  protected readonly form: FormGroup;
  protected readonly items: WritableSignal<ChecklistItem[]> = signal([]);
  protected readonly loading = signal(true);
  protected readonly projectId = signal<string>('');
  protected readonly phase = signal<DeploymentStatus>(DeploymentStatus.Planned);

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly deploymentService = inject(DeploymentService);
  private readonly state = inject(DeploymentStateService);
  private readonly messageService = inject(MessageService);

  private phaseRun?: PhaseRun;
  private subscription?: Subscription;

  readonly phaseLabel = computed(() => this.phase());

  constructor() {
    this.form = this.fb.group({});
  }

  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    const phaseParam = this.route.snapshot.paramMap.get('phase') as DeploymentStatus | null;
    if (!projectId || !phaseParam) {
      return;
    }

    this.projectId.set(projectId);
    this.phase.set(phaseParam);

    const template = ChecklistTemplates[phaseParam] ?? [];
    this.items.set(template.map(item => ({ ...item })));
    template.forEach(item => {
      const controlName = item.id;
      switch (item.type) {
        case 'checkbox':
          this.form.addControl(controlName, this.fb.control(false));
          break;
        case 'photo':
        case 'file':
          this.form.addControl(controlName, this.fb.control([]));
          break;
        default:
          this.form.addControl(controlName, this.fb.control(''));
      }
    });

    this.subscription = this.deploymentService
      .getPhaseRun(projectId, phaseParam)
      .subscribe(run => {
        this.phaseRun = run;
        run.checklist?.forEach(item => {
          if (this.form.contains(item.id) && item.value !== undefined) {
            this.form.get(item.id)?.setValue(item.value);
          }
          if (item.evidenceIds && this.form.contains(item.id)) {
            this.form.get(item.id)?.setValue(item.evidenceIds);
          }
        });
        this.loading.set(false);
      }, () => this.loading.set(false));
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  protected onChecklistChange(items: ChecklistItem[]) {
    this.items.set(items);
  }

  protected save(): void {
    const updated = this.mergeItemsWithForm();
    this.deploymentService
      .saveChecklist(this.projectId(), this.phase(), updated)
      .subscribe(() => {
        this.messageService.add({ severity: 'success', summary: 'Checklist saved' });
      });
  }

  protected advance(): void {
    if (!isChecklistComplete(this.items(), this.form.getRawValue())) {
      this.messageService.add({ severity: 'warn', summary: 'Fill required items before advancing' });
      return;
    }

    const order = Object.values(DeploymentStatus);
    const currentIndex = order.indexOf(this.phase());
    const nextStatus = order[currentIndex + 1] ?? DeploymentStatus.Complete;

    const updated = this.mergeItemsWithForm();
    this.deploymentService
      .saveChecklist(this.projectId(), this.phase(), updated)
      .subscribe(() => {
        this.deploymentService
          .advancePhase(this.projectId(), this.phase(), nextStatus)
          .subscribe(project => {
            this.state.setProject(project);
            this.messageService.add({ severity: 'success', summary: `Advanced to ${nextStatus}` });
          });
      });
  }

  private mergeItemsWithForm(): ChecklistItem[] {
    return this.items().map(item => {
      const value = this.form.get(item.id)?.value;
      if (item.type === 'photo' || item.type === 'file') {
        return { ...item, evidenceIds: value ?? [] };
      }
      return { ...item, value };
    });
  }
}
