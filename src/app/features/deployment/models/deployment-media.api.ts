export interface DeploymentMediaUploadResponse {
  id: string;
  url: string;
  mediaType: 'image' | 'pdf' | 'video';
  kind: string;          // e.g. "LabelFront"
  thumbUrl?: string | null;
}

export interface DeploymentMediaItemDto {
  id: string;
  deploymentId: string;
  phaseCode?: number | null;
  subCode?: string | null;
  mediaType: 'image' | 'pdf' | 'video';
  kind: string;                      // business kind e.g. "LabelFront"
  fileName: string;
  contentType: string;
  sizeBytes: number;
  url: string;
  uploadedBy?: string | null;
  uploadedAt: string;                // ISO string from server
  metadataJson?: string | null;      // contains caption, takenAt, thumbUrl, width, height, hash
}

export interface DeploymentMediaProgressDto {
  phaseCode?: number | null;
  subCode?: string | null;
  mediaType: 'image' | 'pdf' | 'video';
  kind: string;
  requiredCount: number;
  uploadedCount: number;
}
