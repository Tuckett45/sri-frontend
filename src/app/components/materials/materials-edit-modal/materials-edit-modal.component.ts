import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  MaterialAssetUpsert,
  MaterialAssignmentCreate,
  MaterialCountCreate,
  MaterialOrderDirection,
  MaterialOrderStatus,
  MaterialOrderUpsert,
  MaterialTransferCreate,
  MaterialUpsert,
  Material
} from 'src/app/models/materials.model';

/**
 * Which entity the modal is working with.
 * material/order/asset support both add and edit (backend upsert exists).
 * assignment/transfer/count are create-only (no backend update endpoint).
 */
export type MaterialsEditKind = 'material' | 'order' | 'asset' | 'assignment' | 'transfer' | 'count';

/** Payload union the modal can emit. */
export type MaterialsEditPayload =
  | MaterialUpsert
  | MaterialOrderUpsert
  | MaterialAssetUpsert
  | MaterialAssignmentCreate
  | MaterialTransferCreate
  | MaterialCountCreate;

/**
 * Reusable add/edit dialog for the editable Materials entities (materials, orders,
 * serialized assets). One component drives all three via [kind]; it holds a local
 * working copy of the model so Cancel discards cleanly, and emits the payload on save.
 *
 * Rendered as a lightweight custom overlay (matching the existing scanner overlay)
 * rather than a PrimeNG dialog, so the Materials module stays free of extra imports.
 */
@Component({
  selector: 'app-materials-edit-modal',
  templateUrl: './materials-edit-modal.component.html',
  styleUrls: ['./materials-edit-modal.component.scss'],
  standalone: false
})
export class MaterialsEditModalComponent {
  @Input() kind: MaterialsEditKind = 'material';

  /** Whether the modal is visible. */
  @Input() open = false;

  /** Materials list used to populate the material dropdown for orders/assets. */
  @Input() materials: Material[] = [];

  /** Working copies (bound to the form). Cast per kind in the template. */
  material: MaterialUpsert = this.emptyMaterial();
  order: MaterialOrderUpsert = this.emptyOrder();
  asset: MaterialAssetUpsert = this.emptyAsset();
  assignment: MaterialAssignmentCreate = this.emptyAssignment();
  transfer: MaterialTransferCreate = this.emptyTransfer();
  count: MaterialCountCreate = this.emptyCount();

  @Output() save = new EventEmitter<MaterialsEditPayload>();
  @Output() cancel = new EventEmitter<void>();

  readonly directions: MaterialOrderDirection[] = ['Intake', 'Export'];
  readonly orderStatuses: MaterialOrderStatus[] = ['Pending', 'Ordered', 'Received', 'Shipped', 'Cancelled'];
  readonly assetStatuses = ['InStock', 'Issued', 'Retired', 'Lost'] as const;

  /** These kinds can only be created via the modal (no backend edit endpoint). */
  private readonly createOnlyKinds: MaterialsEditKind[] = ['assignment', 'transfer', 'count'];

  private editingId: string | null = null;

  /** Open in "add new" mode with empty fields. */
  openForCreate(kind: MaterialsEditKind): void {
    this.kind = kind;
    this.editingId = null;
    this.material = this.emptyMaterial();
    this.order = this.emptyOrder();
    this.asset = this.emptyAsset();
    this.assignment = this.emptyAssignment();
    this.transfer = this.emptyTransfer();
    this.count = this.emptyCount();
    this.open = true;
  }

  /** Open in edit mode, pre-filled from an existing record (material/order/asset only). */
  openForEdit(kind: MaterialsEditKind, record: any): void {
    this.kind = kind;
    this.editingId = record?.id ?? null;
    if (kind === 'material') {
      this.material = { ...this.emptyMaterial(), ...record, id: record.id };
    } else if (kind === 'order') {
      this.order = { ...this.emptyOrder(), ...record, id: record.id };
    } else if (kind === 'asset') {
      this.asset = { ...this.emptyAsset(), ...record, id: record.id };
    }
    this.open = true;
  }

  get title(): string {
    const verb = this.editingId ? 'Edit' : 'Add';
    const nouns: Record<MaterialsEditKind, string> = {
      material: 'material',
      order: 'order',
      asset: 'asset',
      assignment: 'assignment',
      transfer: 'transfer',
      count: 'cycle count'
    };
    return `${verb} ${nouns[this.kind]}`;
  }

  get isEditing(): boolean {
    return !!this.editingId;
  }

  onSubmit(): void {
    if (this.kind === 'material') {
      if (!this.material.name?.trim()) return;
      this.syncAvailable();
      // VIMS "Material Description" is the primary label; mirror it into description too.
      if (!this.material.description?.trim()) this.material.description = this.material.name;
      this.save.emit({ ...this.material });
    } else if (this.kind === 'order') {
      if (!this.order.materialId || !this.order.quantity || this.order.quantity <= 0) return;
      this.save.emit({ ...this.order });
    } else if (this.kind === 'asset') {
      if (!this.asset.materialId) return;
      if (!this.asset.serialNumber && !this.asset.lotNumber) return;
      this.save.emit({ ...this.asset });
    } else if (this.kind === 'assignment') {
      if (!this.assignment.materialId || !this.assignment.quantityIssued || this.assignment.quantityIssued <= 0) return;
      this.save.emit({ ...this.assignment });
    } else if (this.kind === 'transfer') {
      if (!this.transfer.materialId || !this.transfer.fromSite || !this.transfer.toSite) return;
      if (this.transfer.fromSite === this.transfer.toSite) return;
      if (!this.transfer.quantity || this.transfer.quantity <= 0) return;
      this.save.emit({ ...this.transfer });
    } else if (this.kind === 'count') {
      if (!this.count.site?.trim()) return;
      this.save.emit({ ...this.count });
    }
  }

  onCancel(): void {
    this.open = false;
    this.cancel.emit();
  }

  /** Keeps Available Stock = Total − Reserved as the user edits the material form. */
  syncAvailable(): void {
    const total = Number(this.material.totalStock);
    const reserved = Number(this.material.reservedStock) || 0;
    if (Number.isFinite(total)) {
      this.material.availableStock = total - reserved;
      this.material.quantityOnHand = this.material.availableStock;
    }
  }

  private emptyMaterial(): MaterialUpsert {
    return {
      contractor: '', materialCode: '', name: '', sku: '', category: '', description: '', unit: 'EA',
      site: '', market: '', totalStock: 0, reservedStock: 0, availableStock: 0,
      quantityOnHand: 0, reorderLevel: 0, unitCost: null, isSerialized: false
    };
  }

  private emptyOrder(): MaterialOrderUpsert {
    return { materialId: '', direction: 'Intake', quantity: 0, orderNumber: '', vendor: '', site: '', market: '', status: 'Pending', unitCost: null, notes: '' };
  }

  private emptyAsset(): MaterialAssetUpsert {
    return { materialId: '', serialNumber: '', lotNumber: '', status: 'InStock', site: '', market: '', assignedTechnicianId: '', assignedTechnicianName: '', notes: '' };
  }

  private emptyAssignment(): MaterialAssignmentCreate {
    return { materialId: '', quantityIssued: 0, technicianId: '', technicianName: '', site: '', market: '', notes: '' };
  }

  private emptyTransfer(): MaterialTransferCreate {
    return { materialId: '', fromSite: '', toSite: '', quantity: 0, market: '', notes: '' };
  }

  private emptyCount(): MaterialCountCreate {
    return { site: '', market: '', notes: '', prefillFromStock: true };
  }
}
