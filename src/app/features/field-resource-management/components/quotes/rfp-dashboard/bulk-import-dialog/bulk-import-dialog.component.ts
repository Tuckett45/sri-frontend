import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import * as Papa from 'papaparse';
import * as DashboardActions from '../../../../state/quotes/dashboard.actions';

/**
 * Bulk Import Dialog Component
 *
 * Allows users to upload an Excel (.xlsx) or CSV (.csv) file matching
 * the RFP Quote Tracker template, preview parsed records, and bulk-create
 * RFP entries in the system.
 *
 * Records are automatically categorized into the correct workflow phase
 * (RFP, PO Tracking, or Project Tracking) based on the fields provided:
 * - Job data (Job Number, Job Start, Job Complete, Invoice) → Project Tracking
 * - PO data (PO Number, PO Received Date, PO Amount) → PO Tracking
 * - Otherwise → RFP
 *
 * Template columns expected:
 *   Customer | Project Description | Requester's Name | RFP Receive Date |
 *   Quote Due Date | Assigned | Quote Submitted | Quote Number | PO Number |
 *   PO Received Date | PO Amount | Job Number | Job Start | Job Complete |
 *   Invoice Number | Notes
 */

export interface BulkImportRow {
  customer: string;
  projectDescription: string;
  requestorName: string;
  rfpReceiveDate: string | null;
  quoteDueDate: string | null;
  assignedTo: string;
  quoteSubmittedDate: string | null;
  quoteNumber: string;
  poNumber: string;
  poReceivedDate: string | null;
  poAmount: number | null;
  jobNumber: string;
  jobStart: string | null;
  jobComplete: string | null;
  invoiceNumber: string;
  notes: string;
  /** Inferred workflow phase based on populated fields */
  inferredPhase: 'rfp' | 'poTracking' | 'projectTracking';
  isValid: boolean;
  errors: string[];
}

@Component({
  selector: 'app-bulk-import-dialog',
  templateUrl: './bulk-import-dialog.component.html',
  styleUrls: ['./bulk-import-dialog.component.scss']
})
export class BulkImportDialogComponent implements OnInit, OnDestroy {
  /** State tracking */
  step: 'upload' | 'preview' | 'importing' | 'complete' = 'upload';

  /** Parsed rows from the uploaded file */
  parsedRows: BulkImportRow[] = [];

  /** Validation summary */
  validCount = 0;
  invalidCount = 0;
  totalCount = 0;

  /** Phase breakdown counts */
  rfpCount = 0;
  poTrackingCount = 0;
  projectTrackingCount = 0;

  /** Import progress */
  importProgress = 0;
  importedCount = 0;
  failedCount = 0;

  /** File info */
  selectedFile: File | null = null;
  fileError: string | null = null;

  /** Displayed columns for the preview table */
  displayedColumns: string[] = [
    'status',
    'inferredPhase',
    'customer',
    'projectDescription',
    'requestorName',
    'rfpReceiveDate',
    'quoteDueDate',
    'assignedTo',
    'quoteSubmittedDate',
    'quoteNumber',
    'poNumber',
    'poReceivedDate',
    'poAmount',
    'jobNumber',
    'jobStart',
    'jobComplete',
    'invoiceNumber',
    'notes'
  ];

  /** Column mapping from spreadsheet headers to our fields */
  private readonly COLUMN_MAP: Record<string, keyof BulkImportRow> = {
    'customer': 'customer',
    'project description': 'projectDescription',
    "requester's name": 'requestorName',
    'requesters name': 'requestorName',
    'requester name': 'requestorName',
    'rfp receive date': 'rfpReceiveDate',
    'rfp received date': 'rfpReceiveDate',
    'quote due date': 'quoteDueDate',
    'assigned': 'assignedTo',
    'assigned to': 'assignedTo',
    'quote submitted': 'quoteSubmittedDate',
    'quote submitted date': 'quoteSubmittedDate',
    'quote number': 'quoteNumber',
    'po number': 'poNumber',
    'po #': 'poNumber',
    'po': 'poNumber',
    'purchase order': 'poNumber',
    'purchase order number': 'poNumber',
    'po received date': 'poReceivedDate',
    'po received': 'poReceivedDate',
    'po date received': 'poReceivedDate',
    'po amount': 'poAmount',
    'purchase order amount': 'poAmount',
    'job number': 'jobNumber',
    'job #': 'jobNumber',
    'sri job number': 'jobNumber',
    'job start': 'jobStart',
    'job start date': 'jobStart',
    'job complete': 'jobComplete',
    'job complete date': 'jobComplete',
    'job completed': 'jobComplete',
    'invoice number': 'invoiceNumber',
    'invoice #': 'invoiceNumber',
    'invoice': 'invoiceNumber',
    'notes': 'notes'
  };

  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<BulkImportDialogComponent>,
    private snackBar: MatSnackBar,
    private store: Store,
    private actions$: Actions
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle file selection from the file input
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  /**
   * Handle drag-and-drop file
   */
  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Process the uploaded file (CSV or XLSX)
   */
  private processFile(file: File): void {
    this.fileError = null;
    this.selectedFile = file;

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      this.parseCSV(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
      this.parseExcel(file);
    } else {
      this.fileError = 'Unsupported file type. Please upload a .csv or .xlsx file.';
      this.selectedFile = null;
    }
  }

