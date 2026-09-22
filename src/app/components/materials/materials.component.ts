import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { MaterialsService } from 'src/app/services/materials.service';
import {
  Material,
  MaterialAssignment,
  MaterialAssignmentCreate,
  MaterialOrder,
  MaterialOrderDirection,
  MaterialOrderUpsert,
  MaterialUpsert
} from 'src/app/models/materials.model';

@Component({
  selector: 'app-materials',
  templateUrl: './materials.component.html',
  styleUrls: ['./materials.component.scss'],
  standalone: false
})
export class MaterialsComponent implements OnInit, OnDestroy {
  activeTab: 'inventory' | 'orders' | 'assignments' = 'inventory';

  materials: Material[] = [];
  orders: MaterialOrder[] = [];
  assignments: MaterialAssignment[] = [];

  loadingMaterials = false;
  loadingOrders = false;
  loadingAssignments = false;

  searchTerm = '';

  // --- new material form model ---
  newMaterial: MaterialUpsert = this.emptyMaterial();

  // --- new order form model ---
  newOrder: MaterialOrderUpsert = this.emptyOrder();

  // --- new assignment form model ---
  newAssignment: MaterialAssignmentCreate = this.emptyAssignment();

  readonly materialColumns = ['name', 'sku', 'category', 'site', 'market', 'quantityOnHand', 'reorderLevel', 'actions'];
  readonly orderColumns = ['orderNumber', 'material', 'direction', 'quantity', 'vendor', 'status', 'actions'];
  readonly assignmentColumns = ['material', 'technician', 'quantityIssued', 'quantityReturned', 'status', 'actions'];

  readonly directions: MaterialOrderDirection[] = ['Intake', 'Export'];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private materialsService: MaterialsService,
    private toastr: ToastrService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadMaterials();
    this.loadOrders();
    this.loadAssignments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: 'inventory' | 'orders' | 'assignments'): void {
    this.activeTab = tab;
  }

  // ---------------- Inventory ----------------

  loadMaterials(): void {
    this.loadingMaterials = true;
    this.materialsService.getMaterials({ search: this.searchTerm || undefined })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.materials = data ?? [];
          this.loadingMaterials = false;
        },
        error: err => {
          this.loadingMaterials = false;
          this.toastr.error(this.errorText(err), 'Could not load materials');
        }
      });
  }

  saveMaterial(): void {
    if (!this.newMaterial.name?.trim()) {
      this.toastr.warning('Material name is required.');
      return;
    }
    this.materialsService.saveMaterial(this.newMaterial)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Material saved');
          this.newMaterial = this.emptyMaterial();
          this.loadMaterials();
        },
        error: err => this.toastr.error(this.errorText(err), 'Could not save material')
      });
  }

  deleteMaterial(material: Material): void {
    this.materialsService.deleteMaterial(material.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Material deleted');
          this.loadMaterials();
        },
        error: err => this.toastr.error(this.errorText(err), 'Could not delete material')
      });
  }

  isLowStock(material: Material): boolean {
    return material.reorderLevel > 0 && material.quantityOnHand <= material.reorderLevel;
  }

  // ---------------- Orders (intake / export) ----------------

  loadOrders(): void {
    this.loadingOrders = true;
    this.materialsService.getOrders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.orders = data ?? [];
          this.loadingOrders = false;
        },
        error: err => {
          this.loadingOrders = false;
          this.toastr.error(this.errorText(err), 'Could not load orders');
        }
      });
  }

  saveOrder(): void {
    if (!this.newOrder.materialId) {
      this.toastr.warning('Select a material for the order.');
      return;
    }
    if (!this.newOrder.quantity || this.newOrder.quantity <= 0) {
      this.toastr.warning('Order quantity must be greater than zero.');
      return;
    }
    this.materialsService.saveOrder(this.newOrder)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Order saved');
          this.newOrder = this.emptyOrder();
          this.loadOrders();
        },
        error: err => this.toastr.error(this.errorText(err), 'Could not save order')
      });
  }

  fulfillOrder(order: MaterialOrder): void {
    this.materialsService.fulfillOrder(order.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(
            order.direction === 'Intake'
              ? 'Order received — inventory updated'
              : 'Order shipped — inventory updated'
          );
          this.loadOrders();
          this.loadMaterials();
        },
        error: err => this.toastr.error(this.errorText(err), 'Could not fulfill order')
      });
  }

  deleteOrder(order: MaterialOrder): void {
    this.materialsService.deleteOrder(order.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Order deleted');
          this.loadOrders();
        },
        error: err => this.toastr.error(this.errorText(err), 'Could not delete order')
      });
  }

  isFulfilled(order: MaterialOrder): boolean {
    return order.status === 'Received' || order.status === 'Shipped';
  }

  // ---------------- Assignments (issued to technicians) ----------------

  loadAssignments(): void {
    this.loadingAssignments = true;
    this.materialsService.getAssignments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.assignments = data ?? [];
          this.loadingAssignments = false;
        },
        error: err => {
          this.loadingAssignments = false;
          this.toastr.error(this.errorText(err), 'Could not load assignments');
        }
      });
  }

  issueMaterial(): void {
    if (!this.newAssignment.materialId) {
      this.toastr.warning('Select a material to issue.');
      return;
    }
    if (!this.newAssignment.quantityIssued || this.newAssignment.quantityIssued <= 0) {
      this.toastr.warning('Issued quantity must be greater than zero.');
      return;
    }
    this.materialsService.issueMaterial(this.newAssignment)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Material issued to technician');
          this.newAssignment = this.emptyAssignment();
          this.loadAssignments();
          this.loadMaterials();
        },
        error: err => this.toastr.error(this.errorText(err), 'Could not issue material')
      });
  }

  returnMaterial(assignment: MaterialAssignment): void {
    const outstanding = assignment.quantityIssued - assignment.quantityReturned;
    if (outstanding <= 0) {
      this.toastr.info('This assignment has already been fully returned.');
      return;
    }
    this.materialsService.returnMaterial(assignment.id, { quantityReturned: outstanding })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Return recorded — inventory updated');
          this.loadAssignments();
          this.loadMaterials();
        },
        error: err => this.toastr.error(this.errorText(err), 'Could not record return')
      });
  }

  deleteAssignment(assignment: MaterialAssignment): void {
    this.materialsService.deleteAssignment(assignment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Assignment deleted');
          this.loadAssignments();
        },
        error: err => this.toastr.error(this.errorText(err), 'Could not delete assignment')
      });
  }

  materialName(materialId: string): string {
    return this.materials.find(m => m.id === materialId)?.name ?? materialId;
  }

  // ---------------- Helpers ----------------

  private emptyMaterial(): MaterialUpsert {
    return {
      name: '',
      sku: '',
      category: '',
      unit: 'ea',
      site: '',
      market: '',
      quantityOnHand: 0,
      reorderLevel: 0,
      unitCost: null
    };
  }

  private emptyOrder(): MaterialOrderUpsert {
    return {
      materialId: '',
      direction: 'Intake',
      quantity: 0,
      orderNumber: '',
      vendor: '',
      site: '',
      market: '',
      status: 'Pending',
      notes: ''
    };
  }

  private emptyAssignment(): MaterialAssignmentCreate {
    return {
      materialId: '',
      quantityIssued: 0,
      technicianId: '',
      technicianName: '',
      site: '',
      market: '',
      notes: ''
    };
  }

  private errorText(err: any): string {
    if (typeof err === 'string') return err;
    return err?.error?.message || err?.error || err?.message || 'Please try again.';
  }
}
