# Lazy Loading Services Guide

## Overview

To optimize bundle size, heavy third-party libraries are loaded dynamically only when needed. This guide explains how to use the lazy loading services.

## Available Services

### 1. ChartLoaderService

**Purpose:** Dynamically load Chart.js library

**Usage:**
```typescript
import { ChartLoaderService } from '@shared/services';

constructor(private chartLoader: ChartLoaderService) {}

async createChart() {
  // Register Chart.js components
  await this.chartLoader.registerChartComponents();
  
  // Load Chart.js
  const ChartJS = await this.chartLoader.loadChartJs();
  
  // Use Chart.js
  new ChartJS.Chart(ctx, config);
}
```

**Benefits:** Saves ~150 KB from main bundle

### 2. PdfLoaderService

**Purpose:** Dynamically load jsPDF and jsPDF-AutoTable

**Usage:**
```typescript
import { PdfLoaderService } from '@shared/services';

constructor(private pdfLoader: PdfLoaderService) {}

async generatePDF() {
  // Load both libraries
  const { jsPDF, autoTable } = await this.pdfLoader.loadPdfLibraries();
  
  // Create PDF
  const doc = new jsPDF.jsPDF();
  doc.text('Hello World', 10, 10);
  
  // Add table
  autoTable.default(doc, {
    head: [['Name', 'Email']],
    body: [['John', 'john@example.com']]
  });
  
  doc.save('document.pdf');
}
```

**Benefits:** Saves ~100 KB from main bundle

### 3. CsvLoaderService

**Purpose:** Dynamically load PapaParse for CSV parsing

**Usage:**
```typescript
import { CsvLoaderService } from '@shared/services';

constructor(private csvLoader: CsvLoaderService) {}

async importCSV(csvString: string) {
  // Parse CSV to JSON
  const data = await this.csvLoader.parseCSV(csvString);
  console.log(data);
}

async exportCSV(data: any[]) {
  // Convert JSON to CSV
  const csv = await this.csvLoader.unparseCSV(data);
  
  // Download using FileDownloadService
  this.fileDownload.downloadCSV(csv, 'export.csv');
}
```

**Benefits:** Saves ~50 KB from main bundle

### 4. FileDownloadService

**Purpose:** Replace file-saver library with native browser APIs

**Usage:**
```typescript
import { FileDownloadService } from '@shared/services';

constructor(private fileDownload: FileDownloadService) {}

downloadFile() {
  // Download text file
  this.fileDownload.downloadText('Hello World', 'hello.txt');
  
  // Download JSON
  this.fileDownload.downloadJSON({ name: 'John' }, 'data.json');
  
  // Download CSV
  this.fileDownload.downloadCSV('name,email\nJohn,john@example.com', 'data.csv');
  
  // Download PDF
  this.fileDownload.downloadPDF(pdfBlob, 'document.pdf');
  
  // Download any file
  this.fileDownload.downloadFile(blob, 'file.dat', 'application/octet-stream');
}
```

**Benefits:** Saves ~30 KB from main bundle, no external dependency

### 5. ImageCompressionLoaderService

**Purpose:** Dynamically load ngx-image-compress

**Usage:**
```typescript
import { ImageCompressionLoaderService } from '@shared/services';

constructor(private imageLoader: ImageCompressionLoaderService) {}

async compressImage(file: File) {
  // Compress image with 75% quality
  const compressed = await this.imageLoader.compressImage(file, 75);
  
  // Use compressed image
  console.log(compressed); // base64 string
}
```

**Benefits:** Saves ~40 KB from main bundle

### 6. D3LoaderService

**Purpose:** Load only required D3 modules instead of full library

**Usage:**
```typescript
import { D3LoaderService } from '@shared/services';

constructor(private d3Loader: D3LoaderService) {}

async createVisualization() {
  // Load specific modules
  const selection = await this.d3Loader.loadSelection();
  const scale = await this.d3Loader.loadScale();
  
  // Or load common modules together
  const { selection, scale, shape, axis, array } = 
    await this.d3Loader.loadBasicChartModules();
  
  // Use D3
  selection.select('svg')
    .append('circle')
    .attr('r', 50);
}
```

**Benefits:** Saves ~200 KB from main bundle

## Migration Guide

### Before (Eager Loading)

```typescript
import { Chart } from 'chart.js';
import jsPDF from 'jspdf';
import * as Papa from 'papaparse';
import { saveAs } from 'file-saver';
import * as d3 from 'd3';

// Libraries loaded immediately, increasing initial bundle size
```

### After (Lazy Loading)

```typescript
import { 
  ChartLoaderService,
  PdfLoaderService,
  CsvLoaderService,
  FileDownloadService,
  D3LoaderService
} from '@shared/services';

constructor(
  private chartLoader: ChartLoaderService,
  private pdfLoader: PdfLoaderService,
  private csvLoader: CsvLoaderService,
  private fileDownload: FileDownloadService,
  private d3Loader: D3LoaderService
) {}

// Libraries loaded only when methods are called
```

## Best Practices

1. **Load Once, Use Multiple Times**
   - Services cache the import promises
   - Subsequent calls return the cached promise
   - No need to worry about multiple imports

2. **Load Early in User Flow**
   - If you know a library will be needed, load it early
   - Example: Load Chart.js when user navigates to reports page
   ```typescript
   ngOnInit() {
     // Preload for better UX
     this.chartLoader.registerChartComponents();
   }
   ```

3. **Handle Loading States**
   ```typescript
   async generateReport() {
     this.loading = true;
     try {
       await this.chartLoader.registerChartComponents();
       // Create charts
     } finally {
       this.loading = false;
     }
   }
   ```

4. **Error Handling**
   ```typescript
   async loadData() {
     try {
       const data = await this.csvLoader.parseCSV(csvString);
       return data;
     } catch (error) {
       console.error('Failed to parse CSV:', error);
       this.showError('Invalid CSV file');
       return [];
     }
   }
   ```

## Performance Impact

| Library | Before | After | Savings |
|---------|--------|-------|---------|
| Chart.js | Main bundle | Lazy loaded | ~150 KB |
| jsPDF | Main bundle | Lazy loaded | ~100 KB |
| PapaParse | Main bundle | Lazy loaded | ~50 KB |
| file-saver | Main bundle | Removed | ~30 KB |
| D3.js | Full library | Modular | ~200 KB |
| ngx-image-compress | Main bundle | Lazy loaded | ~40 KB |
| **Total** | | | **~570 KB** |

## Testing

All lazy loading services are tested in their respective spec files:
- `chart-loader.service.spec.ts`
- `pdf-loader.service.spec.ts`
- `csv-loader.service.spec.ts`
- `file-download.service.spec.ts`
- `image-compression-loader.service.spec.ts`
- `d3-loader.service.spec.ts`

## Troubleshooting

### Issue: "Cannot find module" error

**Solution:** Ensure the library is installed in package.json

### Issue: Library not loading

**Solution:** Check browser console for network errors, verify import paths

### Issue: Performance not improved

**Solution:** Verify libraries are not imported directly anywhere else in the codebase

## Future Optimizations

1. Consider replacing Chart.js with lighter alternatives
2. Evaluate if all Leaflet plugins are necessary
3. Implement service worker caching for loaded libraries
4. Monitor bundle size with webpack-bundle-analyzer

## Questions?

Contact the development team or refer to:
- Bundle Analysis: `.kiro/specs/field-resource-management/BUNDLE_ANALYSIS.md`
- Dependency Optimization: `.kiro/specs/field-resource-management/DEPENDENCY_OPTIMIZATION.md`
