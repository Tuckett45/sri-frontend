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
import { MatSelectModule } from '@angular/material/select';
import { Deployment } from 'src/app/features/deployment/models/deployment.models';
import {
  SiteSurveyProgress,
  SiteSurveyProgressEntry,
  SiteSurveySubmission,
  StartDeploymentProgressPayload,
  PhaseQuestionProgress,
} from 'src/app/features/deployment/models/deployment-progress.model';

interface SiteSurveyQuestion {
  id: string;
  title: string;
  detailsPrompt?: string;
  requireNotesWhenNo?: boolean;
  info?: string;
  displayId?: string;
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

type ReceivingControlType = 'radio' | 'checkbox' | 'text';

interface ReceivingQuestionFollowUp {
  id: string;
  label: string;
  prompt: string;
}

interface ReceivingQuestion {
  id: string;
  label: string;
  text: string;
  controlType: ReceivingControlType;
  notesPrompt?: string;
  requireNotesWhenNo?: boolean;
  requireText?: boolean;
  requireNotesForStatus?: 'yes' | 'no' | 'both' | null;
  followUpsRequiredFor?: 'yes' | 'no' | 'both' | null;
  radioLabels?: { yes: string; no: string };
  followUps?: ReceivingQuestionFollowUp[];
  isChild?: boolean;
}

interface ReceivingQuestionGroup {
  heading: string;
  intro?: string | null;
  questions: ReceivingQuestion[];
}

type VendorOption = { id: string; name: string };
type DataCenterOption = { id: string; name: string };

export type StartDeploymentDialogResult = {
  action: 'save';
  progress: StartDeploymentProgressPayload;
};

export interface StartDeploymentDialogData {
  project?: Deployment | null;
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
    MatInputModule,
    MatSelectModule,
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
  protected receivingForm!: FormGroup;

  /** NEW: deployment metadata form for new deployments */
  protected metaForm!: FormGroup<{
    name: FormControl<string>;
    dataCenter: FormControl<string>;
    vendorId: FormControl<string>;
  }>;

  /** Simple in-memory option lists (replace with service data when ready) */
  private readonly vendorOptions = signal<VendorOption[]>([
    { id: 'ven-westward', name: 'Westward Infrastructure' },
    { id: 'ven-copperline', name: 'Copperline Cabling' },
    { id: 'ven-brightline', name: 'BrightLine Logistics' },
    { id: 'ven-labelcraft', name: 'LabelCraft Services' },
    { id: 'ven-equinix', name: 'Equinix Field Services' },
  ]);
  private readonly dataCenterOptions = signal<DataCenterOption[]>([
    { id: 'dc-chi', name: 'Chicago RDC' },
    { id: 'dc-phx', name: 'Phoenix Core' },
    { id: 'dc-nwk', name: 'Newark Hub' },
    { id: 'dc-aus', name: 'Austin Edge' },
    { id: 'dc-bna', name: 'Nashville RDC' },
  ]);

  vendors(): VendorOption[] { return this.vendorOptions(); }
  dataCenters(): DataCenterOption[] { return this.dataCenterOptions(); }

