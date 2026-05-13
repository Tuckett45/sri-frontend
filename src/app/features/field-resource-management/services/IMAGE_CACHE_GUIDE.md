# Image Cache Service Guide

## Overview

The Image Cache Service provides efficient image caching using the browser's Cache API for PWA support and offline access. It manages cache size limits, TTL-based expiration, and automatic cleanup.

## Features

- **Cache API Integration**: Uses browser Cache API for PWA support
- **Offline Access**: Cached images available when offline
- **TTL-Based Expiration**: Automatic cache expiration (default: 7 days)
- **Size Management**: LRU (Least Recently Used) eviction when cache is full
- **Manual Invalidation**: Clear specific images or entire cache
- **Statistics**: Monitor cache usage and hit rates
- **Service Worker Ready**: Compatible with service worker caching strategies

## Configuration

Default configuration:
```typescript
{
  maxCacheSize: 50 * 1024 * 1024, // 50 MB
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  cacheName: 'frm-image-cache-v1'
}
```

Update configuration:
```typescript
imageCacheService.updateConfig({
  maxCacheSize: 100 * 1024 * 1024, // 100 MB
  maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
});
```

## Usage Examples

### Basic Image Caching

```typescript
import { ImageCacheService } from './services/image-cache.service';

constructor(private imageCacheService: ImageCacheService) {}

// Cache an image from URL
cacheImageFromUrl(url: string): void {
  this.imageCacheService.cacheImage(url).subscribe({
    next: () => console.log('Image cached successfully'),
    error: (err) => console.error('Failed to cache image:', err)
  });
}

// Cache an image from Blob
cacheImageFromBlob(url: string, blob: Blob): void {
  this.imageCacheService.cacheImage(url, blob).subscribe({
    next: () => console.log('Image cached successfully'),
    error: (err) => console.error('Failed to cache image:', err)
  });
}
```

### Retrieving Cached Images

```typescript
// Get cached image
getCachedImage(url: string): void {
  this.imageCacheService.getCachedImage(url).subscribe({
    next: (blob) => {
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        this.imageElement.src = objectUrl;
        
        // Remember to revoke the object URL when done
        // URL.revokeObjectURL(objectUrl);
      } else {
        console.log('Image not in cache');
      }
    },
    error: (err) => console.error('Error retrieving image:', err)
  });
}

// Check if image is cached
async checkIfCached(url: string): Promise<void> {
  const isCached = await this.imageCacheService.isCached(url);
  console.log(`Image ${isCached ? 'is' : 'is not'} cached`);
}
```

### Caching Uploaded Files

```typescript
// Cache a file with identifier
cacheUploadedFile(file: File, jobId: string): void {
  const identifier = `job-${jobId}-photo-${Date.now()}`;
  
  this.imageCacheService.cacheFile(file, identifier).subscribe({
    next: () => console.log('File cached for offline access'),
    error: (err) => console.error('Failed to cache file:', err)
  });
}

// Retrieve cached file
getCachedFile(identifier: string): void {
  this.imageCacheService.getCachedFile(identifier).subscribe({
    next: (blob) => {
      if (blob) {
        // Use the cached file
        const objectUrl = URL.createObjectURL(blob);
        this.imageElement.src = objectUrl;
      }
    }
  });
}
```

### Preloading Images for Offline Use

```typescript
// Preload multiple images
preloadJobImages(imageUrls: string[]): void {
  this.imageCacheService.preloadImages(imageUrls).subscribe({
    next: (progress) => {
      console.log(`Preloaded ${progress.loaded}/${progress.total} images`);
      console.log(`Current image: ${progress.url}`);
    },
    complete: () => {
      console.log('All images preloaded successfully');
    },
    error: (err) => {
      console.error('Error preloading images:', err);
    }
  });
}
```

### Cache Management

```typescript
// Get cache statistics
getCacheStats(): void {
  const stats = this.imageCacheService.getStats();
  console.log(`Cache size: ${stats.sizeFormatted}`);
  console.log(`Cached images: ${stats.count}`);
  console.log(`Cache utilization: ${stats.utilizationPercent}%`);
}

// Invalidate specific image
invalidateImage(url: string): void {
  this.imageCacheService.invalidate(url);
}

// Clear all cached images
clearAllImages(): void {
  this.imageCacheService.clearAll();
}

// Get all cached URLs
getAllCachedUrls(): void {
  const urls = this.imageCacheService.getCachedUrls();
  console.log('Cached URLs:', urls);
}
```

## Integration with Components

### File Upload Component

The file upload component automatically caches uploaded images:

