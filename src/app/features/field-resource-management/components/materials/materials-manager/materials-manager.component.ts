import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-materials-manager',
  templateUrl: './materials-manager.component.html',
  styleUrls: ['./materials-manager.component.scss']
})
export class MaterialsManagerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  materials: any[] = [];
  displayedColumns = ['name', 'category', 'quantity', 'unit', 'cost', 'supplier', 'actions'];
  selectedCategory = '';
  selectedSupplier = '';

  categories = ['Electrical', 'Plumbing', 'Structural', 'HVAC', 'Safety', 'Other'];

  get filteredMaterials(): any[] {
    return this.materials.filter(m => {
      const matchCat = !this.selectedCategory || m.category === this.selectedCategory;
      const matchSup = !this.selectedSupplier || m.supplier === this.selectedSupplier;
      return matchCat && matchSup;
    });
  }

  get suppliers(): string[] {
    return [...new Set(this.materials.map(m => m.supplier).filter(Boolean))] as string[];
  }

  ngOnInit(): void {}

  addMaterial(): void {}

  createPO(): void {}

  editMaterial(material: any): void {}

  deleteMaterial(material: any): void {
    this.materials = this.materials.filter(m => m !== material);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