  protected receivingQuestionGroups: ReceivingQuestionGroup[] = [];
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
      summary: 'Receive and inventory gear at data centers.',
      body: 'Section 2: Receive and Inventory Gear at Data Centers.',
      type: 'receiving',
      narrative: [
        {
          heading: 'Section 2: Receive and Inventory Gear at Data Centers',
          items: [
            {
              label: '2.0',
              text: 'Vendor will be responsible for establishing a reliable receiving and inventory process that will prevent the misplacement of any project equipment or other assets.'
            }
          ]
        },
        {
          heading: '2.1 Receiving Equipment',
          items: [
            { label: '2.1.1', text: 'Ensure all equipment on the Work Order is inventoried and accounted for.', subitems: [
              { label: '2.1.1.1', text: 'Compare the Work Order details to the equipment received.' }
            ]},
            { label: '2.1.2', text: 'Ensure all the equipment on the Work Order matches the materials in the run list.', subitems: [
              { label: '2.1.2.1', text: 'Compare the Work Order to the RFP; has everything been ordered?' }
            ]},
            { label: '2.1.3', text: 'Check airflow of equipment to match up with rack placement orientation.', subitems: [
              { label: '2.1.3.1', text: 'Do the fans and power supplies match airflow?' },
              { label: '2.1.3.2', text: 'Do the fans and power supplies match each other?', subitems: [
                { label: '2.1.3.2.1', text: 'All FRU should have the same airflow.' }
              ]}
            ]},
            { label: '2.1.4', text: 'Confirm all optical modules (SFPs, QSFPs, GBICs) are included when receiving equipment.' },
            { label: '2.1.5', text: 'Confirm any specialized cabling has been received.' },
            { label: '2.1.6', text: 'Document any missing equipment including but not limited to optics, power supplies, rack mounting kits, drives, and peripheral cables.' },
            { label: '2.1.7', text: 'Document and photograph any damaged equipment.' },
            { label: '2.1.8', text: 'All equipment serial numbers (not model number or asset tag) are to be scanned into the Comcast provided document using a scanner that allows for direct barcode scanning from device to document.' },
            { label: '2.1.9', text: 'Double-check all equipment serial numbers, device names, makes and models after the equipment is racked in a cabinet to ensure accuracy.' },
            { label: '2.1.10', text: 'The scanned serial numbers should match the serial numbers in the work orders. Note for DEs: The RFP sheet or a version of it can be used to scan serial numbers and highlight fields such as SN, Cab, RU, etc.' }
          ]
        },
        {
          heading: '2.2 Move the gear to the Data Center',
          items: [
            { label: '2.2.1', text: 'Assemble small servers and switches before moving into the Data Center.' },
            { label: '2.2.2', text: 'Disassemble large devices to facilitate easier lifting and racking.' },
            { label: '2.2.3', text: 'Organize all parts that are associated with each other.' }
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
        { heading: '3.1 Rack & Stack', items: [
          { label: '3.1.1', text: 'Install hardware into racks following elevation diagrams.', subitems: [
            { label: '3.1.1.1', text: 'Verify rails and mounting hardware are torqued appropriately.' },
            { label: '3.1.1.2', text: 'Ensure weight distribution aligns with rack standards.' }
          ]},
          { label: '3.1.2', text: 'Connect power feeds per design drawing.' }
        ]},
        { heading: '3.2 Power Validation', items: [
          { label: '3.2.1', text: 'Verify redundant power paths per rack design.' },
          { label: '3.2.2', text: 'Document breaker assignments and load levels.' }
        ]}
      ]
    },
    {
      id: 'cabling',
      title: 'Cabling',
      summary: 'Lay in copper and fiber, manage pathways, and test connectivity.',
      type: 'cabling',
      narrative: [
        { heading: '4.1 Structured Cabling', items: [
          { label: '4.1.1', text: 'Route cables per pathway standards.' },
          { label: '4.1.2', text: 'Bundle and secure cables with velcro wraps.' },
          { label: '4.1.3', text: 'Label terminations per schema.' }
        ]},
        { heading: '4.2 Testing', items: [
          { label: '4.2.1', text: 'Run continuity tests on all copper drops.' },
          { label: '4.2.2', text: 'Document fiber light levels and certify results.' }
        ]}
      ]
    },
    {
      id: 'labeling',
      title: 'Labeling',
      summary: 'Generate and apply labels to meet operations standards.',
      type: 'labeling',
      narrative: [
        { heading: '5.1 Label Application', items: [
          { label: '5.1.1', text: 'Apply rack, device, and cable labels with approved materials.' },
          { label: '5.1.2', text: 'Capture photos of labeling for documentation.' }
        ]}
      ]
    },
    {
      id: 'handoff',
      title: 'Handoff',
      summary: 'Compile validation evidence and finalize stakeholder approvals.',
      type: 'handoff',
      narrative: [
        { heading: '6.1 Operational Readiness', items: [
          { label: '6.1.1', text: 'Provide deployment summary packet to stakeholders.' },
          { label: '6.1.2', text: 'Confirm monitoring systems report expected status.' },
          { label: '6.1.3', text: 'Schedule handoff review with DE and Ops.' }
        ]},
        { heading: '6.4 Punch List', items: [
          { label: '6.4.8', text: 'Generate punch list items for issues.' },
          { label: '6.4.9', text: 'Resolve punch list with photographic evidence.' }
        ]}
      ]
    }
  ];