```typescript
// In file-upload.component.ts
private generatePreview(file: File): void {
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      this.filePreviews.push({ file, preview });
      
      // Cache the image for offline access
      const identifier = `upload-${Date.now()}-${file.name}`;
      this.imageCacheService.cacheFile(file, identifier).subscribe();
    };
    reader.readAsDataURL(file);
  }
}
```

### Job Completion Form

The job completion form caches photos before uploading:

```typescript
// In job-completion-form.component.ts
private async uploadPhotos(): Promise<void> {
  const uploadPromises = this.selectedFiles.map(file => {
    return new Promise<void>((resolve) => {
      // Cache the image for offline access before uploading
      const identifier = `job-${this.job.id}-photo-${Date.now()}-${file.name}`;
      this.imageCacheService.cacheFile(file, identifier).subscribe({
        next: () => {
          // Dispatch upload action
          this.store.dispatch(uploadAttachment({
            jobId: this.job.id,
            file
          }));
          resolve();
        }
      });
    });
  });

  await Promise.all(uploadPromises);
}
```

## Cache Eviction Strategy

The service uses an LRU (Least Recently Used) eviction strategy:

1. When cache size exceeds `maxCacheSize`, oldest images are removed first
2. Images are sorted by timestamp (oldest first)
3. Images are evicted until there's enough space for the new image
4. An additional 10% of cache space is freed to reduce frequent evictions

## TTL-Based Expiration

Images automatically expire after the configured `maxAge`:

1. When retrieving an image, the service checks if it has expired
2. Expired images are automatically removed from cache
3. Default TTL is 7 days
4. Expired images return `null` when retrieved

## Browser Compatibility

The Image Cache Service requires the Cache API, which is supported in:

- Chrome 40+
- Firefox 41+
- Safari 11.1+
- Edge 17+

For browsers without Cache API support:
- The service gracefully degrades
- Methods return appropriate fallback values
- No errors are thrown

## Performance Considerations

### Cache Size

- Default: 50 MB (suitable for most use cases)
- Adjust based on your application's needs
- Monitor cache utilization using `getStats()`

### TTL Configuration

- Shorter TTL: More frequent cache misses, fresher content
- Longer TTL: Better offline support, potentially stale content
- Balance based on your content update frequency

### Preloading Strategy

- Preload critical images during idle time
- Use `preloadImages()` for batch operations
- Consider network conditions before preloading

## Monitoring and Debugging

### Enable Console Logging

The service logs cache operations to the console:

```
[ImageCache] Initialized with 15 images (12.3 MB)
[ImageCache] Cached: https://example.com/image.jpg (245.6 KB)
[ImageCache] HIT: https://example.com/image.jpg
[ImageCache] Expired: https://example.com/old-image.jpg
[ImageCache] Evicted: https://example.com/lru-image.jpg (512.0 KB)
```

### Monitor Cache Statistics

```typescript
// Periodically check cache stats
setInterval(() => {
  const stats = this.imageCacheService.getStats();
  if (stats.utilizationPercent > 90) {
    console.warn('Cache nearly full:', stats);
  }
}, 60000); // Check every minute
```

## Best Practices

1. **Cache Strategically**: Only cache images that benefit from offline access
2. **Monitor Size**: Regularly check cache utilization to avoid hitting limits
3. **Handle Errors**: Always provide error handlers for cache operations
4. **Revoke Object URLs**: Clean up object URLs created from blobs
5. **Test Offline**: Verify offline functionality works as expected
6. **Configure Appropriately**: Adjust cache size and TTL based on your needs

## Troubleshooting

### Images Not Caching

- Check if Cache API is supported in the browser
- Verify cache size hasn't exceeded `maxCacheSize`
- Check console for error messages
- Ensure HTTPS is used (Cache API requires secure context)

### Cache Growing Too Large

- Reduce `maxCacheSize` configuration
- Decrease `maxAge` to expire images sooner
- Manually clear cache using `clearAll()`
- Implement selective caching (don't cache all images)

### Images Not Available Offline

- Verify images were cached before going offline
- Check if images have expired (TTL exceeded)
- Ensure service worker is properly configured
- Test with browser DevTools offline mode

## Related Documentation

- [Cache API MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [Service Worker Guide](../../../docs/SERVICE_WORKER_GUIDE.md)
- [Offline Support Documentation](../../../docs/OFFLINE_SUPPORT.md)
- [PWA Best Practices](../../../docs/PWA_BEST_PRACTICES.md)

## Requirements Mapping

This implementation satisfies the following requirements:

- **16.3.3**: Implement image caching
- **4.1.5**: Cache API responses with appropriate TTL
- **1.10.5**: Cache critical data for offline access
- **4.1.6**: Use lazy loading for feature modules (PWA support)
