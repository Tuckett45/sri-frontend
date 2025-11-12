import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadModule, FileUploadHandlerEvent } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'ark-photo-uploader',
  standalone: true,
  imports: [CommonModule, FileUploadModule, ButtonModule],
  templateUrl: './photo-uploader.component.html',
  styleUrls: ['./photo-uploader.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoUploaderComponent {
  @Input() set value(value: string[] | null) {
    this._value = value ?? [];
  }
  get value(): string[] {
    return this._value;
  }
  private _value: string[] = [];
  @Output() valueChange = new EventEmitter<string[]>();

  protected async onUpload(event: FileUploadHandlerEvent) {
        const files = event.files ?? [];
    const uploadedIds = await this.uploadImages(files);
    this._value = [...(this._value ?? []), ...uploadedIds];
    this.valueChange.emit(this._value);
  }

  protected remove(id: string) {
    this._value = (this._value ?? []).filter(existing => existing !== id);
    this.valueChange.emit(this._value);
  }

  private async uploadImages(files: File[]): Promise<string[]> {
    // TODO: integrate AzureBlobStorageService when available
    return files.map(file => `${Date.now()}-${file.name}`);
  }
}
