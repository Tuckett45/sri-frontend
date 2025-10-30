import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { CalendarModule } from 'primeng/calendar';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ChecklistItem, DeploymentRole } from '../../models/deployment.models';
import { PhotoUploaderComponent } from '../photo-uploader/photo-uploader.component';
import { TestsUploaderComponent } from '../tests-uploader/tests-uploader.component';
import { roleBadgeLabel, roleClassList } from '../../utils/role.utils';

@Component({
  selector: 'ark-checklist',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    InputTextarea,
    DropdownModule,
    CheckboxModule,
    CalendarModule,
    FloatLabelModule,
    PhotoUploaderComponent,
    TestsUploaderComponent,
  ],
  templateUrl: './checklist.component.html',
  styleUrls: ['./checklist.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistComponent {
  @Input({ required: true }) items: ChecklistItem[] = [];
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: false }) activeRole: DeploymentRole = 'Technician';
  @Output() itemsChange = new EventEmitter<ChecklistItem[]>();

  protected onPhotoChange(item: ChecklistItem, ids: string[]): void {
    const updated = this.items.map(it => (it.id === item.id ? { ...it, evidenceIds: ids } : it));
    this.items = updated;
    this.form.get(item.id)?.setValue(ids);
    this.itemsChange.emit(updated);
  }

  protected onFileChange(item: ChecklistItem, ids: string[]): void {
    this.onPhotoChange(item, ids);
  }

  protected classesFor(item: ChecklistItem): string[] {
    return roleClassList(item.assignedRoles);
  }

  protected roleLabel(item: ChecklistItem): string | null {
    return roleBadgeLabel(item.assignedRoles);
  }

  protected isDisabled(item: ChecklistItem): boolean {
    return !!this.form.get(item.id)?.disabled;
  }

  protected classMap(item: ChecklistItem): Record<string, boolean> {
    const map: Record<string, boolean> = {};
    this.classesFor(item).forEach(cls => {
      map[cls] = true;
    });
    if (this.isDisabled(item)) {
      map['item-disabled'] = true;
    }
    return map;
  }

  protected controlFor(id: string): FormControl {
    const control = this.form.get(id);
    if (!(control instanceof FormControl)) {
      throw new Error(`Expected FormControl for control id "${id}"`);
    }
    return control;
  }
}

