import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  DeploymentMediaUploadResponse,
  DeploymentMediaItemDto,
  DeploymentMediaProgressDto
} from '../models/deployment-media.api';
import { DeploymentMedia } from '../models/deployment.models'; 

@Injectable({ providedIn: 'root' })
export class DeploymentMediaApiService {
  private base = '/api/deployments';

  constructor(private http: HttpClient) {}

  uploadMedia(opts: {
    deploymentId: string;
    phaseCode?: number | null;
    subCode?: string | null;
    beMediaType: 'image' | 'pdf' | 'video'; 
    businessKind: string;                 
    files: File[];
    caption?: string | null;
    takenAt?: string | null;        
  }): Observable<DeploymentMediaUploadResponse[]> {
    const form = new FormData();
    if (opts.phaseCode != null) form.append('phaseCode', String(opts.phaseCode));
    if (opts.subCode) form.append('subCode', opts.subCode);
    form.append('mediaType', opts.beMediaType);
    form.append('kind', opts.businessKind);
    if (opts.caption) form.append('caption', opts.caption);
    if (opts.takenAt) form.append('takenAt', opts.takenAt);
    for (const f of opts.files) form.append('files', f, f.name);

    return this.http.post<DeploymentMediaUploadResponse[]>(
      `${this.base}/${opts.deploymentId}/media`,
      form
    );
  }

  listMedia(deploymentId: string, phaseCode?: number | null, subCode?: string | null)
    : Observable<DeploymentMedia[]> {
    let params = new HttpParams();
    if (phaseCode != null) params = params.set('phaseCode', String(phaseCode));
    if (subCode) params = params.set('subCode', subCode);

    return this.http.get<DeploymentMediaItemDto[]>(
      `${this.base}/${deploymentId}/media`,
      { params }
    ).pipe(map(rows => rows.map(this.mapDtoToMedia)));
  }

  progress(deploymentId: string, phaseCode?: number | null, subCode?: string | null)
    : Observable<DeploymentMediaProgressDto[]> {
    let params = new HttpParams();
    if (phaseCode != null) params = params.set('phaseCode', String(phaseCode));
    if (subCode) params = params.set('subCode', subCode);

    return this.http.get<DeploymentMediaProgressDto[]>(
      `${this.base}/${deploymentId}/media/progress`,
      { params }
    );
  }

  deleteMedia(deploymentId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${deploymentId}/media/${id}`);
  }

  // ------------ Mappers ------------

  private mapDtoToMedia = (dto: DeploymentMediaItemDto): DeploymentMedia => {
    const meta = safeParse(dto.metadataJson);
    // map backend mediaType to FE kind; and backend kind to FE mediaType (business)
    const feKind: 'Photo' | 'File' =
      dto.mediaType === 'image' ? 'Photo' : 'File';

    const hash = (typeof meta?.hash === 'string') ? meta.hash : undefined;

    return {
      id: dto.id,
      deploymentId: dto.deploymentId,
      phaseCode: dto.phaseCode ?? undefined,
      subCode: dto.subCode ?? undefined,
      mediaType: dto.kind,         // business tag to FE mediaType
      kind: feKind,                // FE kind from BE mediaType
      fileName: dto.fileName,
      contentType: dto.contentType,
      sizeBytes: dto.sizeBytes,
      url: (meta?.thumbUrl as string) || dto.url, // show thumb if present
      uploadedBy: dto.uploadedBy ?? undefined,
      uploadedAt: dto.uploadedAt,
      hash,
      metadataJson: dto.metadataJson ?? undefined
    };
  };
}

// JSON helper
function safeParse(json?: string | null): any | undefined {
  if (!json) return undefined;
  try { return JSON.parse(json); } catch { return undefined; }
}
