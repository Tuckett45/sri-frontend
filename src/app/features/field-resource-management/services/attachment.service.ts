import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environments';
import { AuthService } from '../../../services/auth.service';

export type AttachmentCategory = 'certification' | 'drug_screen' | 'background_check' | 'other';

export interface Attachment {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  storagePath: string;
  category: AttachmentCategory;
  uploadedBy: string;
  uploadedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private readonly baseUrl = environment.atlasApiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private mapError(operation: string) {
    return (err: any): Observable<never> => {
      const message = err?.error?.message ?? err?.message ?? 'An unexpected error occurred.';
      return throwError(() => ({ statusCode: err?.status ?? 0, message, operation }));
    };
  }

  // --- Candidate Attachments ---

  getCandidateAttachments(candidateId: string, category?: AttachmentCategory): Observable<Attachment[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    return this.http
      .get<Attachment[]>(`${this.baseUrl}/onboarding/candidates/${candidateId}/attachments`, { params })
      .pipe(catchError(this.mapError('getCandidateAttachments')));
  }

  uploadCandidateAttachment(candidateId: string, file: File, category: AttachmentCategory): Observable<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('userName', this.authService.getUser()?.name ?? 'unknown');
    return this.http
      .post<Attachment>(`${this.baseUrl}/onboarding/candidates/${candidateId}/attachments`, formData)
      .pipe(catchError(this.mapError('uploadCandidateAttachment')));
  }

  downloadCandidateAttachment(candidateId: string, attachmentId: string): Observable<Blob> {
    return this.http
      .get(`${this.baseUrl}/onboarding/candidates/${candidateId}/attachments/${attachmentId}`, { responseType: 'blob' })
      .pipe(catchError(this.mapError('downloadCandidateAttachment')));
  }

  deleteCandidateAttachment(candidateId: string, attachmentId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/onboarding/candidates/${candidateId}/attachments/${attachmentId}`)
      .pipe(catchError(this.mapError('deleteCandidateAttachment')));
  }

  // --- Technician Attachments ---

  getTechnicianAttachments(technicianId: string, category?: AttachmentCategory): Observable<Attachment[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    return this.http
      .get<Attachment[]>(`${this.baseUrl}/technicians/${technicianId}/attachments`, { params })
      .pipe(catchError(this.mapError('getTechnicianAttachments')));
  }

  uploadTechnicianAttachment(technicianId: string, file: File, category: AttachmentCategory): Observable<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('userName', this.authService.getUser()?.name ?? 'unknown');
    return this.http
      .post<Attachment>(`${this.baseUrl}/technicians/${technicianId}/attachments`, formData)
      .pipe(catchError(this.mapError('uploadTechnicianAttachment')));
  }

  downloadTechnicianAttachment(technicianId: string, attachmentId: string): Observable<Blob> {
    return this.http
      .get(`${this.baseUrl}/technicians/${technicianId}/attachments/${attachmentId}`, { responseType: 'blob' })
      .pipe(catchError(this.mapError('downloadTechnicianAttachment')));
  }

  deleteTechnicianAttachment(technicianId: string, attachmentId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/technicians/${technicianId}/attachments/${attachmentId}`)
      .pipe(catchError(this.mapError('deleteTechnicianAttachment')));
  }
}