  protected readonly siteSurveyQuestions: SiteSurveyQuestion[] = [
    { id: 'ss-1-0', displayId: '1.0', title: 'Vendor or Operations project lead must check the Data Center and cabinets assigned for the project.', requireNotesWhenNo: true, detailsPrompt: 'If "No", explain what remains unchecked and who is responsible.' },
    { id: 'ss-1-1', displayId: '1.1', title: 'Before installation begins, confirm cabinet rail requirements are properly set and appropriate for the project; ensure the assigned RU are open and available.', requireNotesWhenNo: true, detailsPrompt: 'If not, why not? Is there an available option?' },
    { id: 'ss-1-2', displayId: '1.2', title: 'Ensure the assigned patch panel and breakout panel ports are open and available.', requireNotesWhenNo: true, detailsPrompt: 'If not, why not? Are there cables which should have been removed from a previous decommission project? Check the server cabinets and the network cabinets.' },
    { id: 'ss-1-3', displayId: '1.3', title: 'Ensure the assigned power strip outlets are open and available.', requireNotesWhenNo: true, detailsPrompt: 'If not, why not? Are the right connectors specified for the assigned outlets?' },
    { id: 'ss-1-4', displayId: '1.4', title: 'General inspection of the site for cleanliness and proper maintenance.', requireNotesWhenNo: true, detailsPrompt: 'Report issues, roadblocks, and obstacles.' },
    { id: 'ss-1-5', displayId: '1.5', title: 'Confirm DE provided pictures of equipment showing port name & NIC card placement and rack elevations.', requireNotesWhenNo: true, detailsPrompt: 'If "No", list missing images or documentation.' }
  ];

  private phaseTaskGroupsMap!: Record<PhaseType, PhaseTaskGroup[]>;
  private phaseTaskFormsMap!: Record<PhaseType, FormGroup>;

  ngOnInit(): void {
    // ---- Deployment metadata form (only used for NEW deployments) ----
    this.metaForm = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      dataCenter: ['', Validators.required],
      vendorId: ['', Validators.required],
    });

    if (this.project) {
      // Pre-fill when editing/viewing existing deployment (form not shown in UI for existing)
      this.metaForm.patchValue({
        name: this.project.name ?? '',
        dataCenter: this.project.dataCenter ?? '',
        vendorId: '', // if you have a vendorId, put it here
      }, { emitEvent: false });
    } else {
      // Choose sensible defaults for new deployment
      this.metaForm.patchValue({
        dataCenter: this.dataCenterOptions()[0]?.name ?? '',
        vendorId: this.vendorOptions()[0]?.id ?? '',
      }, { emitEvent: false });
    }

    // ---- Existing wizard setup ----
    this.emptyFormGroup = this.fb.group({});
    this.siteSurveyForm = this.buildSiteSurveyForm();
    this.receivingQuestionGroups = this.buildReceivingQuestionGroups();
    this.receivingForm = this.buildReceivingForm(this.receivingQuestionGroups);

