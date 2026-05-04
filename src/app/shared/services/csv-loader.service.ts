import { Injectable } from '@angular/core';

/**
 * Service for dynamically loading CSV parsing library
 * This reduces initial bundle size by loading PapaParse only when needed
 */
@Injectable({
  providedIn: 'root'
})
export class CsvLoaderService {
  private papaParsePromise: Promise<typeof import('papaparse')> | null = null;

  /**
   * Dynamically imports PapaParse library
   */
  async loadPapaParse(): Promise<typeof import('papaparse')> {
    if (!this.papaParsePromise) {
      this.papaParsePromise = import('papaparse');
    }
    return this.papaParsePromise;
  }

  /**
   * Parse CSV string to JSON
   * @param csvString CSV data as string
   * @param config Optional PapaParse configuration
   */
  async parseCSV<T = any>(
    csvString: string,
    config?: any
  ): Promise<T[]> {
    const Papa = await this.loadPapaParse();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvString, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        ...config,
        complete: (results: any) => resolve(results.data),
        error: (error: any) => reject(error)
      });
    });
  }

  /**
   * Convert JSON to CSV string
   * @param data Array of objects to convert
   * @param config Optional PapaParse configuration
   */
  async unparseCSV<T = any>(
    data: T[],
    config?: any
  ): Promise<string> {
    const Papa = await this.loadPapaParse();
    return Papa.unparse(data, config);
  }
}
