import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Expense, ExpenseImage } from '../models/expense.model';
import { environment } from 'src/environments/environments';

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
  private readonly subscriptionHeaders = new HttpHeaders({
    'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
  });
  private readonly apiBaseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
  private readonly blobBaseUrl = environment.receiptBlobBaseUrl
    ? String(environment.receiptBlobBaseUrl).replace(/\/$/, '')
    : '';

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

    // Deduplicate identical images (same id/blobUrl/fileName/contentType) to avoid duplicate files
    const seenImages = new Set<string>();
    const uniqueImages: Array<{ expense: Expense; image: ExpenseImage; index: number }> = [];
    expensesWithImages.forEach(expense => {
      expense.images?.forEach((image, index) => {
        const key = this.getImageKey(image);
        if (!key) return;
        if (seenImages.has(key)) return;
        seenImages.add(key);
        uniqueImages.push({ expense, image, index });
      });
    });

    result.totalImages = uniqueImages.length;

    // Create a ZIP file
    const zip = new JSZip();
    const downloadPromises: Observable<{ expense: Expense; imageIndex: number; blob: Blob | null }>[] = [];

    // Collect all image download promises
    uniqueImages.forEach(({ expense, image, index }) => {
      const downloadObs = this.downloadImage(image).pipe(
        map(blob => ({ expense, imageIndex: index, blob })),
        catchError(err => {
          result.failedImages++;
          result.errorMessages.push(`Failed to download image for expense ${expense.id}: ${err.message}`);
          return of({ expense, imageIndex: index, blob: null });
        })
      );
      downloadPromises.push(downloadObs);
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

        // Generate and download ZIP file synchronously for the observable
        zip.generateAsync({ type: 'blob' }).then((zipBlob: Blob) => {
          const finalFileName = zipFileName || this.generateZipFileName();
          saveAs(zipBlob, finalFileName);
        });
        
        result.success = true;
        return result;
      })
    );
  }

  /**
   * Download a single image from URL
   */
  private downloadImage(image: ExpenseImage): Observable<Blob> {
    const rawUrl = image?.blobUrl ?? '';
    const trimmed = rawUrl?.trim?.() ?? '';

    if (!trimmed) {
      return of(new Blob());
    }

    if (trimmed.startsWith('data:')) {
      return of(this.dataUrlToBlob(trimmed));
    }

    if (this.isBase64String(trimmed)) {
      return of(this.base64ToBlob(trimmed, image.contentType));
    }

    const resolvedUrl = this.resolveUrl(trimmed);
    const options: {
      responseType: 'blob';
      headers?: HttpHeaders;
    } = { responseType: 'blob' as const };

    if (this.shouldAttachApiHeaders(resolvedUrl)) {
      options.headers = this.subscriptionHeaders;
    }

    return this.http.get(resolvedUrl, options);
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
    const seen = new Set<string>();
    return expenses.filter(exp => {
      const hasUniqueImage = (exp.images ?? []).some(img => {
        const key = this.getImageKey(img);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return hasUniqueImage;
    }).length;
  }

  /**
   * Get total count of receipt images
   */
  getTotalImageCount(expenses: Expense[]): number {
    const seen = new Set<string>();
    expenses.forEach(exp => {
      (exp.images ?? []).forEach(img => {
        const key = this.getImageKey(img);
        if (key) seen.add(key);
      });
    });
    return seen.size;
  }

  private resolveUrl(url: string): string {
    if (!url) return url;
    if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) {
      return url;
    }
    const normalized = url.replace(/\\/g, '/');

    // If this is an API-style path (e.g. "/api/..." or "api/..."), leave it
    // relative so same-origin/proxy requests continue to work.
    if (this.isApiUrl(normalized)) {
      return normalized.startsWith('/') ? normalized : `/${normalized}`;
    }

    // Otherwise treat as blob storage path when a base is provided.
    if (this.blobBaseUrl) {
      const base = this.blobBaseUrl.replace(/\/+$/, '');
      const path = normalized.replace(/^\/+/, '');
      return `${base}/${path}`;
    }

    // keep relative so local dev proxy (or same-origin hosting) can handle routing
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }

  private shouldAttachApiHeaders(url: string): boolean {
    if (!url) return false;
    const normalized = url.toLowerCase();
    if (this.blobBaseUrl && normalized.startsWith(this.blobBaseUrl.toLowerCase())) {
      return false;
    }
    return this.isApiUrl(normalized);
  }

  private isApiUrl(url: string): boolean {
    if (!url) return false;
    const normalized = url.toLowerCase();
    if (/^(https?:)?\/\//.test(normalized)) {
      return normalized.startsWith(environment.apiUrl.toLowerCase()) ||
        normalized.startsWith(this.apiBaseUrl.toLowerCase());
    }
    return normalized.startsWith('/api/') || normalized.startsWith('api/');
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const [meta, data] = dataUrl.split(',');
    const mimeMatch = /^data:([^;]+)/i.exec(meta ?? '');
    const mime = mimeMatch?.[1] ?? 'application/octet-stream';
    return this.base64ToBlob(data ?? '', mime);
  }

  private base64ToBlob(base64: string, mimeType?: string): Blob {
    try {
      const binary = window.atob(base64.replace(/\s+/g, ''));
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
    } catch {
      return new Blob();
    }
  }

  private isBase64String(value: string): boolean {
    if (!value || value.length < 40) {
      return false;
    }
    return /^[A-Za-z0-9+/=\s]+$/.test(value) && !value.includes('://');
  }

  private getImageKey(image: ExpenseImage | undefined | null): string | null {
    if (!image) return null;
    const parts = [
      image.id?.trim(),
      image.blobUrl?.trim(),
      image.fileName?.trim(),
      image.contentType?.trim()
    ].filter(Boolean);
    if (!parts.length) return null;
    return parts.join('|');
  }
}

