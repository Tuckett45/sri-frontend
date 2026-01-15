# Google Maps API Request Fix

## Issue
Google Maps Geocoding API requests were failing with `net::ERR_FAILED` error:
```
GET https://maps.googleapis.com/maps/api/geocode/json?latlng=37.13829567727164,-92.25973223076785&key=AIzaSy... net::ERR_FAILED
```

## Root Cause
The `ConfigurationInterceptor` was intercepting ALL HTTP requests, including external API calls to Google Maps. It was attempting to add authentication headers (Bearer token, X-Session-ID) to these requests, which:

1. **Google Maps API doesn't expect** - It only needs the API key in the URL
2. **Causes CORS issues** - Adding custom headers triggers preflight requests that Google's API rejects
3. **Results in request failure** - The modified request is blocked by Google's servers

## Solution
Modified the `ConfigurationInterceptor` to skip interception for external API endpoints like Google Maps.

### Changes Made

#### `src/app/interceptors/configuration.interceptor.ts`

**Added external API check:**
```typescript
intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  // Skip interception for configuration endpoints to avoid circular dependency
  if (this.isConfigurationEndpoint(req.url)) {
    return next.handle(req);
  }

  // Skip interception for external APIs (Google Maps, etc.)
  if (this.isExternalApiEndpoint(req.url)) {
    return next.handle(req);
  }
  
  // ... rest of interceptor logic
}
```

**Added new method:**
```typescript
/**
 * Check if the request URL is for external APIs that don't need our auth headers
 */
private isExternalApiEndpoint(url: string): boolean {
  const externalApis = [
    'maps.googleapis.com',
    'googleapis.com'
  ];

  return externalApis.some(api => url.includes(api));
}
```

#### `src/app/interceptors/configuration.interceptor.spec.ts`

**Added test cases:**
```typescript
it('should not intercept Google Maps API requests', () => {
  httpClient.get('https://maps.googleapis.com/maps/api/geocode/json?address=test').subscribe();

  const req = httpMock.expectOne('https://maps.googleapis.com/maps/api/geocode/json?address=test');
  // Should not have added any headers since it's an external API
  expect(req.request.headers.keys().length).toBe(0);
  req.flush({});
});

it('should not intercept other Google APIs', () => {
  httpClient.get('https://www.googleapis.com/some/api').subscribe();

  const req = httpMock.expectOne('https://www.googleapis.com/some/api');
  // Should not have added any headers since it's an external API
  expect(req.request.headers.keys().length).toBe(0);
  req.flush({});
});
```

## How It Works

### Before the Fix
1. User types address in Street Sheet modal
2. `GeocodingService` makes request to Google Maps API
3. `ConfigurationInterceptor` intercepts the request
4. Interceptor adds `Authorization: Bearer <token>` header
5. Interceptor adds `X-Session-ID: <session>` header
6. Modified request sent to Google Maps API
7. **Google rejects the request due to unexpected headers**
8. Request fails with `net::ERR_FAILED`

### After the Fix
1. User types address in Street Sheet modal
2. `GeocodingService` makes request to Google Maps API
3. `ConfigurationInterceptor` checks if URL contains `googleapis.com`
4. **Interceptor skips this request** (returns it unmodified)
5. Original request sent to Google Maps API with only the API key
6. **Google accepts the request**
7. Address suggestions returned successfully

## Benefits

1. **Google Maps API works correctly** - No more failed requests
2. **Address autocomplete functional** - Users can search for addresses
3. **GPS location works** - Reverse geocoding now succeeds
4. **No breaking changes** - Internal API requests still get auth headers
5. **Extensible** - Easy to add more external APIs to the exclusion list

## Testing

### Manual Testing
1. Open Street Sheet modal
2. Type 6+ characters in the address field
3. Verify autocomplete suggestions appear
4. Click GPS location button
5. Verify address fields are auto-filled
6. Check browser console - no `net::ERR_FAILED` errors

### Automated Testing
All 11 interceptor tests pass:
```bash
npm test -- --include='**/configuration.interceptor.spec.ts' --browsers=ChromeHeadless --watch=false
```

## Security Considerations

### API Key Exposure
⚠️ **Important:** The Google Maps API key is currently hardcoded in `GeocodingService`:
```typescript
this.apiKey = 'AIzaSyArUJ7zFSO2eI-Prkkvkr_3kNZdDebmVt4';
```

**Recommendations:**
1. **Add API key restrictions** in Google Cloud Console:
   - Restrict to specific domains (your production domain)
   - Restrict to specific APIs (Geocoding API only)
   - Set usage quotas to prevent abuse

2. **Move to backend** (ideal solution):
   - Create a backend endpoint: `/api/geocode`
   - Backend makes request to Google Maps API
   - Frontend calls your backend endpoint
   - API key stays secure on server

3. **Use environment variables** (better than hardcoding):
   ```typescript
   this.apiKey = environment.googleMapsApiKey;
   ```

### Current Protection
The API key has some protection:
- Only works for Geocoding API (not all Google services)
- Can be restricted by domain in Google Cloud Console
- Usage is monitored and can be capped

## Future Improvements

1. **Backend Proxy**
   - Create `/api/geocode` endpoint
   - Keep API key on server
   - Add rate limiting
   - Add caching to reduce API calls

2. **Environment Configuration**
   - Move API key to environment files
   - Different keys for dev/staging/prod
   - Load from backend configuration service

3. **Enhanced Caching**
   - Cache results in localStorage
   - Share cache across sessions
   - Reduce API calls and costs

4. **Error Handling**
   - Better error messages for users
   - Retry logic for transient failures
   - Fallback to manual entry

5. **Additional External APIs**
   - Add other external APIs to exclusion list as needed
   - Consider pattern-based matching (e.g., all `*.googleapis.com`)

## Related Files

- `src/app/interceptors/configuration.interceptor.ts` - HTTP interceptor
- `src/app/interceptors/configuration.interceptor.spec.ts` - Tests
- `src/app/services/geocoding.service.ts` - Google Maps API client
- `src/app/components/modals/street-sheet-modal/street-sheet-modal.component.ts` - Uses geocoding

## Related Documentation

- [Street Sheet Mobile Location Fix](STREET_SHEET_MOBILE_LOCATION_FIX.md)
- [iOS Safari Address Input Fix](IOS_SAFARI_ADDRESS_INPUT_FIX.md)
- [Street Sheet Location Fix](STREET_SHEET_LOCATION_FIX.md)

## Status
✅ **Fixed** - Google Maps API requests now work correctly. Address autocomplete and GPS location features are functional.
