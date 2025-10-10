import { ChangeDetectionStrategy, Component, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DeploymentStatus, ChecklistItem } from '../../models/deployment.models';
import { ChecklistComponent } from '../checklist/checklist.component';
import { LabelGeneratorComponent } from '../label-generator/label-generator.component';
import { DeploymentService, ChecklistItemDto } from '../../services/deployment.service';
import { ChecklistTemplates } from '../../models/checklist.config';
import { isChecklistComplete } from '../../utils/checklist.utils';
import { DeploymentStateService } from '../../services/deployment-state.service';

interface SubPhaseSummary {
  code: string;
  name: string;
  status?: string;
}

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
    LabelGeneratorComponent,
  ],
  providers: [MessageService],
  templateUrl: './phase-workspace.component.html',
  styleUrls: ['./phase-workspace.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhaseWorkspaceComponent implements OnInit {
  protected readonly DeploymentStatus = DeploymentStatus;
  protected readonly form: FormGroup;
  protected readonly items: WritableSignal<ChecklistItem[]> = signal([]);
  protected readonly loading = signal(true);
  protected readonly projectId = signal<string>('');
  protected readonly phase = signal<DeploymentStatus>(DeploymentStatus.Planned);
  protected readonly subPhases = signal<SubPhaseSummary[]>([]);
  protected readonly activeSubPhase = signal<SubPhaseSummary | null>(null);

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly deploymentService = inject(DeploymentService);
  private readonly state = inject(DeploymentStateService);
  private readonly messageService = inject(MessageService);

  private currentPhaseCode = 0;

  readonly phaseLabel = computed(() => this.phase());

  constructor() {
    this.form = this.fb.group({});
  }

  async ngOnInit(): Promise<void> {
    const projectId = this.route.snapshot.paramMap.get('id');
    const phaseParam = this.route.snapshot.paramMap.get('phase') as DeploymentStatus | null;
    if (!projectId || !phaseParam) {
      return;
    }

    this.projectId.set(projectId);
    this.phase.set(phaseParam);
    this.currentPhaseCode = this.statusToIndex(phaseParam);

    const template = this.cloneTemplate(phaseParam);
    this.items.set(template);
    this.setupFormControls(template);

    try {
      const fetched = await this.fetchSubPhases(projectId, this.currentPhaseCode);
      const normalized = fetched.length ? fetched : [this.buildDefaultSubPhase(phaseParam)];
      this.subPhases.set(normalized);
      const active = normalized[0];
      this.activeSubPhase.set(active);
      await this.loadChecklist(projectId, this.currentPhaseCode, active.code, template);
    } catch (error) {
      console.error('Failed to load checklist', error);
      this.messageService.add({ severity: 'error', summary: 'Unable to load checklist for this phase.' });
    } finally {
      this.loading.set(false);
    }
  }

  protected onChecklistChange(items: ChecklistItem[]) {
    this.items.set(items);
  }

  protected async save(): Promise<void> {
    if (!this.projectId() || !this.activeSubPhase()) {
      return;
    }

    this.loading.set(true);
    try {
      const payload = this.collectChecklistPayload();
      await this.deploymentService.saveChecklist(
        this.projectId(),
        this.currentPhaseCode,
        this.activeSubPhase()!.code,
        payload
      );
      this.messageService.add({ severity: 'success', summary: 'Checklist saved' });
    } catch (error) {
      console.error('Failed to save checklist', error);
      this.messageService.add({ severity: 'error', summary: 'Failed to save checklist.' });
    } finally {
      this.loading.set(false);
    }
  }

  protected async advance(): Promise<void> {
    if (!this.projectId() || !this.activeSubPhase()) {
      return;
    }

    if (!isChecklistComplete(this.items(), this.form.getRawValue())) {
      this.messageService.add({ severity: 'warn', summary: 'Fill required items before advancing' });
      return;
    }

    const order = Object.values(DeploymentStatus);
    const currentIndex = Math.max(0, Math.min(order.length - 1, this.currentPhaseCode));
    const toIndex = Math.min(order.length - 1, currentIndex + 1);
    const nextStatus = order[toIndex] ?? DeploymentStatus.Complete;

    this.loading.set(true);
    try {
      const payload = this.collectChecklistPayload();
      await this.deploymentService.saveChecklist(
        this.projectId(),
        this.currentPhaseCode,
        this.activeSubPhase()!.code,
        payload
      );
      await this.deploymentService.advance(this.projectId(), currentIndex, toIndex);
      const updatedProject = await this.deploymentService.get(this.projectId());
      this.state.setProject(updatedProject);
      this.messageService.add({ severity: 'success', summary: `Advanced to ${nextStatus}` });
      this.currentPhaseCode = toIndex;
    } catch (error) {
      console.error('Failed to advance phase', error);
      this.messageService.add({ severity: 'error', summary: 'Failed to advance phase.' });
    } finally {
      this.loading.set(false);
    }
  }

  private cloneTemplate(status: DeploymentStatus): ChecklistItem[] {
    return (ChecklistTemplates[status] ?? []).map(item => ({ ...item }));
  }

  private setupFormControls(template: ChecklistItem[]): void {
    template.forEach(item => {
      if (this.form.contains(item.id)) {
        return;
      }
      switch (item.type) {
        case 'checkbox':
          this.form.addControl(item.id, this.fb.control(false));
          break;
        case 'photo':
        case 'file':
          this.form.addControl(item.id, this.fb.control([]));
          break;
        case 'number':
          this.form.addControl(item.id, this.fb.control(null));
          break;
        case 'date':
          this.form.addControl(item.id, this.fb.control(null));
          break;
        default:
          this.form.addControl(item.id, this.fb.control(''));
      }
    });
  }

  private async fetchSubPhases(projectId: string, phaseCode: number): Promise<SubPhaseSummary[]> {
    try {
      const raw = await this.deploymentService.getSubPhases(projectId, phaseCode);
      if (!Array.isArray(raw) || raw.length === 0) {
        return [];
      }
      return raw.map((entry, index) => {
        let code = this.toString(entry?.code ?? entry?.subCode ?? entry?.id ?? `sub-${index + 1}`);
        if (!code) {
          code = `sub-${index + 1}`;
        }
        let name = this.toString(entry?.name ?? entry?.label ?? entry?.title ?? `Subphase ${index + 1}`);
        if (!name) {
          name = `Subphase ${index + 1}`;
        }
        const status = this.toOptionalString(entry?.status ?? entry?.state);
        return { code, name, status };
      });
    } catch (error) {
      console.warn('Unable to fetch subphases, defaulting to single checklist', error);
      return [];
    }
  }

  private buildDefaultSubPhase(phase: DeploymentStatus): SubPhaseSummary {
    return {
      code: 'default',
      name: `${phase} Checklist`
    };
  }

  private async loadChecklist(
    projectId: string,
    phaseCode: number,
    subCode: string,
    template: ChecklistItem[]
  ): Promise<void> {
    try {
      const dtoItems = await this.deploymentService.getChecklist(projectId, phaseCode, subCode);
      if (!Array.isArray(dtoItems) || dtoItems.length === 0) {
        return;
      }
      this.applyChecklistValues(template, dtoItems);
    } catch (error) {
      console.warn('No checklist data found, using template defaults', error);
    }
  }

  private applyChecklistValues(template: ChecklistItem[], dtos: ChecklistItemDto[]): void {
    const dtoMap = new Map(dtos.map(dto => [dto.itemKey, dto]));
    const updated = template.map(item => {
      const dto = dtoMap.get(item.id);
      if (!dto) {
        return item;
      }
      const control = this.form.get(item.id);
      const clone: ChecklistItem = { ...item };

      if (item.type === 'checkbox') {
        const value = this.toBoolean(dto.passed ?? dto.value);
        clone.value = value ?? false;
        control?.setValue(clone.value, { emitEvent: false });
      } else if (item.type === 'photo' || item.type === 'file') {
        const evidence = this.parseEvidence(dto.value);
        clone.evidenceIds = evidence.filter(Boolean) as string[];
        control?.setValue(clone.evidenceIds ?? [], { emitEvent: false });
      } else if (item.type === 'number') {
        const numValue =
          dto.value !== undefined && dto.value !== null && dto.value !== ''
            ? Number(dto.value)
            : null;
        clone.value = numValue;
        control?.setValue(numValue, { emitEvent: false });
      } else if (item.type === 'date') {
        const parsedDate = dto.value ? new Date(dto.value) : null;
        clone.value = parsedDate;
        control?.setValue(parsedDate, { emitEvent: false });
      } else {
        const value = dto.value ?? dto.notes ?? '';
        clone.value = value ?? '';
        control?.setValue(clone.value, { emitEvent: false });
      }

      return clone;
    });

    this.items.set(updated);
  }

  private collectChecklistPayload(): ChecklistItemDto[] {
    return this.items().map(item => {
      const control = this.form.get(item.id);
      const value = control?.value;
      const dto: ChecklistItemDto = {
        itemKey: item.id,
        label: item.label,
        required: !!item.required,
      };

      if (item.type === 'checkbox') {
        const boolVal = this.toBoolean(value) ?? false;
        dto.passed = boolVal;
        dto.value = boolVal ? 'true' : 'false';
      } else if (item.type === 'photo' || item.type === 'file') {
        const evidenceIds = Array.isArray(value) ? value : value ? [value] : [];
        dto.value = evidenceIds.length ? JSON.stringify(evidenceIds) : null;
      } else {
        if (value === null || value === undefined || value === '') {
          dto.value = null;
        } else if (item.type === 'number') {
          dto.value = String(value);
        } else if (item.type === 'date') {
          if (value instanceof Date) {
            dto.value = value.toISOString();
          } else {
            dto.value = String(value);
          }
        } else {
          dto.value = String(value);
        }

        if (item.type === 'textarea' || item.type === 'text') {
          dto.notes = typeof value === 'string' && value.length ? value : null;
        }
      }

      return dto;
    });
  }

  private statusToIndex(status: DeploymentStatus): number {
    const order = Object.values(DeploymentStatus);
    const index = order.indexOf(status);
    return index >= 0 ? index : 0;
  }

  private toBoolean(value: unknown): boolean | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', 'yes', '1'].includes(normalized)) return true;
      if (['false', 'no', '0'].includes(normalized)) return false;
    }
    if (typeof value === 'number') return value !== 0;
    return null;
  }

  private toString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  private toOptionalString(value: unknown): string | undefined {
    const str = this.toString(value);
    return str ? str : undefined;
  }

  private parseEvidence(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map(val => this.toString(val)).filter(Boolean);
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(val => this.toString(val)).filter(Boolean);
        }
      } catch (error) {
        // ignore parse failure, fall back to simple comma split
        return raw.split(',').map(part => part.trim()).filter(Boolean);
      }
      return raw ? [raw] : [];
    }
    return [];
  }
}
