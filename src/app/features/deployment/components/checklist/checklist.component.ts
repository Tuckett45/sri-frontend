import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { CalendarModule } from 'primeng/calendar';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ChecklistItem } from '../../models/deployment.models';
import { PhotoUploaderComponent } from '../photo-uploader/photo-uploader.component';
import { TestsUploaderComponent } from '../tests-uploader/tests-uploader.component';

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

  protected controlFor(id: string): FormControl {
    const control = this.form.get(id);
    if (!(control instanceof FormControl)) {
      throw new Error(`Expected FormControl for control id "${id}"`);
    }
    return control;
  }
}

