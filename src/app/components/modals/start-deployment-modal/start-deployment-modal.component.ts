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
import { ToastrService } from 'ngx-toastr';
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
  type: 'planned' | 'siteSurvey' | 'receiving' | 'installation' | 'cabling' | 'labeling' | 'handoff' | 'complete';
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
  isRequiredOn?: 'yes' | 'no' | 'both' | null;
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
  followUpsRequiredWhen?: 'yes' | 'no' | 'both' | null;
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

export interface StartDeploymentMetadata {
  name: string;
  dataCenter: string;
  vendorId: string;
  vendorName: string;
}

export interface StartDeploymentDialogResult {
  action: 'save';
  progress: StartDeploymentProgressPayload;
  metadata?: StartDeploymentMetadata | null;
}

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
  private readonly toastr = inject(ToastrService);

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
            { label: '2.1.4', text: 'Confirm all optical modules (SFPs, QSFPs, GBICs) are included when receiving equipment.', subitems: [
              { label: '2.1.4.1', text: 'Confirm all optics received are assigned in the RFP.' },
              { label: '2.1.4.2', text: 'Determine whether any optics are missing and reconcile with purchasing.' }
            ]},
            { label: '2.1.5', text: 'Confirm any specialized cabling has been received.', subitems: [
              { label: '2.1.5.1', text: 'Direct Attach Copper (DAC).' },
              { label: '2.1.5.2', text: 'SAS cabling.' },
              { label: '2.1.5.3', text: 'VCP cabling.' }
            ]},
            { label: '2.1.6', text: 'Document any missing equipment including optics, power supplies, rack mounting kits, drives, and peripheral cables.', subitems: [
              { label: '2.1.6.1', text: 'For vendor projects, report shortages to the DE via email immediately.' },
              { label: '2.1.6.2', text: 'For DC Ops projects, report shortages to the DE and update the ticket.' }
            ]},
            { label: '2.1.7', text: 'Document and photograph any damaged equipment.', subitems: [
              { label: '2.1.7.1', text: 'For vendor projects, report all damages to the DE via email immediately.' },
              { label: '2.1.7.2', text: 'For DC Ops projects, report damages to the DE and update the ticket.' }
            ]},
            { label: '2.1.8', text: 'Scan all equipment serial numbers (not model numbers or asset tags) into the Comcast provided document using barcode scanners to avoid manual entry.', subitems: [
              { label: '2.1.8.1', text: 'Ensure serial and hostname associations remain accurate throughout the project.' }
            ]},
            { label: '2.1.9', text: 'Double-check all equipment serial numbers, device names, makes, and models after racking to ensure accuracy.' },
            { label: '2.1.10', text: 'Validate scanned serial numbers match work orders; the RFP sheet may be used to guide scanning and highlighting required fields.' }
          ]
        },
        {
          heading: '2.2 Move the gear to the Data Center',
          items: [
            { label: '2.2.1', text: 'Assemble small servers and switches before moving into the Data Center.' },
            { label: '2.2.1.1', text: 'Install NICs, drives, and cards prior to transport for small systems.' },
            { label: '2.2.2', text: 'Disassemble large devices to facilitate easier lifting and racking.', subitems: [
              { label: '2.2.2.1', text: 'Reassemble the unit once it is racked.' }
            ]},
            { label: '2.2.3', text: 'Organize all associated parts together.', subitems: [
              { label: '2.2.3.1', text: 'Keep equipment for each project together and separate from other projects while moving into the cage.' }
            ]}
          ]
        }
      ]
    },
    {
      id: 'installation',
      title: 'Installation Standards',
      summary: 'Mount, cable, and power all hardware in accordance with Comcast standards.',
      type: 'installation',
      narrative: [
        {
          heading: '3.0 Installation Standards',
          items: [
            { label: '3.0', text: 'Device installation at any Comcast Data Center should adhere to the Comcast installation standards outlined in the run book.' },
            { label: '3.1', text: 'Install all equipment per manufacturer requirements unless otherwise noted in the Comcast provided design document.' },
            { label: '3.2', text: 'If rails are not provided, solid ears may be used when appropriate.' },
            { label: '3.3', text: 'Mount equipment with the model-specific manufacturer supplied snap-in rails and/or rack mounting screws required by the project.' },
            { label: '3.4', text: 'Apply device name labels to the front and rear of each chassis using the naming provided in the Comcast design document.' },
            { label: '3.5', text: 'Install equipment in the correct cabinet, rack position, and RU per the design. Any changes must be approved by the Deployment Engineer and reflected in as-built documentation for DCIM accuracy.' },
          ],
        },
        {
          heading: '3.6 Airflow & Power',
          items: [
            { label: '3.6', text: 'Install all equipment with the correct airflow orientation.' },
            { label: '3.7', text: 'Seal unused rack positions with blanking panels to prevent hot and cold air mixing.' },
            { label: '3.8', text: 'Connect power supplies only to assigned power strips and outlets—no exceptions.' },
            { label: '3.9', text: 'Ensure every device is powered from the rack in which it is installed.' },
            { label: '3.10', text: 'Remove loose equipment and combustible material from racks and surrounding datacenter space; dispose of extras per local recycling laws.' },
          ],
        },
        {
          heading: '3.11 Switch Placement & Validation',
          items: [
            { label: '3.11', text: 'Maintain sufficient adjacent RU for future upgrades. Cabinet switch counts should leave space for server growth; coordinate placement with the Deployment Engineer.' },
            { label: '3.12', text: 'Test and certify all installed cabling after installation using a Fluke DTX 1800 (or equivalent). Perform bi-directional tests meeting TIA/EIA-568-B requirements and record outlet identifiers with completion dates.' },
          ],
        },
        {
          heading: '3.13 Rack & Stack Execution',
          items: [
            { label: '3.13.1', text: 'Install hardware into racks following elevation diagrams and ensure rails and mounting hardware are properly torqued with balanced weight distribution.' },
            { label: '3.13.2', text: 'Connect power feeds according to the Comcast design drawing and document breaker assignments and load levels.' },
          ],
        },
      ]
    },
    {
      id: 'cabling',
      title: 'Cabling',
      summary: 'Install copper, fiber, and power cabling per Comcast Network Cabling Standards.',
      type: 'cabling',
      narrative: [
        {
          heading: '4.0 Cabling Standards Overview',
          items: [
            { label: '4.0', text: 'Follow the Comcast Network Cabling Standard (02-17-2021 Version 2.3 – Data Center Addendum) for all cabling activities.' },
          ],
        },
        {
          heading: '4.1 Power Cord Installation',
          items: [
            { label: '4.1', text: 'Place RPDUs per the Data Center Cabinet Power Addendum and route power cords horizontally to designated power strips.' },
            { label: '4.1.1', text: 'Apply the data center specific power cord color scheme (see 4.4.2).' },
            { label: '4.1.2', text: 'Secure power cables to each device using manufacturer straps or Velcro.' },
            { label: '4.1.3', text: 'Route power cables away from Cat6 and fiber cabling when possible and along RPDU mounting plates.' },
            { label: '4.1.4', text: 'Maintain a minimum 2" separation between data and power cables when running parallel.' },
            { label: '4.1.5', text: 'Cross data and power cables only at 90° angles while maintaining required separation.' },
            { label: '4.1.6', text: 'Use only NEMA 5-15R wall outlets for laptops or crash carts; never use RPDU outlets for unracked equipment.' },
            { label: '4.1.6.1', text: 'C14 to NEMA 5-15R adaptors are prohibited in datacenter spaces.' },
          ],
        },
        {
          heading: '4.2 Copper Cable Installation',
          items: [
            { label: '4.2', text: 'Install twisted pair copper cabling to maintain signal integrity; bundle loosely with natural lay to minimize crosstalk.' },
            { label: '4.2.1', text: 'Follow the Comcast standard color scheme for copper cabling.' },
            { label: '4.2.2', text: 'Order copper patch cords in 1-foot increments starting at 1-foot lengths to avoid excessive slack.' },
            { label: '4.2.3', text: 'Route cabling neatly within cable management when available and separate from fiber and power.' },
            { label: '4.2.4', text: 'Avoid parallel runs of Cat6 and power within 2 inches; if unavoidable, isolate or cross at 90°.' },
            { label: '4.2.5', text: 'Ensure cabling does not impede access to other devices; follow cabinet sides and cable management pathways.' },
            { label: '4.2.6', text: 'Split copper patch cables from the middle of the device to left and right cable managers in network racks.' },
            { label: '4.2.7', text: 'Use only predetermined cabinet openings for cable entry and exit.' },
            { label: '4.2.8', text: 'Never route cables inter-cabinet through open cabinet sides.' },
            { label: '4.2.9', text: 'Secure cables with ½" Velcro; tie wraps, zip ties, and waxed lacing twine are prohibited.' },
            { label: '4.2.10', text: 'Respect manufacturer bend radius limitations to avoid kinks or damage.' },
            { label: '4.2.11', text: 'Protect cables from sharp edges using fiber paper and lacing cord; tape is prohibited.' },
            { label: '4.2.12', text: 'Test and certify all Cat6 cabling end-to-end with approved equipment.' },
          ],
        },
        {
          heading: '4.3 Fiber Optic Cable Installation',
          items: [
            { label: '4.3', text: 'Install fiber cabling to maintain signal quality; bundle loosely and follow cabinet schemes with copper and power separated.' },
            { label: '4.3.1', text: 'Use Comcast standard color schemes for fiber (AQUA for OM3/OM4, YELLOW for OS2).' },
            { label: '4.3.2', text: 'Order fiber patch cords in 1-meter increments starting at 1 meter; limit service loops to 0.5 meter unless rails require more.' },
            { label: '4.3.3', text: 'Ensure fiber cabling does not impede device access and follows cabinet edges or management.' },
            { label: '4.3.4', text: 'Split fiber cables from the middle of the device to left/right cable managers.' },
            { label: '4.3.5', text: 'Secure fiber with ½" Velcro; protect connectors, keeping end caps on until installation completes and clean before mating.' },
            { label: '4.3.6', text: 'Never exceed manufacturer bend radius and avoid stepping on fiber cabling.' },
            { label: '4.3.7', text: 'Route to front ports by splitting media evenly to both sides of the cabinet; ensure tidy dress for vertical line cards.' },
            { label: '4.3.8', text: 'Clean and inspect all optical connectors, patch panels, and equipment ports prior to final connections.' },
          ],
        },
        {
          heading: '4.4 Patch & Power Cord Standards',
          items: [
            { label: '4.4', text: 'Standardize patch and power cord colors to reduce inventory and maintain consistency across data centers.' },
            { label: '4.4.1', text: 'Use Category 6, 28AWG unshielded twisted pair copper cords with standardized colors for each facility type.', subitems: [
              { label: '4.4.1.1', text: 'NDC: Blue (In-band), Red (Out-of-band), Yellow (Crossover), Green (Rollover).' },
              { label: '4.4.1.2', text: 'RDC: Blue (In-band), Red (Out-of-band), Yellow (Crossover), Green (Rollover).' },
              { label: '4.4.1.3', text: 'Fiber optics: AQUA for OM3/OM4 multimode, YELLOW for OS2 single-mode.' },
            ]},
            { label: '4.4.2', text: 'Apply data center specific power cable markings and ½" black Velcro for cord retention.', subitems: [
              { label: '4.4.2.1', text: 'NDC: PSU1 black cable with yellow tape; PSU2 black cable with blue tape.' },
              { label: '4.4.2.2', text: 'RDC: PSU1 black cable with red tape; PSU2 black cable with blue tape.' },
              { label: '4.4.2.3', text: 'Other facilities (CNF, Dry Creek, Stone Mountain, Titan) follow run book power feed color guidance.' },
            ]},
            { label: '4.4.3', text: 'Note: non-plenum cable is standard unless local code requires plenum-rated cable.' },
          ],
        },
      ]
    },
    {
      id: 'labeling',
      title: 'Labeling Standards',
      summary: 'Print, apply, and verify all labels per Comcast labeling standards.',
      type: 'labeling',
      narrative: [
        {
          heading: '5.0 Labeling Overview',
          items: [
            { label: '5.0', text: 'Apply standard labeling throughout Comcast facilities to simplify troubleshooting and inventory.' },
          ],
        },
        {
          heading: '5.1 Printing of All Labels',
          items: [
            { label: '5.1.1', text: 'Print labels using Comcast-approved materials (Panduit Vinyl labels on a Panduit TPD43ME or equivalent).' },
            { label: '5.1.2', text: 'Provide a label printer onsite for adjustments or replacements as needed.' },
            { label: '5.1.3', text: 'Maintain replacement ribbon inventory (Panduit P/N RMEH4BL).' },
            { label: '5.1.4', text: 'Ensure technicians responsible for label printing have Panduit Easy-Mark software.' },
          ],
        },
        {
          heading: '5.2 Trunk Cable Labels',
          items: [
            { label: '5.2.1', text: 'Use Panduit S200 line thermal transfer self-laminating labels with a minimum 0.75" printable area.' },
            { label: '5.2.2', text: 'Wrap labels 2.25" from the connector end; do not flag.' },
            { label: '5.2.3', text: 'Include near-end and far-end patch panel names and ports matching DCIM documentation.' },
          ],
        },
        {
          heading: '5.3 Device Name Labels',
          items: [
            { label: '5.3.1', text: 'Label servers and network gear front and rear with hostnames using Brother P-Touch (TZe-231) or Panduit (C300X038YJT) media.' },
            { label: '5.3.2', text: 'Use Consolas font with sizing to accommodate QR codes and two lines of text.' },
            { label: '5.3.3', text: 'Include QR code, hostname, and serial number on device labels.' },
            { label: '5.3.4', text: 'If rear space is limited, affix labels to rails and include removable front covers as needed.' },
          ],
        },
        {
          heading: '5.4 Copper & Fiber Patch Cord Labels',
          items: [
            { label: '5.4.1', text: 'Use Panduit S200X225VATY white labels for copper and fiber patch cords.' },
            { label: '5.4.2', text: 'Print with Arial Narrow font size 8–10, maximizing readability without truncation.' },
            { label: '5.4.3', text: 'List all cable hops on the label per run book examples.' },
            { label: '5.4.4', text: 'Flag labels rather than wrapping them.' },
            { label: '5.4.5', text: 'Orient labels toward the cabinet door opening.' },
            { label: '5.4.6', text: 'Place labels 2–3" from the end of the cable (6–8" for patch panel terminations).' },
            { label: '5.4.7', text: 'Follow the labeling syntax Rack.RU:slot/port - DestinationRack.RU:slot/port.' },
          ],
        },
        {
          heading: '5.5 Power Cord Labels',
          items: [
            { label: '5.5.1', text: 'Use Panduit S200X225VATY labels for power cords with Consolas font size 12.' },
            { label: '5.5.2', text: 'Apply labels upright facing outside the cabinet and include RPDU receptacle mapping.' },
            { label: '5.5.3', text: 'Apply color tape at each end of the power cable immediately after the boot per facility standards.' },
            { label: '5.5.4', text: 'Velcro each power cable to the associated power supply.' },
            { label: '5.5.5', text: 'Document RPDU orientation (e.g., NDC: Power Strip 1A right side, 1B left side when facing rear).' },
          ],
        },
      ]
    },
    {
      id: 'handoff',
      title: 'Handoff',
      summary: 'Complete final validation, documentation, and sign-off for deployment handoff.',
      type: 'handoff',
      narrative: [
        {
          heading: '6.0 Deployment Handoff Overview',
          items: [
            { label: '6.0', text: 'Use the Hardware Installation Handoff Checklist to verify deployments are complete and ready for Comcast acceptance.' },
          ],
        },
        {
          heading: '6.1 Definition & Daily Review',
          items: [
            { label: '6.1', text: 'Reserve the final installation day for review and verification by the Comcast team.' },
            { label: '6.1.1', text: 'Review the project daily with the team lead or DE to monitor cable routing, major issues, and concerns.' },
          ],
        },
        {
          heading: '6.2 Vendor Responsibilities',
          items: [
            { label: '6.2.1', text: 'Configure management IPs and credentials on deployed devices.' },
            { label: '6.2.2', text: 'Rework any items identified as incomplete or incorrect.' },
            { label: '6.2.3', text: 'Provide pictures of completed work, including detailed evidence for any issues identified (hostname labels, serial numbers, cable labels, etc.).' },
            { label: '6.2.4', text: 'Capture cabinet photos per Comcast camera setup guidance (front/rear top, middle, bottom) at highest resolution and upload to project OneDrive folders.' },
            { label: '6.2.5', text: 'Provide final as-built documentation.' },
            { label: '6.2.6', text: 'Deliver port-to-port test results with highlighted discrepancies and remediation timeline prior to Comcast connectivity validation.' },
          ],
        },
        {
          heading: '6.3 Comcast Engineer Responsibilities',
          items: [
            { label: '6.3.1', text: 'Perform final engineer validation, confirming in-band and out-of-band connections.' },
            { label: '6.3.1.2', text: 'Inspect work with the vendor to complete the site Handoff Checklist.' },
            { label: '6.3.2', text: 'Deployment Engineer validates final project state and releases vendor from site.' },
            { label: '6.3.2.1', text: 'Confirm all connections are up, operational, and aligned with the design.' },
            { label: '6.3.3', text: 'Obtain signatures from both Comcast and vendor representatives on the handoff sheet.' },
          ],
        },
        {
          heading: '6.4 Final Engineer Validation Checklist',
          items: [
            { label: '6.4.1', text: 'Verify physical connections against the design.' },
            { label: '6.4.2', text: 'Check all labeling for accuracy and completeness.' },
            { label: '6.4.3', text: 'Confirm all fiber connections and ports are cleaned and scoped.' },
            { label: '6.4.4', text: 'Inspect cabling and cords for jacket condition, bend radius, routing, and dressing.' },
            { label: '6.4.5', text: 'Test end-to-end device connectivity and record results.' },
            { label: '6.4.6', text: 'Verify terminal server and web access to devices when applicable.' },
            { label: '6.4.7', text: 'Generate punch-list items for outstanding deployment issues.' },
            { label: '6.4.8', text: 'Resolve punch-list entries with photo evidence for each remediation.' },
            { label: '6.4.9', text: 'Confirm cleanliness of workplace locations and surrounding areas.' },
          ],
        },
        {
          heading: '6.5 Handoff Documentation',
          items: [
            { label: '6.5', text: 'Complete the Hardware Installation Handoff Checklist, capturing site information, key dates, and participant sign-off (vendor and Comcast).' },
          ],
        },
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
    if (index === this.activePhaseIndex()) return;
    if (index > this.activePhaseIndex() && !this.validateCurrentStepStrict()) {
      return;
    }
    this.advanceToPhase(index, 0);
  }

  protected goToNextStep(): void {
    if (!this.validateCurrentStepStrict()) {
      return;
    }
    if (this.isAtFinalStep()) return;

    const groups = this.getPhaseTaskGroups(this.currentPhaseType());
    debugger;
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
    const metadata = this.project ? null : this.buildDeploymentMetadata();
    this.dialogRef.close({ action: 'save', progress, metadata });
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
    const errors = this.collectSiteSurveyErrors();
    if (errors.length) {
      this.siteSurveyForm.markAllAsTouched();
      this.showValidationErrors(errors);
      return;
    }
    if (this.siteSurveyForm.invalid) { // fallback guard
      this.siteSurveyForm.markAllAsTouched();
      return;
    }

    const submission = this.buildSiteSurveySubmission();
    const progress = this._buildProgressPayload(submission);
    const metadata = this.project ? null : this.buildDeploymentMetadata();
    this.dialogRef.close({ action: 'save', progress, metadata });
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

  private buildDeploymentMetadata(): StartDeploymentMetadata {
    const raw = this.metaForm.getRawValue();
    const vendor = this.vendorOptions().find(option => option.id === raw.vendorId);
    return {
      name: raw.name.trim(),
      dataCenter: raw.dataCenter.trim(),
      vendorId: raw.vendorId,
      vendorName: vendor?.name ?? raw.vendorId,
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

  private validateCurrentStepStrict(): boolean {
    const phase = this.currentPhaseType();
    if (phase === 'siteSurvey') {
      const errors = this.collectSiteSurveyErrors();
      if (errors.length) {
        this.siteSurveyForm.markAllAsTouched();
        this.showValidationErrors(errors);
        return false;
      }
    }
    if (phase === 'receiving') {
      const errors = this.collectReceivingErrors();
      if (errors.length) {
        this.receivingForm.markAllAsTouched();
        this.showValidationErrors(errors);
        return false;
      }
    }
    return true;
  }

  private collectSiteSurveyErrors(): string[] {
    const errors: string[] = [];
    this.siteSurveyQuestions.forEach(question => {
      const group = this.questionGroup(question.id);
      const status = group.get('status')?.value as 'yes' | 'no' | null;
      if (!status) {
        errors.push(`${question.displayId ?? question.id}: select Yes or No.`);
      }
      const notesCtrl = group.get('notes');
      if (notesCtrl) {
        const notesRequired = status === 'no' && question.requireNotesWhenNo;
        if (notesRequired && !(notesCtrl.value ?? '').trim()) {
          errors.push(`${question.displayId ?? question.id}: add follow-up details.`);
        }
      }
    });
    return errors;
  }

  private collectReceivingErrors(): string[] {
    const errors: string[] = [];
    this.receivingQuestionGroups.forEach(group => {
      group.questions.forEach(question => {
        const form = this.receivingForm.get(question.id) as FormGroup | null;
        if (!form) return;

        if (question.controlType === 'radio') {
          const status = form.get('status')?.value as 'yes' | 'no' | null;
          if (!status) {
            errors.push(`${question.label}: select Yes or No.`);
            return;
          }
          const notesCtrl = form.get('notes');
          if (notesCtrl) {
            const notesRequired = this.isReceivingNotesRequired(question, status);
            if (notesRequired && !(notesCtrl.value ?? '').trim()) {
              errors.push(`${question.label}: provide notes for a "${status.toUpperCase()}" response.`);
            }
          }
          const followUpsGroup = form.get('followUps') as FormGroup | null;
          if (followUpsGroup) {
            (question.followUps ?? []).forEach(followUp => {
              const requirement = this.followUpRequirement(followUp, question);
              const needsResponse =
                requirement === 'both'
                  ? status === 'yes' || status === 'no'
                  : requirement
                  ? status === requirement
                  : false;
              if (needsResponse) {
                const value = (followUpsGroup.get(followUp.id)?.value ?? '').trim();
                if (!value) {
                  errors.push(`${followUp.label}: enter follow-up details.`);
                }
              }
            });
          }
          return;
        }

        if (question.controlType === 'checkbox') {
          const notesCtrl = form.get('notes');
          if (notesCtrl) {
            const checked = !!form.get('checked')?.value;
            const notesRequired = this.isCheckboxNotesRequired(question, checked);
            if (notesRequired && !(notesCtrl.value ?? '').trim()) {
              errors.push(`${question.label}: add notes when this is ${checked ? 'checked' : 'unchecked'}.`);
            }
          }
          return;
        }

        if (question.controlType === 'text') {
          const textValue = (form.get('text')?.value ?? '').trim();
          if (question.requireText && !textValue) {
            errors.push(`${question.label}: provide the requested details.`);
          }
        }
      });
    });
    return errors;
  }

  private isReceivingNotesRequired(question: ReceivingQuestion, status: 'yes' | 'no' | null): boolean {
    const requirement = question.requireNotesForStatus ?? (question.requireNotesWhenNo ? 'no' : null);
    return requirement === 'both'
      ? status === 'yes' || status === 'no'
      : requirement
      ? status === requirement
      : false;
  }

  private isCheckboxNotesRequired(question: ReceivingQuestion, checked: boolean): boolean {
    const requirement = question.requireNotesForStatus ?? (question.requireNotesWhenNo ? 'no' : null);
    return requirement === 'both'
      ? true
      : requirement === 'yes'
      ? checked
      : requirement === 'no'
      ? !checked
      : false;
  }

  private followUpRequirement(
    followUp: ReceivingQuestionFollowUp,
    question: ReceivingQuestion
  ): 'yes' | 'no' | 'both' | null {
    return (
      followUp?.isRequiredOn ??
      question.followUpsRequiredWhen ??
      question.followUpsRequiredFor ??
      ((question.followUps?.length ?? 0) > 0 ? 'no' : null)
    );
  }

  private showValidationErrors(errors: string[]): void {
    if (!errors.length) return;
    const maxToShow = 5;
    const message =
      errors
        .slice(0, maxToShow)
        .map(err => `• ${err}`)
        .join('<br>') +
      (errors.length > maxToShow ? '<br>• ...' : '');
    this.toastr.error(message, 'Complete required items', {
      enableHtml: true,
      timeOut: 6000,
    });
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
        Object.entries(followUps.controls).forEach(([followUpId, control]) => {
          const followMeta = question.followUps?.find(item => item.id === followUpId);
          const followRequirement =
            followMeta?.isRequiredOn ??
            question.followUpsRequiredWhen ??
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
          { id: 'receiving-2-1-8', label: '2.1.8', text: 'All equipment serial numbers are to be scanned into the Comcast provided document using a barcode scanner.', controlType: 'checkbox'},
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
