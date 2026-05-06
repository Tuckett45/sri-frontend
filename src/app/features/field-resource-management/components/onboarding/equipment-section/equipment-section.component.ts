import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-equipment-section',
  templateUrl: './equipment-section.component.html',
  styleUrls: ['./equipment-section.component.scss']
})
export class EquipmentSectionComponent {
  @Input() technicianId = '';

  equipment: any[] = [
    { id: '1', name: 'Fluke DSX-5000', serialNumber: 'DSX-2023-0042', assignedDate: new Date('2023-06-01'), condition: 'Good' },
    { id: '2', name: 'Klein Tools Kit', serialNumber: 'KTK-0099', assignedDate: new Date('2022-01-15'), condition: 'Fair' }
  ];
  displayedColumns = ['name', 'serialNumber', 'assignedDate', 'condition', 'actions'];

  addEquipment(): void { console.log('Add equipment'); }
  returnEquipment(id: string): void { console.log('Return equipment', id); }
  getConditionColor(condition: string): string {
    return ({ Excellent: 'primary', Good: 'primary', Fair: 'accent', Poor: 'warn' } as any)[condition] || '';
  }
}
