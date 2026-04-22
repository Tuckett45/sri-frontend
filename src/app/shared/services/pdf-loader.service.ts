import { Injectable } from '@angular/core';

/**
 * Service for dynamically loading PDF generation libraries
 * This reduces initial bundle size by loading PDF libraries only when needed
 */
@Injectable({
  providedIn: 'root'
})
export class PdfLoaderService {
  private jsPdfPromise: Promise<typeof import('jspdf')> | null = null;
  private autoTablePromise: Promise<typeof import('jspdf-autotable')> | null = null;

  /**
   * Dynamically imports jsPDF library
   */
  async loadJsPdf(): Promise<typeof import('jspdf')> {
    if (!this.jsPdfPromise) {
      this.jsPdfPromise = import('jspdf');
    }
    return this.jsPdfPromise;
  }

  /**
   * Dynamically imports jsPDF AutoTable plugin
   */
  async loadAutoTable(): Promise<typeof import('jspdf-autotable')> {
    if (!this.autoTablePromise) {
      this.autoTablePromise = import('jspdf-autotable');
    }
    return this.autoTablePromise;
  }

  /**
   * Loads both jsPDF and AutoTable together
   * Use this when you need both libraries
   */
  async loadPdfLibraries(): Promise<{
    jsPDF: typeof import('jspdf');
    autoTable: typeof import('jspdf-autotable');
  }> {
    const [jsPDF, autoTable] = await Promise.all([
      this.loadJsPdf(),
      this.loadAutoTable()
    ]);

    return { jsPDF, autoTable };
  }
}
