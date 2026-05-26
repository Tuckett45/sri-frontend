import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environments';
import {
  ImportDocumentResponse,
  ParsedJobDocument
} from '../models/job-document-import.model';
import { JobSetupFormValue } from '../models/job-setup.models';

/**
 * Service for importing job documentation files (one-pagers, SOWs, etc.)
 * and extracting structured data to pre-populate the Job Setup form.
 *
 * The backend uses AI-powered document parsing to extract relevant fields
 * from uploaded documents (DOCX, PDF, TXT).
 */
@Injectable({ providedIn: 'root' })
export class JobDocumentImportService {
  private readonly apiUrl = `${environment.atlasApiUrl}/jobs/import-document`;

  /** Allowed file types for document import */
  readonly allowedFileTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'text/plain'
  ];

  /** Max file size: 25 MB */
  readonly maxFileSize = 25 * 1024 * 1024;

  constructor(private http: HttpClient) {}

  /**
   * Uploads a job documentation file for parsing.
   * Returns an Observable with progress events for upload tracking.
   *
   * @param file The document file to parse
   * @returns Observable of HttpEvent for progress tracking
   */
  importDocument(file: File): Observable<HttpEvent<ImportDocumentResponse>> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const req = new HttpRequest('POST', this.apiUrl, formData, {
      reportProgress: true
    });

    return this.http.request<ImportDocumentResponse>(req);
  }

  /**
   * Uploads a document and returns just the parsed result (no progress tracking).
   *
   * @param file The document file to parse
   * @returns Observable of the parsed document response
   */
  importDocumentSimple(file: File): Observable<ImportDocumentResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<ImportDocumentResponse>(this.apiUrl, formData);
  }

  /**
   * Maps a ParsedJobDocument to a partial JobSetupFormValue.
   * Only populates fields that were successfully extracted from the document.
   *
   * @param parsed The parsed document data
   * @returns Partial form value that can be patched onto the job setup form
   */
  mapToFormValue(parsed: ParsedJobDocument): Partial<JobSetupFormValue> {
    const result: any = {
      customerInfo: {},
      pricingBilling: {},
      sriInternal: {}
    };

    // Customer Info
    if (parsed.clientName) {
      result.customerInfo.clientName = parsed.clientName;
    }
    if (parsed.siteName) {
      result.customerInfo.siteName = parsed.siteName;
    }
    if (parsed.siteAddress) {
      if (parsed.siteAddress.street) result.customerInfo.street = parsed.siteAddress.street;
      if (parsed.siteAddress.city) result.customerInfo.city = parsed.siteAddress.city;
      if (parsed.siteAddress.state) result.customerInfo.state = parsed.siteAddress.state;
      if (parsed.siteAddress.zipCode) result.customerInfo.zipCode = parsed.siteAddress.zipCode;
    }
    if (parsed.customerPOC) {
      if (parsed.customerPOC.name) result.customerInfo.pocName = parsed.customerPOC.name;
      if (parsed.customerPOC.phone) result.customerInfo.pocPhone = parsed.customerPOC.phone;
      if (parsed.customerPOC.email) result.customerInfo.pocEmail = parsed.customerPOC.email;
    }

    // Pricing & Billing
    if (parsed.perDiem != null) {
      result.pricingBilling.perDiem = parsed.perDiem;
    }

    // SRI Internal
    if (parsed.siteLead?.name) {
      result.sriInternal.projectDirector = parsed.siteLead.name;
    }

    // Clean up empty objects
    if (Object.keys(result.customerInfo).length === 0) delete result.customerInfo;
    if (Object.keys(result.pricingBilling).length === 0) delete result.pricingBilling;
    if (Object.keys(result.sriInternal).length === 0) delete result.sriInternal;

    return result;
  }

  /**
   * Validates a file before upload.
   * @returns null if valid, or an error message string
   */
  validateFile(file: File): string | null {
    if (!this.allowedFileTypes.includes(file.type) && !file.name.endsWith('.txt')) {
      return 'Unsupported file type. Please upload a PDF, DOCX, or TXT file.';
    }
    if (file.size > this.maxFileSize) {
      return `File is too large. Maximum size is ${this.maxFileSize / (1024 * 1024)} MB.`;
    }
    if (file.size === 0) {
      return 'File is empty.';
    }
    return null;
  }
}
