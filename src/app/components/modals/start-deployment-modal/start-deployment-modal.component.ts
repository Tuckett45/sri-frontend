import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DeploymentProject } from 'src/app/features/deployment/models/deployment.models';
import {
  SiteSurveyProgress,
  SiteSurveyProgressEntry,
  SiteSurveySubmission,
  StartDeploymentProgressPayload,
} from 'src/app/features/deployment/models/deployment-progress.model';

interface SiteSurveyQuestion {
  id: string;
  title: string;
  detailsPrompt?: string;
  requireNotesWhenNo?: boolean;
  info?: string;
}

interface NarrativeItem {
  label: string;
  text: string;
  subitems?: NarrativeItem[];
}

interface NarrativeGroup {
  heading?: string;
  intro?: string;
  items: NarrativeItem[];
}

interface DeploymentPhaseSection {
  id: string;
  title: string;
  summary: string;
  body?: string;
  type: 'siteSurvey' | 'receiving' | 'installation' | 'cabling' | 'labeling' | 'handoff';
  narrative?: NarrativeGroup[];
}

type PhaseType = DeploymentPhaseSection['type'];

interface PhaseTask {
  id: string;
  label: string;
  description: string;
  parentId?: string | null;
  isChild?: boolean;
}

interface PhaseTaskGroup {
  heading: string;
  intro?: string | null;
  tasks: PhaseTask[];
}

export type StartDeploymentDialogResult = {
  action: 'save';
  progress: StartDeploymentProgressPayload;
};

export interface StartDeploymentDialogData {
  project?: DeploymentProject | null;
  initialPhaseIndex?: number;
  progress?: StartDeploymentProgressPayload | null;
}

