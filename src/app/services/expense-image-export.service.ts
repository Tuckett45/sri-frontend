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
  // API subscription key will be added automatically by ConfigurationInterceptor
  private readonly subscriptionHeaders = new HttpHeaders({});
  private readonly apiBaseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
  private readonly blobBaseUrl = environment.receiptBlobBaseUrl
    ? String(environment.receiptBlobBaseUrl).replace(/\/$/, '')
    : '';

  constructor(private http: HttpClient) {}

  /**
   * Export receipts/images for selected expenses as a ZIP file
   * Only uses the expenses provided (e.g., the current paginated table rows)
   */
  exportExpenseImages(expenses: Expense[], zipFileName?: string): Observable<ImageExportResult> {
    const result: ImageExportResult = {
      success: false,
      totalExpenses: expenses.length,
      totalImages: 0,
      failedImages: 0,
      errorMessages: []
    };

    // Normalize: ensure each expense has an images array (derive from receiptUrl/receiptData when needed)
    const normalized = expenses.map(exp => ({
      ...exp,
      images: this.expandImages(exp)
    }));

    // Filter expenses that have images
    const expensesWithImages = normalized.filter(exp => exp.images && exp.images.length > 0);

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
        let added = 0;
        // Add successfully downloaded images to ZIP, grouped per expense
        results.forEach(({ expense, imageIndex, blob }) => {
          if (blob && blob.size > 0) {
            const fileName = this.getPreferredFileName(expense, imageIndex);
            const folderName = this.getExpenseFolder(expense);
            const folder = zip.folder(folderName) ?? zip;
            folder.file(fileName, blob);
            added++;
          }
        });

        if (added === 0) {
          result.errorMessages.push('No downloadable receipts found for the selected expenses.');
          return result;
        }

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

  private generateFileName(expense: Expense, imageIndex: number): string {
    const expenseId = expense.id?.substring(0, 8) || 'UNKNOWN';
    const date = expense.date ? new Date(expense.date).toISOString().split('T')[0] : 'NoDate';
    const vendor = this.sanitizeFileName(expense.vendor || 'NoVendor');
    const image = expense.images?.[imageIndex];
    const extension = this.getFileExtension(image?.fileName || image?.blobUrl || '');
    
    return `${expenseId}_${date}_${vendor}_${imageIndex + 1}${extension}`;
  }

  private generateZipFileName(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    return `expenses_receipts_${dateStr}_${timeStr}.zip`;
  }

  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);
  }

  private getFileExtension(fileNameOrUrl: string): string {
    const match = fileNameOrUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    if (match) {
      return `.${match[1].toLowerCase()}`;
    }
    return '.jpg';
  }

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

    if (this.isApiUrl(normalized)) {
      return normalized.startsWith('/') ? normalized : `/${normalized}`;
    }

    if (this.blobBaseUrl) {
      const base = this.blobBaseUrl.replace(/\/+$/, '');
      const path = normalized.replace(/^\/+/, '');
      return `${base}/${path}`;
    }

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

  /**
   * Build a best-effort images array for an expense, even if backend didn't send images[]
   */
  private expandImages(expense: Expense): ExpenseImage[] {
    const images: ExpenseImage[] = [...(expense.images ?? [])];

    const receiptUrl = (expense as any).receiptUrl || (expense as any).receipt;
    if ((!images.length) && receiptUrl) {
      images.push({
        id: `receipt-url-${expense.id ?? Math.random()}`,
        expenseId: expense.id ?? '',
        blobUrl: receiptUrl,
        fileName: this.deriveFileNameFromUrl(receiptUrl),
        contentType: undefined,
        createdDate: expense.date ?? new Date().toISOString()
      });
    }

    const receiptData = (expense as any).receiptData;
    if ((!images.length) && receiptData && typeof receiptData === 'string') {
      images.push({
        id: `receipt-data-${expense.id ?? Math.random()}`,
        expenseId: expense.id ?? '',
        blobUrl: receiptData.startsWith('data:') ? receiptData : `data:image/jpeg;base64,${receiptData}`,
        fileName: `receipt-${expense.id ?? 'unknown'}.jpg`,
        contentType: 'image/jpeg',
        createdDate: expense.date ?? new Date().toISOString()
      });
    }

    return images;
  }

  private getExpenseFolder(expense: Expense): string {
    const date = expense.date
      ? new Date(expense.date).toISOString().split('T')[0]
      : 'NoDate';

    const category = this.sanitizeFileName((expense as any).category || 'NoCategory');
    const notes = this.sanitizeFileName((expense as any).notes || 'NoNotes');

    const combined = [date, category, notes].filter(Boolean).join('_');
    const base = this.sanitizeFileName(combined);

    return base || 'expense';
  }

  private getPreferredFileName(expense: Expense, imageIndex: number): string {
    const image = expense.images?.[imageIndex];
    if (image?.fileName) {
      return this.sanitizeFileNamePreserveExtension(image.fileName);
    }
    if (image?.blobUrl) {
      return this.deriveFileNameFromUrl(image.blobUrl);
    }
    return this.generateFileName(expense, imageIndex);
  }

  private deriveFileNameFromUrl(url: string): string {
    if (!url) return 'receipt.jpg';
    const parts = url.split('/').pop()?.split('?')[0];
    if (!parts || !parts.includes('.')) return 'receipt.jpg';
    return this.sanitizeFileNamePreserveExtension(parts);
  }

  /**
   * Sanitizes a filename but preserves the final extension so the OS can
   * associate the correct file type (e.g., .jpg, .png, .pdf).
   */
  private sanitizeFileNamePreserveExtension(name: string): string {
    if (!name) return 'file';

    const trimmed = name.trim();
    const lastDot = trimmed.lastIndexOf('.');

    let base = trimmed;
    let ext = '';

    if (lastDot > 0 && lastDot < trimmed.length - 1) {
      base = trimmed.slice(0, lastDot);
      ext = trimmed.slice(lastDot + 1);
    }

    const safeBase = this.sanitizeFileName(base) || 'file';
    const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);

    return safeExt ? `${safeBase}.${safeExt.toLowerCase()}` : safeBase;
  }
}
