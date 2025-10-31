import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Expense, ExpenseImage } from '../models/expense.model';

export interface ImageExportResult {
  success: boolean;
  totalExpenses: number;
  totalImages: number;
  failedImages: number;
  errorMessages: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ExpenseImageExportService {
  constructor(private http: HttpClient) {}

  /**
   * Export receipts/images for selected expenses as a ZIP file
   * @param expenses Array of expenses to export images from
   * @param zipFileName Optional custom ZIP file name
   * @returns Observable with export result
   */
  exportExpenseImages(expenses: Expense[], zipFileName?: string): Observable<ImageExportResult> {
    const result: ImageExportResult = {
      success: false,
      totalExpenses: expenses.length,
      totalImages: 0,
      failedImages: 0,
      errorMessages: []
    };

    // Filter expenses that have images
    const expensesWithImages = expenses.filter(exp => exp.images && exp.images.length > 0);

    if (expensesWithImages.length === 0) {
      result.errorMessages.push('No expenses with receipts found');
      return of(result);
    }

    // Create a ZIP file
    const zip = new JSZip();
    const downloadPromises: Observable<{ expense: Expense; imageIndex: number; blob: Blob | null }>[] = [];

    // Collect all image download promises
    expensesWithImages.forEach(expense => {
      expense.images?.forEach((image, index) => {
        result.totalImages++;
        const downloadObs = this.downloadImage(image.blobUrl).pipe(
          map(blob => ({ expense, imageIndex: index, blob })),
          catchError(err => {
            result.failedImages++;
            result.errorMessages.push(`Failed to download image for expense ${expense.id}: ${err.message}`);
            return of({ expense, imageIndex: index, blob: null });
          })
        );
        downloadPromises.push(downloadObs);
      });
    });

    // Download all images in parallel
    return forkJoin(downloadPromises).pipe(
      map(results => {
        // Add successfully downloaded images to ZIP
        results.forEach(({ expense, imageIndex, blob }) => {
          if (blob) {
            const fileName = this.generateFileName(expense, imageIndex);
            zip.file(fileName, blob);
          }
        });

        // Generate and download ZIP file
        return zip.generateAsync({ type: 'blob' }).then((zipBlob: Blob) => {
          const finalFileName = zipFileName || this.generateZipFileName();
          saveAs(zipBlob, finalFileName);
          
          result.success = true;
          return result;
        });
      }),
      map(promise => {
        // Wait for the promise to resolve
        let finalResult = result;
        promise.then((r: ImageExportResult) => finalResult = r);
        return finalResult;
      })
    );
  }

  /**
   * Download a single image from URL
   */
  private downloadImage(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }

  /**
   * Generate a filename for an image based on expense data
   * Format: ExpenseID_Date_Vendor_ImageIndex.ext
   * Example: EXP001_2024-01-15_Starbucks_1.jpg
   */
  private generateFileName(expense: Expense, imageIndex: number): string {
    const expenseId = expense.id?.substring(0, 8) || 'UNKNOWN';
    const date = expense.date ? new Date(expense.date).toISOString().split('T')[0] : 'NoDate';
    const vendor = this.sanitizeFileName(expense.vendor || 'NoVendor');
    const image = expense.images?.[imageIndex];
    const extension = this.getFileExtension(image?.fileName || image?.blobUrl || '');
    
    return `${expenseId}_${date}_${vendor}_${imageIndex + 1}${extension}`;
  }

  /**
   * Generate ZIP file name with timestamp
   * Format: expenses_receipts_YYYYMMDD_HHMMSS.zip
   */
  private generateZipFileName(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    return `expenses_receipts_${dateStr}_${timeStr}.zip`;
  }

  /**
   * Sanitize a string to be used as a filename
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9-_]/g, '_')  // Replace invalid chars with underscore
      .replace(/_+/g, '_')                // Replace multiple underscores with single
      .substring(0, 50);                  // Limit length
  }

  /**
   * Extract file extension from filename or URL
   */
  private getFileExtension(fileNameOrUrl: string): string {
    const match = fileNameOrUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    if (match) {
      return `.${match[1].toLowerCase()}`;
    }
    // Default to .jpg if no extension found
    return '.jpg';
  }

  /**
   * Get count of expenses with receipts
   */
  getExpensesWithReceiptsCount(expenses: Expense[]): number {
    return expenses.filter(exp => exp.images && exp.images.length > 0).length;
  }

  /**
   * Get total count of receipt images
   */
  getTotalImageCount(expenses: Expense[]): number {
    return expenses.reduce((count, exp) => {
      return count + (exp.images?.length || 0);
    }, 0);
  }
}

