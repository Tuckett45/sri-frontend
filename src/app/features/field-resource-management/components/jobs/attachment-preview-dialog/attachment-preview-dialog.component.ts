import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface AttachmentPreviewData {
  url: string;
  fileName: string;
  fileType: string;
}

@Component({
  selector: 'frm-attachment-preview-dialog',
  templateUrl: './attachment-preview-dialog.component.html',
  styleUrls: ['./attachment-preview-dialog.component.scss']
})
export class AttachmentPreviewDialogComponent {
  safeUrl: SafeResourceUrl;
  isImage: boolean;
  isPdf: boolean;

  constructor(
    public dialogRef: MatDialogRef<AttachmentPreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AttachmentPreviewData,
    private sanitizer: DomSanitizer
  ) {
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(data.url);
    this.isImage = data.fileType.startsWith('image/');
    this.isPdf = data.fileType === 'application/pdf';
  }

  close(): void {
    this.dialogRef.close();
  }
}
