import { Injectable } from '@angular/core';

/**
 * Service for file downloads using native browser APIs
 * Replaces file-saver library to reduce bundle size
 */
@Injectable({
  providedIn: 'root'
})
export class FileDownloadService {
  /**
   * Download a file using native browser APIs
   * @param data File data (Blob, string, or ArrayBuffer)
   * @param filename Name of the file to download
   * @param mimeType MIME type of the file
   */
  downloadFile(
    data: Blob | string | ArrayBuffer,
    filename: string,
    mimeType: string = 'application/octet-stream'
  ): void {
    let blob: Blob;

    if (data instanceof Blob) {
      blob = data;
    } else if (typeof data === 'string') {
      blob = new Blob([data], { type: mimeType });
    } else if (data instanceof ArrayBuffer) {
      blob = new Blob([data], { type: mimeType });
    } else {
      throw new Error('Unsupported data type for download');
    }

    // Create object URL
    const url = URL.createObjectURL(blob);

    // Create temporary anchor element
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';

    // Append to body, click, and remove
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Clean up object URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Download text content as a file
   * @param text Text content to download
   * @param filename Name of the file
   * @param mimeType MIME type (defaults to text/plain)
   */
  downloadText(
    text: string,
    filename: string,
    mimeType: string = 'text/plain'
  ): void {
    this.downloadFile(text, filename, mimeType);
  }

  /**
   * Download JSON data as a file
   * @param data Object to convert to JSON
   * @param filename Name of the file
   */
  downloadJSON(data: any, filename: string): void {
    const jsonString = JSON.stringify(data, null, 2);
    this.downloadFile(jsonString, filename, 'application/json');
  }

  /**
   * Download CSV data as a file
   * @param csvData CSV string
   * @param filename Name of the file
   */
  downloadCSV(csvData: string, filename: string): void {
    this.downloadFile(csvData, filename, 'text/csv');
  }

  /**
   * Download PDF data as a file
   * @param pdfData PDF blob or data
   * @param filename Name of the file
   */
  downloadPDF(pdfData: Blob | ArrayBuffer, filename: string): void {
    this.downloadFile(pdfData, filename, 'application/pdf');
  }
}
