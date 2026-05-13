import { Injectable } from '@angular/core';

/**
 * CSV export options
 */
export interface CsvExportOptions {
  filename: string;
  headers: string[];
  data: any[][];
  delimiter?: string;
  includeHeaders?: boolean;
}

/**
 * PDF export options
 */
export interface PdfExportOptions {
  filename: string;
  title?: string;
  headers: string[];
  data: any[][];
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'letter' | 'legal';
}

/**
 * Service for exporting data to various formats
 * Handles CSV and PDF generation and file downloads
 */
@Injectable({
  providedIn: 'root'
})
export class ExportService {
  constructor() {}

  /**
   * Generates and downloads a CSV file
   * @param options CSV export options
   */
  generateCSV(options: CsvExportOptions): void {
    const {
      filename,
      headers,
      data,
      delimiter = ',',
      includeHeaders = true
    } = options;

    let csvContent = '';

    // Add headers if requested
    if (includeHeaders) {
      csvContent += this.escapeCSVRow(headers, delimiter) + '\n';
    }

    // Add data rows
    data.forEach(row => {
      csvContent += this.escapeCSVRow(row, delimiter) + '\n';
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadFile(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
  }

  /**
   * Generates and downloads a PDF file
   * Note: This is a basic implementation. For production use, consider using a library like jsPDF
   * @param options PDF export options
   */
  async generatePDF(options: PdfExportOptions): Promise<void> {
    const {
      filename,
      title,
      headers,
      data,
      orientation = 'portrait',
      pageSize = 'a4'
    } = options;

    try {
      // Dynamic import of jsPDF to reduce initial bundle size
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      // Create new PDF document
      const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: pageSize
      });

      // Add title if provided
      if (title) {
        doc.setFontSize(16);
        doc.text(title, 14, 15);
      }

      // Add table
      (doc as any).autoTable({
        head: [headers],
        body: data,
        startY: title ? 25 : 15,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });

      // Save the PDF
      doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF. Please ensure jsPDF library is installed.');
    }
  }

  /**
   * Downloads a blob as a file
   * @param blob Blob to download
   * @param filename Filename for the download
   */
  downloadFile(blob: Blob, filename: string): void {
    // Create a temporary anchor element
    const link = document.createElement('a');
    const url = window.URL.createObjectURL(blob);

    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Formats a date for export
   * @param date Date to format
   * @param format Format string (default: 'YYYY-MM-DD')
   * @returns Formatted date string
   */
  formatDate(date: Date | string, format: string = 'YYYY-MM-DD'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) {
      return '';
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * Formats a number for export
   * @param value Number to format
   * @param decimals Number of decimal places (default: 2)
   * @param thousandsSeparator Thousands separator (default: ',')
   * @param decimalSeparator Decimal separator (default: '.')
   * @returns Formatted number string
   */
  formatNumber(
    value: number | string,
    decimals: number = 2,
    thousandsSeparator: string = ',',
    decimalSeparator: string = '.'
  ): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(num)) {
      return '';
    }

    const parts = num.toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    
    return parts.join(decimalSeparator);
  }

  /**
   * Formats currency for export
   * @param value Number to format
   * @param currencySymbol Currency symbol (default: '$')
   * @param decimals Number of decimal places (default: 2)
   * @returns Formatted currency string
   */
  formatCurrency(value: number | string, currencySymbol: string = '$', decimals: number = 2): string {
    const formatted = this.formatNumber(value, decimals);
    return formatted ? `${currencySymbol}${formatted}` : '';
  }

  /**
   * Formats a percentage for export
   * @param value Number to format (0-1 or 0-100)
   * @param decimals Number of decimal places (default: 1)
   * @param isDecimal Whether the value is in decimal format (0-1) or percentage format (0-100)
   * @returns Formatted percentage string
   */
  formatPercentage(value: number | string, decimals: number = 1, isDecimal: boolean = true): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(num)) {
      return '';
    }

    const percentage = isDecimal ? num * 100 : num;
    return `${percentage.toFixed(decimals)}%`;
  }

  /**
   * Escapes a CSV row with proper quoting and delimiter handling
   * @param row Array of values
   * @param delimiter Delimiter character
   * @returns Escaped CSV row string
   */
  private escapeCSVRow(row: any[], delimiter: string): string {
    return row.map(value => {
      // Convert to string
      let stringValue = value === null || value === undefined ? '' : String(value);

      // Escape double quotes by doubling them
      stringValue = stringValue.replace(/"/g, '""');

      // Quote the value if it contains delimiter, quotes, or newlines
      if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n')) {
        stringValue = `"${stringValue}"`;
      }

      return stringValue;
    }).join(delimiter);
  }

  /**
   * Converts an array of objects to a 2D array for export
   * @param objects Array of objects
   * @param keys Keys to extract (in order)
   * @returns 2D array of values
   */
  objectsToArray(objects: any[], keys: string[]): any[][] {
    return objects.map(obj => 
      keys.map(key => {
        // Handle nested keys (e.g., 'user.name')
        const value = key.split('.').reduce((o, k) => o?.[k], obj);
        return value;
      })
    );
  }

  /**
   * Generates a timestamp-based filename
   * @param prefix Filename prefix
   * @param extension File extension (without dot)
   * @returns Filename with timestamp
   */
  generateTimestampFilename(prefix: string, extension: string): string {
    const timestamp = this.formatDate(new Date(), 'YYYY-MM-DD_HHmmss');
    return `${prefix}_${timestamp}.${extension}`;
  }
}