@Component({
  selector: 'app-start-deployment-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatRadioModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './start-deployment-modal.component.html',
  styleUrls: ['./start-deployment-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StartDeploymentModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject(MatDialogRef<StartDeploymentModalComponent, StartDeploymentDialogResult | undefined>);
  private readonly data = inject<StartDeploymentDialogData | null>(MAT_DIALOG_DATA, { optional: true }) ?? null;

  protected readonly project = this.data?.project ?? null;
  private existingProgress: StartDeploymentProgressPayload | null = null;
  private readonly initialPhaseIndex = Math.max(0, this.data?.initialPhaseIndex ?? 0);

  protected readonly siteSurveySubmitAttempted = signal(false);
  protected readonly activePhaseIndex = signal(this.initialPhaseIndex);
  protected readonly activeTaskTabIndex = signal(0);

  protected emptyFormGroup!: FormGroup;
  protected siteSurveyForm!: FormGroup;

  protected readonly deploymentPhases: ReadonlyArray<DeploymentPhaseSection> = [
    {
      id: 'siteSurvey',
      title: 'Site Survey',
      summary: 'Confirm physical readiness prior to any on-site work.',
      type: 'siteSurvey'
    },
    {
      id: 'receiving',
      title: 'Receiving & Inventory',
      summary: 'Track shipments, validate inventory, and stage equipment for install.',
      body: 'Capture bill-of-material checks, serial-number audits, and staging confirmations before work moves to the floor.',
      type: 'receiving',
      narrative: [
        {
          heading: '2.0 Establish Receiving & Inventory Process',
          items: [
            { label: '2.0', text: 'Vendor establishes reliable receiving and inventory workflow that prevents loss or misplacement of assets.' }
          ]
        },
        {
          heading: '2.1 Receiving Equipment',
          items: [
            {
              label: '2.1.1',
              text: 'Ensure every item on the Work Order is inventoried and accounted for.',
              subitems: [
                { label: '2.1.1.1', text: 'Compare Work Order details to the equipment received.' }
              ]
            },
            {
              label: '2.1.2',
              text: 'Verify Work Order aligns with the run list materials.',
              subitems: [
                { label: '2.1.2.1', text: 'Compare Work Order to the RFP; confirm all materials were ordered.' }
              ]
            },
            {
              label: '2.1.3',
              text: 'Check airflow orientation of equipment destined for racks.',
              subitems: [
                { label: '2.1.3.1', text: 'Verify fans and power supplies align with planned airflow.' },
                { label: '2.1.3.2', text: 'Confirm all FRUs match airflow direction.' }
              ]
            },
            {
              label: '2.1.4',
              text: 'Confirm all optical modules are received and reconciled with the RFP.',
              subitems: [
                { label: '2.1.4.1', text: 'Validate optics received vs. assignments in the RFP.' },
                { label: '2.1.4.2', text: 'Identify any missing optics per RFP expectations.' }
              ]
            },
            {
              label: '2.1.5',
              text: 'Confirm specialized cabling arrived (DAC, SAS, VCP).'
            },
            {
              label: '2.1.6',
              text: 'Document shortages of optics, PSUs, rack kits, drives, or cables.',
              subitems: [
                { label: '2.1.6.1', text: 'Vendor projects: report shortages to DE immediately via email.' },
                { label: '2.1.6.2', text: 'DC Ops projects: notify DE and update associated tickets.' }
              ]
            },
            {
              label: '2.1.7',
              text: 'Document and photograph damaged equipment.',
              subitems: [
                { label: '2.1.7.1', text: 'Vendor projects: report damages to DE via email immediately.' },
                { label: '2.1.7.2', text: 'DC Ops projects: inform DE, update the ticket.' }
              ]
            },
            {
              label: '2.1.8',
              text: 'Verify replacement parts, if any, arrive before installation.'
            }
          ]
        },
        {
          heading: '2.2 Inventory Control',
          items: [
            {
              label: '2.2.1',
              text: 'Maintain staging checklist with equipment locations.'
            },
            {
              label: '2.2.2',
              text: 'Secure storage for high-value components to prevent loss.'
            },
            {
              label: '2.2.3',
              text: 'Log serial numbers into asset tracking system before install.'
            }
          ]
        }
      ]
    },
    {
      id: 'installation',
      title: 'Installation',
      summary: 'Mount, cable, and power all hardware to specification.',
      type: 'installation',
      narrative: [
        {
          heading: '3.1 Rack & Stack',
          items: [
            {
              label: '3.1.1',
              text: 'Install hardware into racks following elevation diagrams.',
              subitems: [
                { label: '3.1.1.1', text: 'Verify rails and mounting hardware are torqued appropriately.' },
                { label: '3.1.1.2', text: 'Ensure weight distribution aligns with rack standards.' }
              ]
            },
            {
              label: '3.1.2',
              text: 'Connect power feeds per design drawing.'
            }
          ]
        },
        {
          heading: '3.2 Power Validation',
          items: [
            { label: '3.2.1', text: 'Verify redundant power paths per rack design.' },
            { label: '3.2.2', text: 'Document breaker assignments and load levels.' }
          ]
        }
      ]
    },
    {
      id: 'cabling',
      title: 'Cabling',
      summary: 'Lay in copper and fiber, manage pathways, and test connectivity.',
      type: 'cabling',
      narrative: [
        {
          heading: '4.1 Structured Cabling',
          items: [
            { label: '4.1.1', text: 'Route cables per pathway standards.' },
            { label: '4.1.2', text: 'Bundle and secure cables with velcro wraps.' },
            { label: '4.1.3', text: 'Label terminations per schema.' }
          ]
        },
        {
          heading: '4.2 Testing',
          items: [
            { label: '4.2.1', text: 'Run continuity tests on all copper drops.' },
            { label: '4.2.2', text: 'Document fiber light levels and certify results.' }
          ]
        }
      ]
    },
    {
      id: 'labeling',
      title: 'Labeling',
      summary: 'Generate and apply labels to meet operations standards.',
      type: 'labeling',
      narrative: [
        {
          heading: '5.1 Label Application',
          items: [
            { label: '5.1.1', text: 'Apply rack, device, and cable labels with approved materials.' },
            { label: '5.1.2', text: 'Capture photos of labeling for documentation.' }
          ]
        }
      ]
    },
    {
      id: 'handoff',
      title: 'Handoff',
      summary: 'Compile validation evidence and finalize stakeholder approvals.',
      type: 'handoff',
      narrative: [
        {
          heading: '6.1 Operational Readiness',
          items: [
            { label: '6.1.1', text: 'Provide deployment summary packet to stakeholders.' },
            { label: '6.1.2', text: 'Confirm monitoring systems report expected status.' },
            { label: '6.1.3', text: 'Schedule handoff review with DE and Ops.' }
          ]
        },
        {
          heading: '6.4 Punch List',
          items: [
            { label: '6.4.8', text: 'Generate punch list items for issues.' },
            { label: '6.4.9', text: 'Resolve punch list with photographic evidence.' }
          ]
        }
      ]
    }
  ];

  protected readonly siteSurveyQuestions: SiteSurveyQuestion[] = [
    {
      id: 'ss-1',
      title: 'Rack elevation diagrams confirmed with facilities?',
      requireNotesWhenNo: true,
      detailsPrompt: 'If "No", describe discrepancies and blockers.'
    },
    {
      id: 'ss-2',
      title: 'Power whips in place and energized?',
      requireNotesWhenNo: true,
      detailsPrompt: 'Outline missing circuits or pending approvals.'
    },
    {
      id: 'ss-3',
      title: 'Receiving area staged and inventory reconciled?',
      detailsPrompt: 'Capture open issues or missing items.'
    },
    {
      id: 'ss-4',
      title: 'Cable pathways cleared and accessible?',
      requireNotesWhenNo: true,
      detailsPrompt: 'Describe obstructions or access constraints.'
    },
    {
      id: 'ss-5',
      title: 'Network demarc confirmed and ready?',
      info: 'Ensure cross-connects are scheduled prior to installation.'
    }
  ];

  private phaseTaskGroupsMap!: Record<PhaseType, PhaseTaskGroup[]>;
  private phaseTaskFormsMap!: Record<PhaseType, FormGroup>;

  ngOnInit(): void {
    this.emptyFormGroup = this.fb.group({});
    this.siteSurveyForm = this.buildSiteSurveyForm();
    this.phaseTaskGroupsMap = this.buildPhaseTaskGroups();
    this.phaseTaskFormsMap = this.buildPhaseTaskForms(this.phaseTaskGroupsMap);
    this.existingProgress = this.data?.progress ?? null;
    this.restoreProgressState();
  }

  protected currentPhaseType(): PhaseType {
    const current = this.deploymentPhases[this.activePhaseIndex()];
    return current?.type ?? 'siteSurvey';
  }

  protected getPhaseTaskGroups(phase: PhaseType): PhaseTaskGroup[] {
    return this.phaseTaskGroupsMap?.[phase] ?? [];
  }

  protected phaseTaskForm(phase: PhaseType): FormGroup {
    return this.phaseTaskFormsMap?.[phase] ?? this.emptyFormGroup;
  }

  protected selectPhase(index: number): void {
    this.advanceToPhase(index, 0);
  }

  protected goToNextStep(): void {
    if (this.isAtFinalStep()) {
      return;
    }

    const groups = this.getPhaseTaskGroups(this.currentPhaseType());
    if (groups.length && this.activeTaskTabIndex() < groups.length - 1) {
      this.activeTaskTabIndex.update(i => i + 1);
      return;
    }

    const next = this.activePhaseIndex() + 1;
    if (next < this.deploymentPhases.length) {
      this.advanceToPhase(next, 0);
    }
  }

  protected goToPreviousStep(): void {
    const groups = this.getPhaseTaskGroups(this.currentPhaseType());
    if (groups.length && this.activeTaskTabIndex() > 0) {
      this.activeTaskTabIndex.update(i => i - 1);
      return;
    }

    const prev = this.activePhaseIndex() - 1;
    if (prev >= 0) {
      const prevPhase = this.deploymentPhases[prev];
      const prevGroups = this.getPhaseTaskGroups(prevPhase.type);
      const startingTab = prevGroups.length ? prevGroups.length - 1 : 0;
      this.advanceToPhase(prev, startingTab);
    }
  }

  protected isAtFinalStep(): boolean {
    const isLastPhase = this.activePhaseIndex() === this.deploymentPhases.length - 1;
    const groups = this.getPhaseTaskGroups(this.currentPhaseType());
    const onLastTab = !groups.length || this.activeTaskTabIndex() === groups.length - 1;
    return isLastPhase && onLastTab;
  }

  private advanceToPhase(index: number, tabStart: number, preserveFormState = false): void {
    const clampedIndex = this.clampPhaseIndex(index);
    this.activePhaseIndex.set(clampedIndex);
    if (!preserveFormState) {
      this.siteSurveySubmitAttempted.set(false);
    }

    const groups = this.getPhaseTaskGroups(this.currentPhaseType());
    const safeTab = this.clampTabIndex(tabStart, groups.length);
    this.activeTaskTabIndex.set(safeTab);
  }

  protected questionGroup(id: string): FormGroup {
    return (this.siteSurveyForm.get(id) as FormGroup | null) ?? this.emptyFormGroup;
  }

  protected saveProgress(): void {
    const progress = this.buildProgressPayload();
    this.dialogRef.close({ action: 'save', progress });
  }

  protected onStatusChange(question: SiteSurveyQuestion, value: 'yes' | 'no'): void {
    const group = this.questionGroup(question.id);
    this.enforceNotesValidator(question, value, group);
  }

  protected radioError(group: FormGroup | null): boolean {
    if (!group) return false;
    const control = group.get('status');
    return !!control && control.invalid && (control.touched || this.siteSurveySubmitAttempted());
  }

  protected notesError(group: FormGroup | null): boolean {
    if (!group) return false;
    const control = group.get('notes');
    return !!control && control.invalid && (control.touched || this.siteSurveySubmitAttempted());
  }

  protected onSiteSurveySubmit(): void {
    this.siteSurveySubmitAttempted.set(true);
    if (this.siteSurveyForm.invalid) {
      this.siteSurveyForm.markAllAsTouched();
      return;
    }

    const submission = this.buildSiteSurveySubmission();
    const progress = this.buildProgressPayload(submission);
    console.debug('Site survey submission', submission);
    this.dialogRef.close({ action: 'save', progress });
  }

  protected close(result?: unknown): void {
    this.dialogRef.close(result);
  }

  private buildProgressPayload(submittedSiteSurvey?: SiteSurveySubmission): StartDeploymentProgressPayload {
    return {
      projectId: this.project?.id ?? null,
      activePhaseIndex: this.activePhaseIndex(),
      activeTaskTabIndex: this.activeTaskTabIndex(),
      siteSurvey: this.collectSiteSurveyProgress(),
      phaseTasks: this.collectPhaseTaskProgress(),
      submittedSiteSurvey,
    };
  }

  private collectSiteSurveyProgress(): SiteSurveyProgress {
    return {
      responses: this.siteSurveyQuestions.map(question => {
        const group = this.questionGroup(question.id);
        const raw = (group?.getRawValue() as { status: 'yes' | 'no' | null; notes: string }) ?? {
          status: null,
          notes: '',
        };
        return {
          id: question.id,
          title: question.title,
          status: raw.status ?? null,
          notes: raw.notes?.trim() ? raw.notes.trim() : null,
        };
      }),
    };
  }

  private collectPhaseTaskProgress(): Record<string, Record<string, boolean>> {
    const progress = {} as Record<string, Record<string, boolean>>;
    for (const phase of this.deploymentPhases) {
      const form = this.phaseTaskFormsMap[phase.type];
      progress[phase.type] = form ? (form.getRawValue() as Record<string, boolean>) : {};
    }
    return progress;
  }

  private restoreProgressState(): void {
    const phaseIndex = this.clampPhaseIndex(
      this.existingProgress?.activePhaseIndex ?? this.initialPhaseIndex
    );
    const requestedTab = this.existingProgress?.activeTaskTabIndex ?? 0;

    this.advanceToPhase(phaseIndex, requestedTab, true);

    if (this.existingProgress) {
      this.applySiteSurveyProgress(this.existingProgress.siteSurvey ?? null);
      this.applyPhaseTaskProgress(this.existingProgress.phaseTasks ?? {});
      const groups = this.getPhaseTaskGroups(this.currentPhaseType());
      this.activeTaskTabIndex.set(this.clampTabIndex(requestedTab, groups.length));
    } else {
      this.applySiteSurveyProgress(null);
    }

    this.siteSurveySubmitAttempted.set(false);
  }

  private applySiteSurveyProgress(progress: SiteSurveyProgress | null): void {
    const lookup = new Map<string, SiteSurveyProgressEntry>(
      (progress?.responses ?? []).map(entry => [entry.id, entry])
    );

    this.siteSurveyQuestions.forEach(question => {
      const entry = lookup.get(question.id);
      const status = entry?.status ?? null;
      const notesValue = entry?.notes ?? '';
      const group = this.questionGroup(question.id);
      group.patchValue({ status, notes: notesValue ?? '' }, { emitEvent: false });
      this.enforceNotesValidator(question, status, group);
    });
  }

  private applyPhaseTaskProgress(progress: Record<string, Record<string, boolean>>): void {
    if (!progress) {
      return;
    }

    Object.entries(progress).forEach(([phaseKey, values]) => {
      const form = this.phaseTaskFormsMap[phaseKey as PhaseType];
      if (form) {
        form.patchValue(values ?? {}, { emitEvent: false });
      }
    });
  }

  private enforceNotesValidator(
    question: SiteSurveyQuestion,
    status: 'yes' | 'no' | null,
    group: FormGroup
  ): void {
    const notes = group.get('notes');
    if (!notes) {
      return;
    }

    if (status === 'no' && question.requireNotesWhenNo) {
      notes.addValidators([Validators.required, Validators.minLength(3)]);
    } else {
      notes.removeValidators([Validators.required, Validators.minLength(3)]);
    }

    notes.updateValueAndValidity({ emitEvent: false });
  }

  private clampPhaseIndex(index: number): number {
    if (!Number.isFinite(index)) {
      return 0;
    }
    const max = Math.max(this.deploymentPhases.length - 1, 0);
    return Math.min(Math.max(Math.trunc(index), 0), max);
  }

  private clampTabIndex(index: number, total: number): number {
    if (!Number.isFinite(index) || total <= 0) {
      return 0;
    }
    return Math.min(Math.max(Math.trunc(index), 0), total - 1);
  }

  private buildSiteSurveyForm(): FormGroup {
    const group: Record<string, FormGroup> = {};
    this.siteSurveyQuestions.forEach(question => {
      group[question.id] = this.fb.group({
        status: [null, Validators.required],
        notes: ['']
      });
    });
    return this.fb.group(group);
  }

  private resetSiteSurveyForm(): void {
    this.applySiteSurveyProgress(null);
    this.siteSurveySubmitAttempted.set(false);
  }

  private buildDemoProgress(): StartDeploymentProgressPayload {
    const responses: SiteSurveyProgressEntry[] = this.siteSurveyQuestions.map((question, index) => ({
      id: question.id,
      title: question.title,
      status: (index % 3 === 0 ? 'no' : 'yes') as 'yes' | 'no',
      notes:
        index % 3 === 0
          ? 'Investigate outstanding issues before proceeding.'
          : null,
    }));

    const phaseTasks: Record<string, Record<string, boolean>> = {};
    Object.entries(this.phaseTaskFormsMap ?? {}).forEach(([phase, form]) => {
      const controls = Object.keys(form?.controls ?? {});
      if (!controls.length) {
        return;
      }
      const selection: Record<string, boolean> = {};
      controls.slice(0, 3).forEach((controlId, idx) => {
        selection[controlId] = idx % 2 === 0;
      });
      if (Object.keys(selection).length) {
        phaseTasks[phase] = selection;
      }
    });

    return {
      projectId: this.project?.id ?? null,
      activePhaseIndex: 1,
      activeTaskTabIndex: 0,
      siteSurvey: { responses },
      phaseTasks,
    };
  }

  private buildPhaseTaskGroups(): Record<PhaseType, PhaseTaskGroup[]> {
    const map = {} as Record<PhaseType, PhaseTaskGroup[]>;
    for (const phase of this.deploymentPhases) {
      if (!phase.narrative?.length) {
        map[phase.type] = [];
        continue;
      }
      map[phase.type] = phase.narrative.map(group => ({
        heading: group.heading ?? phase.title,
        intro: group.intro ?? null,
        tasks: this.flattenNarrativeItems(phase, group.items)
      }));
    }
    return map;
  }

  private flattenNarrativeItems(section: DeploymentPhaseSection, items: NarrativeItem[]): PhaseTask[] {
    const tasks: PhaseTask[] = [];
    items.forEach((item, itemIndex) => {
      const baseId = this.toControlId(`${section.id}-${item.label || itemIndex}`);
      tasks.push({
        id: baseId,
        label: item.label || `Task ${itemIndex + 1}`,
        description: item.text,
        parentId: null,
        isChild: false
      });
      item.subitems?.forEach((sub, subIndex) => {
        tasks.push({
          id: this.toControlId(`${section.id}-${item.label || itemIndex}-${sub.label || subIndex}`),
          label: sub.label || `${item.label ?? 'Task'} ${itemIndex + 1}.${subIndex + 1}`,
          description: sub.text,
          parentId: baseId,
          isChild: true
        });
      });
    });
    return tasks;
  }

  private buildPhaseTaskForms(groupsMap: Record<PhaseType, PhaseTaskGroup[]>): Record<PhaseType, FormGroup> {
    const forms = {} as Record<PhaseType, FormGroup>;
    for (const phase of this.deploymentPhases) {
      const groups = groupsMap[phase.type];
      if (!groups?.length) {
        forms[phase.type] = this.fb.group({});
        continue;
      }
      const controls: Record<string, FormControl<boolean>> = {};
      groups.forEach(group => {
        group.tasks.forEach(task => {
          controls[task.id] = this.fb.control(false, { nonNullable: true });
        });
      });
      forms[phase.type] = this.fb.group(controls);
    }
    return forms;
  }

  private buildSiteSurveySubmission(): SiteSurveySubmission {
    return {
      phase: 'SiteSurvey',
      submittedAt: new Date().toISOString(),
      responses: this.collectSiteSurveyProgress().responses,
    };
  }

  private toControlId(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
}
