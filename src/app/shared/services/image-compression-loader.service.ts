import { Injectable } from '@angular/core';

/**
 * Service for dynamically loading image compression library
 * This reduces initial bundle size by loading ngx-image-compress only when needed
 */
@Injectable({
  providedIn: 'root'
})
export class ImageCompressionLoaderService {
  private imageCompressPromise: Promise<typeof import('ngx-image-compress')> | null = null;

  /**
   * Dynamically imports ngx-image-compress library
   */
  async loadImageCompress(): Promise<typeof import('ngx-image-compress')> {
    if (!this.imageCompressPromise) {
      this.imageCompressPromise = import('ngx-image-compress');
    }
    return this.imageCompressPromise;
  }

  /**
   * Compress an image file
   * @param imageFile Base64 image string or File
   * @param quality Compression quality (0-100)
   * @returns Compressed image as base64 string
   */
  async compressImage(
    imageFile: string | File,
    quality: number = 75
  ): Promise<string> {
    const { NgxImageCompressService } = await this.loadImageCompress();
    const compressService = new NgxImageCompressService();

    if (typeof imageFile === 'string') {
      return compressService.compressFile(imageFile, -1, quality, quality);
    } else {
      // Convert File to base64 first
      const base64 = await this.fileToBase64(imageFile);
      return compressService.compressFile(base64, -1, quality, quality);
    }
  }

  /**
   * Convert File to base64 string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
