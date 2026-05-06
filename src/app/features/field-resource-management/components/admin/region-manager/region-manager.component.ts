import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-region-manager',
  templateUrl: './region-manager.component.html',
  styleUrls: ['./region-manager.component.scss']
})
export class RegionManagerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  showForm = false;
  editingRegion: any = null;
  regionForm!: FormGroup;
  displayedColumns = ['name', 'states', 'active', 'actions'];

  regions: any[] = [
    { id: '1', name: 'Southeast', states: ['GA', 'FL', 'AL'], active: true },
    { id: '2', name: 'Northeast', states: ['NY', 'NJ', 'CT', 'MA'], active: true },
    { id: '3', name: 'Midwest', states: ['OH', 'IL', 'MI', 'IN'], active: true },
    { id: '4', name: 'Southwest', states: ['TX', 'AZ', 'NM'], active: false }
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.regionForm = this.fb.group({
      name: ['', Validators.required],
      states: ['', Validators.required],
      active: [true]
    });
  }

  openForm(region?: any): void {
    this.editingRegion = region || null;
    if (region) {
      this.regionForm.patchValue({ ...region, states: region.states.join(', ') });
    } else {
      this.regionForm.reset({ active: true });
    }
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingRegion = null;
  }

  onSubmit(): void {
    if (this.regionForm.valid) {
      const states = (this.regionForm.value.states as string).split(',').map((s: string) => s.trim().toUpperCase());
      const data = { ...this.regionForm.value, states };
      if (this.editingRegion) {
        const idx = this.regions.indexOf(this.editingRegion);
        this.regions[idx] = { ...this.editingRegion, ...data };
      } else {
        this.regions = [...this.regions, { ...data, id: Date.now().toString() }];
      }
      this.closeForm();
    }
  }

  toggleActive(region: any): void {
    region.active = !region.active;
  }

  deleteRegion(region: any): void {
    this.regions = this.regions.filter(r => r !== region);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
