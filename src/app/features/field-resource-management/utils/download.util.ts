/**
 * Triggers a browser file download from a Blob.
 * Creates a temporary anchor element to initiate the download,
 * then cleans up the object URL.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