  /**
   * Parse CSV file using PapaParse
   */
  private parseCSV(file: File): void {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          this.mapAndValidateRows(results.data as Record<string, string>[]);
        } else {
          this.fileError = 'No data found in the CSV file.';
        }
      },
      error: (error) => {
        this.fileError = `Error parsing CSV: ${error.message}`;
      }
    });
  }

  /**
   * Parse Excel file using SheetJS (xlsx)
   * Dynamically imports the xlsx library
   */
  private async parseExcel(file: File): Promise<void> {
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

      // Use first sheet
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Convert to JSON with headers
      const jsonData = XLSX.utils.sheet_to_json(sheet, {
        raw: false,
        dateNF: 'MM/DD/YY'
      }) as Record<string, any>[];

      if (jsonData && jsonData.length > 0) {
        this.mapAndValidateRows(jsonData);
      } else {
        this.fileError = 'No data found in the Excel file. Make sure data starts on the first sheet.';
      }
    } catch (error: any) {
      this.fileError = `Error parsing Excel file: ${error.message || 'Unknown error'}`;
    }
  }

  /**
   * Map raw spreadsheet rows to our BulkImportRow format and validate
   */
  private mapAndValidateRows(rawRows: Record<string, any>[]): void {
    this.parsedRows = rawRows.map(raw => {
      const row = this.mapRow(raw);
      this.validateRow(row);
      return row;
    });

    // Filter out completely empty rows
    this.parsedRows = this.parsedRows.filter(row =>
      row.customer || row.projectDescription || row.quoteNumber
    );

    this.totalCount = this.parsedRows.length;
    this.validCount = this.parsedRows.filter(r => r.isValid).length;
    this.invalidCount = this.parsedRows.filter(r => !r.isValid).length;
    this.rfpCount = this.parsedRows.filter(r => r.isValid && r.inferredPhase === 'rfp').length;
    this.poTrackingCount = this.parsedRows.filter(r => r.isValid && r.inferredPhase === 'poTracking').length;
    this.projectTrackingCount = this.parsedRows.filter(r => r.isValid && r.inferredPhase === 'projectTracking').length;

    if (this.totalCount === 0) {
      this.fileError = 'No valid data rows found. Please check the file format.';
    } else {
      this.step = 'preview';
    }
  }

  /**
   * Map a single raw row to BulkImportRow using column header matching
   */
  private mapRow(raw: Record<string, any>): BulkImportRow {
    const row: BulkImportRow = {
      customer: '',
      projectDescription: '',
      requestorName: '',
      rfpReceiveDate: null,
      quoteDueDate: null,
      assignedTo: '',
      quoteSubmittedDate: null,
      quoteNumber: '',
      poNumber: '',
      poReceivedDate: null,
      poAmount: null,
      jobNumber: '',
      jobStart: null,
      jobComplete: null,
      invoiceNumber: '',
      notes: '',
      inferredPhase: 'rfp',
      isValid: true,
      errors: []
    };

    // Try to match each key in the raw data to our expected columns
    for (const [key, value] of Object.entries(raw)) {
      const normalizedKey = key.toLowerCase().trim();
      const mappedField = this.COLUMN_MAP[normalizedKey];

      if (mappedField && value !== undefined && value !== null) {
        const strValue = String(value).trim();
        if (mappedField === 'rfpReceiveDate' || mappedField === 'quoteDueDate' || mappedField === 'quoteSubmittedDate' || mappedField === 'poReceivedDate' || mappedField === 'jobStart' || mappedField === 'jobComplete') {
          (row as any)[mappedField] = this.parseDate(strValue);
        } else if (mappedField === 'poAmount') {
          const parsed = parseFloat(strValue.replace(/[^0-9.\-]/g, ''));
          (row as any)[mappedField] = isNaN(parsed) ? null : parsed;
        } else {
          (row as any)[mappedField] = strValue;
        }
      }
    }

    return row;
  }

  /**
   * Validate a row for required fields
   */
  private validateRow(row: BulkImportRow): void {
    row.errors = [];

    if (!row.customer) {
      row.errors.push('Customer is required');
    }
    if (!row.projectDescription) {
      row.errors.push('Project Description is required');
    }

    row.isValid = row.errors.length === 0;

    // Infer the workflow phase based on populated fields
    row.inferredPhase = this.inferPhase(row);
  }

  /**
   * Infer which workflow phase a row belongs to based on its populated fields.
   *
   * Logic:
   * - If job-related fields are present (jobNumber, jobStart, jobComplete, invoiceNumber)
   *   → Project Tracking
   * - If PO-related fields are present (poNumber, poReceivedDate, poAmount)
   *   → PO Tracking
   * - Otherwise → RFP
   */
  private inferPhase(row: BulkImportRow): 'rfp' | 'poTracking' | 'projectTracking' {
    const hasJobData = !!(row.jobNumber || row.jobStart || row.jobComplete || row.invoiceNumber);
    const hasPoData = !!(row.poNumber || row.poReceivedDate || row.poAmount);

    if (hasJobData) return 'projectTracking';
    if (hasPoData) return 'poTracking';
    return 'rfp';
  }

  /**
   * Map the inferred phase to the appropriate workflow status string
   * that the backend uses for categorization.
   */
  private mapPhaseToStatus(phase: 'rfp' | 'poTracking' | 'projectTracking'): string {
    switch (phase) {
      case 'projectTracking': return 'Project_Active';
      case 'poTracking': return 'PO_Received';
      case 'rfp':
      default: return 'Draft';
    }
  }

  /**
   * Parse date string in various formats to ISO string
   */
  private parseDate(value: string): string | null {
    if (!value || value.toLowerCase() === 'asap') return null;

    // Try parsing common date formats
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    // Try MM/DD/YY format
    const parts = value.split('/');
    if (parts.length === 3) {
      let year = parseInt(parts[2], 10);
      if (year < 100) {
        year += year > 50 ? 1900 : 2000;
      }
      const parsed = new Date(year, parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }

    return null;
  }

  /**
   * Import all valid rows
   */
  onImport(): void {
    const validRows = this.parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      this.snackBar.open('No valid rows to import', 'Close', { duration: 3000 });
      return;
    }

    this.step = 'importing';
    this.importProgress = 0;
    this.importedCount = 0;
    this.failedCount = 0;

    const importPayload = validRows.map(row => ({
      customer: row.customer,
      projectDescription: row.projectDescription,
      requestorName: row.requestorName,
      rfpReceiveDate: row.rfpReceiveDate,
      quoteDueDate: row.quoteDueDate,
      assignedTo: row.assignedTo,
      quoteSubmittedDate: row.quoteSubmittedDate,
      quoteNumber: row.quoteNumber,
      poNumber: row.poNumber,
      poReceivedDate: row.poReceivedDate,
      poAmount: row.poAmount,
      jobNumber: row.jobNumber,
      jobStart: row.jobStart,
      jobComplete: row.jobComplete,
      invoiceNumber: row.invoiceNumber,
      workflowStatus: this.mapPhaseToStatus(row.inferredPhase),
      notes: row.notes
    }));

    this.store.dispatch(DashboardActions.bulkImportRfps({ records: importPayload }));

    this.actions$.pipe(
      ofType(DashboardActions.bulkImportRfpsSuccess, DashboardActions.bulkImportRfpsFailure),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(action => {
      if (action.type === DashboardActions.bulkImportRfpsSuccess.type) {
        const result = (action as ReturnType<typeof DashboardActions.bulkImportRfpsSuccess>);
        this.importedCount = result.importedCount;
        this.failedCount = result.failedCount;
        this.importProgress = 100;
        this.step = 'complete';
      } else {
        const error = (action as ReturnType<typeof DashboardActions.bulkImportRfpsFailure>).error;
        this.snackBar.open(`Import failed: ${error}`, 'Close', { duration: 5000 });
        this.step = 'preview';
      }
    });
  }

  /**
   * Go back to upload step
   */
  onBack(): void {
    this.step = 'upload';
    this.parsedRows = [];
    this.selectedFile = null;
    this.fileError = null;
  }

  /**
   * Close dialog after successful import
   */
  onDone(): void {
    this.dialogRef.close({ imported: true, count: this.importedCount });
  }

  /**
   * Cancel and close dialog
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Download a sample template CSV
   */
  downloadTemplate(): void {
    const headers = 'Customer,Project Description,Requester\'s Name,RFP Receive Date,Quote Due Date,Assigned,Quote Submitted,Quote Number,PO Number,PO Received Date,PO Amount,Job Number,Job Start,Job Complete,Invoice Number,Notes';
    const sampleRow1 = 'Comcast - TX,TX Brenham IT Switch,John Smith,1/5/26,1/12/26,Kevin Thibodeaux,1/5/26,87016,,,,,,,,"RFP phase example"';
    const sampleRow2 = 'AT&T - FL,FL Tampa Fiber Run,Jane Doe,12/15/25,12/22/25,Mike Johnson,12/18/25,87020,PO-2026-002,1/3/26,25000,,,,,"PO Tracking example"';
    const sampleRow3 = 'Verizon - CA,CA Site Survey,Bob Wilson,11/1/25,11/8/25,Sarah Lee,11/5/25,87025,PO-2025-050,11/10/25,18000,SRI-4521,11/15/25,,,"Project Tracking example"';
    const csv = `${headers}\n${sampleRow1}\n${sampleRow2}\n${sampleRow3}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rfp-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