    // prime validators for receiving
    this.receivingQuestionGroups.forEach(group => {
      group.questions.forEach(question => {
        const formGroup = this.receivingQuestionGroup(question.id);
        let initialStatus: 'yes' | 'no' | null = null;
        if (question.controlType === 'radio') {
          initialStatus = (formGroup?.get('status')?.value as 'yes' | 'no' | null) ?? null;
        } else if (question.controlType === 'checkbox') {
          initialStatus = formGroup?.get('checked')?.value ? 'yes' : 'no';
        }
        this.enforceReceivingValidators(question, initialStatus, formGroup);
      });
    });

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
    if (this.isAtFinalStep()) return;

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
    // If starting a brand-new deployment, require metadata first
    if (!this.project && this.metaForm.invalid) {
      this.metaForm.markAllAsTouched();
      return;
    }
    const progress = this._buildProgressPayload();
    this.dialogRef.close({ action: 'save', progress });
  }

  protected onStatusChange(question: SiteSurveyQuestion, value: 'yes' | 'no'): void {
    const group = this.questionGroup(question.id);
    this.enforceNotesValidator(question, value, group);
  }

  protected receivingQuestionGroup(id: string): FormGroup {
    return (this.receivingForm.get(id) as FormGroup | null) ?? this.emptyFormGroup;
  }

  protected onReceivingStatusChange(question: ReceivingQuestion, value: 'yes' | 'no'): void {
    if (question.controlType !== 'radio') return;
    const group = this.receivingQuestionGroup(question.id);
    this.enforceReceivingValidators(question, value, group);
  }

  protected radioError(group: FormGroup | null): boolean {
    if (!group) return false;
    const control = group.get('status');
    return !!control && control.invalid && (control.touched || this.siteSurveySubmitAttempted());
  }

  protected receivingRadioError(group: FormGroup | null): boolean {
    if (!group) return false;
    const control = group.get('status');
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected notesError(group: FormGroup | null): boolean {
    if (!group) return false;
    const control = group.get('notes');
    return !!control && control.invalid && (control.touched || this.siteSurveySubmitAttempted());
  }

  protected receivingNotesError(group: FormGroup | null): boolean {
    if (!group) return false;
    const control = group.get('notes');
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected receivingFollowUpError(questionId: string, followUpId: string): boolean {
    const group = this.receivingQuestionGroup(questionId);
    const followUps = group?.get('followUps') as FormGroup | null;
    if (!followUps) return false;
    const control = followUps.get(followUpId);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected receivingTextError(questionId: string): boolean {
    const group = this.receivingQuestionGroup(questionId);
    const control = group?.get('text');
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected onSiteSurveySubmit(): void {
    this.siteSurveySubmitAttempted.set(true);
    if (this.siteSurveyForm.invalid) {
      this.siteSurveyForm.markAllAsTouched();
      return;
    }

    const submission = this.buildSiteSurveySubmission();
    const progress = this._buildProgressPayload(submission);
    this.dialogRef.close({ action: 'save', progress });
  }

  protected close(result?: unknown): void {
    this.dialogRef.close(result);
  }

  /** renamed to avoid any accidental shadowing by a field */
  private _buildProgressPayload(submittedSiteSurvey: SiteSurveySubmission | null = null): StartDeploymentProgressPayload {
    const payload: StartDeploymentProgressPayload = {
      projectId: this.project?.id ?? null,
      activePhaseIndex: this.activePhaseIndex(),
      activeTaskTabIndex: this.activeTaskTabIndex(),
      siteSurvey: this.collectSiteSurveyProgress(),
      receiving: this.collectReceivingProgress() ?? null,
      phaseTasks: this.collectPhaseTaskProgress(),
      submittedSiteSurvey,
    };
    return payload;
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

  private collectReceivingProgress(): PhaseQuestionProgress {
    const responses = [] as PhaseQuestionProgress['responses'];

    this.receivingQuestionGroups.forEach(group => {
      group.questions.forEach(question => {
        const form = this.receivingForm.get(question.id) as FormGroup | null;
        if (!form) return;

        if (question.controlType === 'radio') {
          const raw = form.getRawValue() as {
            status: 'yes' | 'no' | null;
            notes?: string;
            followUps?: Record<string, string>;
          };

          const followUps = (question.followUps ?? []).map(followUp => {
            const value = raw?.followUps?.[followUp.id] ?? '';
            const trimmed = value?.trim() ?? '';
            return {
              id: followUp.id,
              prompt: `${followUp.label} ${followUp.prompt}`.trim(),
              response: trimmed.length ? trimmed : null,
            };
          });

          responses.push({
            id: question.id,
            title: `${question.label} ${question.text}`.trim(),
            controlType: 'radio',
            status: raw?.status ?? null,
            notes: raw?.notes?.trim() ? raw.notes.trim() : null,
            followUps,
          });
          return;
        }

        if (question.controlType === 'checkbox') {
          const raw = form.getRawValue() as { checked?: boolean; notes?: string };
          responses.push({
            id: question.id,
            title: `${question.label} ${question.text}`.trim(),
            controlType: 'checkbox',
            checked: !!raw?.checked,
            notes: raw?.notes?.trim() ? raw.notes.trim() : null,
            followUps: [],
          });
          return;
        }

        const raw = form.getRawValue() as { text?: string };
        const trimmed = raw?.text?.trim() ?? '';
        responses.push({
          id: question.id,
          title: `${question.label} ${question.text}`.trim(),
          controlType: 'text',
          textResponse: trimmed.length ? trimmed : null,
          followUps: [],
        });
      });
    });

    return { responses };
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
      this.applyReceivingProgress(this.existingProgress.receiving ?? null);
      this.applyPhaseTaskProgress(this.existingProgress.phaseTasks ?? {});
      const groups = this.getPhaseTaskGroups(this.currentPhaseType());
      this.activeTaskTabIndex.set(this.clampTabIndex(requestedTab, groups.length));
    } else {
      this.applySiteSurveyProgress(null);
      this.applyReceivingProgress(null);
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

  private applyReceivingProgress(progress: PhaseQuestionProgress | null): void {
    const responses = new Map<string, PhaseQuestionProgress['responses'][number]>(
      (progress?.responses ?? []).map(entry => [entry.id, entry])
    );

    this.receivingQuestionGroups.forEach(group => {
      group.questions.forEach(question => {
        const entry = responses.get(question.id);
        const form = this.receivingForm.get(question.id) as FormGroup | null;
        if (!form) return;

        if (question.controlType === 'radio') {
          const status = entry?.status ?? null;
          const notesValue = entry?.notes ?? '';
          const followUps = form.get('followUps') as FormGroup | null;
          if (followUps) {
            const followUpValues = (question.followUps ?? []).reduce((acc, followUp) => {
              const match = entry?.followUps?.find(item => item.id === followUp.id);
              acc[followUp.id] = match?.response ?? '';
              return acc;
            }, {} as Record<string, string>);
            followUps.patchValue(followUpValues, { emitEvent: false });
          }

          form.patchValue(
            { status, notes: notesValue ?? '' },
            { emitEvent: false }
          );
          this.enforceReceivingValidators(question, status, form);
          return;
        }

        if (question.controlType === 'checkbox') {
          const legacyStatus = (entry as any)?.status ?? null;
          const checked =
            (entry as any)?.checked ?? (legacyStatus ? legacyStatus === 'yes' : false);
          const patch: Record<string, unknown> = { checked };
          if (form.contains('notes')) {
            const legacyNotes = (entry as any)?.notes ?? (entry as any)?.textResponse ?? '';
            patch['notes'] = legacyNotes ?? '';
          }
          form.patchValue(patch, { emitEvent: false });
          this.enforceReceivingValidators(question, checked ? 'yes' : 'no', form);
          return;
        }

        form.patchValue(
          { text: (entry as any)?.textResponse ?? (entry as any)?.notes ?? '' },
          { emitEvent: false }
        );
        this.enforceReceivingValidators(question, null, form);
      });
    });
  }

  private applyPhaseTaskProgress(progress: Record<string, Record<string, boolean>>): void {
    if (!progress) return;

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
    if (!notes) return;

    if (status === 'no' && question.requireNotesWhenNo) {
      notes.addValidators([Validators.required, Validators.minLength(3)]);
    } else {
      notes.removeValidators([Validators.required, Validators.minLength(3)]);
    }

    notes.updateValueAndValidity({ emitEvent: false });
  }

  private enforceReceivingValidators(
    question: ReceivingQuestion,
    status: 'yes' | 'no' | null,
    group: FormGroup | null
  ): void {
    if (!group) return;

    if (question.controlType === 'radio') {
      const notes = group.get('notes');
      if (notes) {
        const notesRequirement =
          question.requireNotesForStatus ?? (question.requireNotesWhenNo ? 'no' : null);
        const shouldRequireNotes =
          notesRequirement === 'both'
            ? status === 'yes' || status === 'no'
            : notesRequirement
            ? status === notesRequirement
            : false;
        notes.setValidators(
          shouldRequireNotes ? [Validators.required, Validators.minLength(3)] : []
        );
        notes.updateValueAndValidity({ emitEvent: false });
      }

      const followUps = group.get('followUps') as FormGroup | null;
      if (followUps) {
        Object.values(followUps.controls).forEach(control => {
          const followRequirement =
            question.followUpsRequiredFor ??
            ((question.followUps?.length ?? 0) > 0 ? 'no' : null);
          const shouldRequireResponse =
            followRequirement === 'both'
              ? status === 'yes' || status === 'no'
              : followRequirement
              ? status === followRequirement
              : false;
          control.setValidators(
            shouldRequireResponse ? [Validators.required, Validators.minLength(3)] : []
          );
          control.updateValueAndValidity({ emitEvent: false });
        });
      }
      return;
    }

    if (question.controlType === 'checkbox') {
      const notes = group.get('notes');
      if (notes) {
        const checkedControl = group.get('checked');
        const checked = !!checkedControl?.value;
        const notesRequirement =
          question.requireNotesForStatus ?? (question.requireNotesWhenNo ? 'no' : null);
        const shouldRequireNotes =
          notesRequirement === 'both'
            ? true
            : notesRequirement === 'yes'
            ? checked
            : notesRequirement === 'no'
            ? !checked
            : false;
        notes.setValidators(
          shouldRequireNotes ? [Validators.required, Validators.minLength(3)] : []
        );
        notes.updateValueAndValidity({ emitEvent: false });
      }
      return;
    }

    const textControl = group.get('text');
    if (textControl) {
      textControl.setValidators(
        question.requireText ? [Validators.required, Validators.minLength(3)] : []
      );
      textControl.updateValueAndValidity({ emitEvent: false });
    }
  }

  private clampPhaseIndex(index: number): number {
    if (!Number.isFinite(index)) return 0;
    const max = Math.max(this.deploymentPhases.length - 1, 0);
    return Math.min(Math.max(Math.trunc(index), 0), max);
  }

  private clampTabIndex(index: number, total: number): number {
    if (!Number.isFinite(index) || total <= 0) return 0;
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

  private buildReceivingQuestionGroups(): ReceivingQuestionGroup[] {
    return [
      {
        heading: '2.1 Receiving Equipment',
        intro: 'Validate every piece of equipment received against work orders, airflow requirements, optics, and cabling expectations.',
        questions: [
          { id: 'receiving-2-1-1', label: '2.1.1', text: 'Ensure all equipment on the Work Order is inventoried and accounted for.', controlType: 'checkbox' },
          { id: 'receiving-2-1-1-1', label: '2.1.1.1', text: 'Compare the Work Order details to the equipment received.', controlType: 'checkbox', isChild: true },
          { id: 'receiving-2-1-2', label: '2.1.2', text: 'Ensure all the equipment on the Work Order matches the materials in the run list.', controlType: 'checkbox' },
          { id: 'receiving-2-1-2-1', label: '2.1.2.1', text: 'Compare the Work Order to the RFP; has everything been ordered?', controlType: 'radio', notesPrompt: 'If "No", list outstanding material and expected arrival dates.', requireNotesForStatus: 'no', followUpsRequiredFor: 'no', isChild: true },
          { id: 'receiving-2-1-3', label: '2.1.3', text: 'Check airflow of equipment to match up with rack placement orientation.', controlType: 'checkbox' },
          { id: 'receiving-2-1-3-1', label: '2.1.3.1', text: 'Do the fans and power supplies match airflow?', controlType: 'radio', notesPrompt: 'If "No", specify the mismatched components and remediation plan.', requireNotesForStatus: 'no', followUpsRequiredFor: 'no', isChild: true },
          { id: 'receiving-2-1-3-2', label: '2.1.3.2', text: 'Do the fans and power supplies match each other?', controlType: 'radio', notesPrompt: 'If "No", outline the corrective action and affected gear.', requireNotesForStatus: 'no', followUpsRequiredFor: 'no', isChild: true },
          { id: 'receiving-2-1-3-2-1', label: '2.1.3.2.1', text: 'All FRU should have the same airflow.', controlType: 'checkbox', isChild: true },
          { id: 'receiving-2-1-4', label: '2.1.4', text: 'Confirm all optical modules (SFPs, QSFPs, GBICs) are included when receiving equipment.', controlType: 'checkbox' },
          { id: 'receiving-2-1-4-1', label: '2.1.4.1', text: 'Confirm all optics received are assigned in the RFP.', controlType: 'checkbox', isChild: true },
          { id: 'receiving-2-1-4-2', label: '2.1.4.2', text: 'Per the RFP, are there any optics missing?', controlType: 'radio', notesPrompt: 'If "No", list the optics that still need reconciliation.', requireNotesForStatus: 'no', followUpsRequiredFor: 'no', isChild: true },
          { id: 'receiving-2-1-5', label: '2.1.5', text: 'Confirm any specialized cabling has been received.', controlType: 'checkbox' },
          { id: 'receiving-2-1-5-1', label: '2.1.5.1', text: 'Direct Attach Copper (DAC) cabling received.', controlType: 'checkbox', isChild: true },
          { id: 'receiving-2-1-5-2', label: '2.1.5.2', text: 'SAS cabling received.', controlType: 'checkbox', isChild: true },
          { id: 'receiving-2-1-5-3', label: '2.1.5.3', text: 'VCP cabling received.', controlType: 'checkbox', isChild: true },
          { id: 'receiving-2-1-6', label: '2.1.6', text: 'Document any missing equipment including optics, power supplies, rack mounting kits, drives, and peripheral cables.', controlType: 'checkbox' },
          { id: 'receiving-2-1-6-1', label: '2.1.6.1', text: 'For vendor projects, report all shortages to the DE via email ASAP.', controlType: 'checkbox', isChild: true },
          { id: 'receiving-2-1-6-2', label: '2.1.6.2', text: 'For DC Ops projects, report all shortages to the DE via email ASAP and update the ticket.', controlType: 'checkbox', isChild: true },
          { id: 'receiving-2-1-7', label: '2.1.7', text: 'Document and photograph any damaged equipment.', controlType: 'radio', radioLabels: { yes: 'Damaged', no: 'No Damage' }, notesPrompt: 'If damaged, describe the issue and reference images or ticket numbers.', requireNotesForStatus: 'yes', followUpsRequiredFor: 'yes' },
          { id: 'receiving-2-1-7-1', label: '2.1.7.1', text: 'For vendor projects, report all damages to the DE via email ASAP.', controlType: 'checkbox', isChild: true },
          { id: 'receiving-2-1-7-2', label: '2.1.7.2', text: 'For DC Ops projects, report all damages to the DE and update the ticket.', controlType: 'checkbox', isChild: true },
          { id: 'receiving-2-1-8', label: '2.1.8', text: 'All equipment serial numbers are to be scanned into the Comcast provided document using a barcode scanner.', controlType: 'text', notesPrompt: 'Document scanning status, outstanding devices, or issues encountered.', requireText: true },
          { id: 'receiving-2-1-8-1', label: '2.1.8.1', text: 'Ensure the correct serial and hostname association is maintained throughout the project.', controlType: 'checkbox', isChild: true },
          { id: 'receiving-2-1-9', label: '2.1.9', text: 'Double-check all equipment serial numbers, device names, makes and models after the equipment is racked to ensure accuracy.', controlType: 'checkbox' },
          { id: 'receiving-2-1-10', label: '2.1.10', text: 'The scanned serial numbers should match the serial numbers in the work orders. Note for DEs: The RFP sheet or version of that can be used to scan serial numbers. Can also highlight the sections they need to fill in SN, Cab, RU, etc.', controlType: 'checkbox', notesPrompt: 'If mismatches were found, summarize resolution steps.', requireNotesForStatus: 'no' },
        ],
      },
      {
        heading: '2.2 Move the gear to the Data Center',
        intro: 'Prepare equipment for transport and organize it upon arrival to maintain project separation and readiness.',
        questions: [
          { id: 'receiving-2-2-1', label: '2.2.1', text: 'Assemble small servers and switches before moving into the Data Center.', controlType: 'checkbox' },
          { id: 'receiving-2-2-1-1', label: '2.2.1.1', text: 'NICs installed.', controlType: 'checkbox', isChild: true },
          { id: 'receiving-2-2-1-2', label: '2.2.1.2', text: 'Drives installed.', controlType: 'checkbox', isChild: true },
          { id: 'receiving-2-2-1-3', label: '2.2.1.3', text: 'Cards installed.', controlType: 'checkbox', isChild: true },
          { id: 'receiving-2-2-2', label: '2.2.2', text: 'Disassemble large devices to facilitate easier lifting and racking.', controlType: 'checkbox' },
          { id: 'receiving-2-2-2-1', label: '2.2.2.1', text: 'Reassemble the unit once it is racked.', controlType: 'checkbox', isChild: true },
          { id: 'receiving-2-2-3', label: '2.2.3', text: 'Organize all parts that are associated with each other.', controlType: 'checkbox' },
          { id: 'receiving-2-2-3-1', label: '2.2.3.1', text: 'Keep all equipment for each project together and separate from other projects as gear is being moved into the cage.', controlType: 'checkbox', isChild: true },
        ],
      },
    ];
  }

  private buildReceivingForm(groups: ReceivingQuestionGroup[]): FormGroup {
    const questionGroups: Record<string, FormGroup> = {};

    groups.forEach(group => {
      group.questions.forEach(question => {
        if (question.controlType === 'radio') {
          const followUpControls: Record<string, FormControl<string>> = {};
          (question.followUps ?? []).forEach(followUp => {
            followUpControls[followUp.id] = this.fb.control('', { nonNullable: true });
          });
          questionGroups[question.id] = this.fb.group({
            status: [null, Validators.required],
            notes: [''],
            followUps: this.fb.group(followUpControls),
          });
        } else if (question.controlType === 'checkbox') {
          const checkboxControls: Record<string, FormControl | FormGroup> = {
            checked: this.fb.control(false, { nonNullable: true }),
          };
          if (question.notesPrompt) {
            checkboxControls['notes'] = this.fb.control('');
          }
          questionGroups[question.id] = this.fb.group(checkboxControls);
        } else {
          questionGroups[question.id] = this.fb.group({
            text: [
              '',
              question.requireText ? [Validators.required, Validators.minLength(3)] : [],
            ],
          });
        }
      });
    });

    return this.fb.group(questionGroups);
  }

  private buildPhaseTaskGroups(): Record<PhaseType, PhaseTaskGroup[]> {
    const map = {} as Record<PhaseType, PhaseTaskGroup[]>;
    for (const phase of this.deploymentPhases) {
      if (phase.type === 'receiving') { map[phase.type] = []; continue; }
      if (!phase.narrative?.length) { map[phase.type] = []; continue; }
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

    const formatFallbackLabel = (path: number[]): string => path.join('.');

    const walk = (node: NarrativeItem, indexPath: number[], parentId: string | null): void => {
      const label = node.label || `Task ${formatFallbackLabel(indexPath)}`;
      const id = this.toControlId(`${section.id}-${label}`);
      tasks.push({
        id,
        label,
        description: node.text,
        parentId,
        isChild: parentId !== null
      });

      node.subitems?.forEach((child, childIndex) => {
        walk(child, [...indexPath, childIndex + 1], id);
      });
    };

    items.forEach((item, itemIndex) => {
      walk(item, [itemIndex + 1], null);
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
