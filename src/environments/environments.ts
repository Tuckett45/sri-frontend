export const environment = {
  production: true,
  apiUrl: 'https://sri-api.azurewebsites.net/api',
  // ATLAS platform backend (governance & lifecycle API)
  atlasApiUrl: 'https://sri-backend.azure-api.net/atlas/v1',
  // API subscription key and VAPID key are now fetched securely at runtime
  // from the backend configuration service for security
  receiptBlobBaseUrl: 'https://databaseblob.blob.core.windows.net/expenseimages',
  vapidPublicKey: 'BOg-2-T3wIzg42wyoCXxTdkYqShVYCQ87g_ZXUS6lYG-ymcoYfl3qpXq3ImqMoJ9UY1EQAxXBLaywuvuF21yD4s',
  enableSignalR: true, // Enable SignalR real-time features
  googleAnalyticsId: 'G-XXXXXXXXXX' // Replace with actual GA4 Measurement ID
};

//Staging
export const staging_environment = {
  production: false,
  apiUrl: 'https://sri-api-staging-b0amh5fpbjbtchf5.centralus-01.azurewebsites.net/v1',
  // ATLAS platform backend (staging)
  atlasApiUrl: 'https://atlas-api-staging.azurewebsites.net/v1',
  // API subscription key and VAPID key are now fetched securely at runtime
  receiptBlobBaseUrl: 'https://databaseblob.blob.core.windows.net/expenseimages',
  vapidPublicKey: 'BOg-2-T3wIzg42wyoCXxTdkYqShVYCQ87g_ZXUS6lYG-ymcoYfl3qpXq3ImqMoJ9UY1EQAxXBLaywuvuF21yD4s',
  enableSignalR: true, // Enable SignalR real-time features
  googleAnalyticsId: 'G-XXXXXXXXXX' // Replace with actual GA4 Measurement ID for staging
};

// Local server
export const local_environment = {
  production: false,
  apiUrl: 'https://localhost:44350/v1',
  // ATLAS platform backend (local)
  atlasApiUrl: 'https://localhost:7028',
  // API subscription key and VAPID key are now fetched securely at runtime
  receiptBlobBaseUrl: 'https://databaseblob.blob.core.windows.net/expenseimages',
  vapidPublicKey: 'BOg-2-T3wIzg42wyoCXxTdkYqShVYCQ87g_ZXUS6lYG-ymcoYfl3qpXq3ImqMoJ9UY1EQAxXBLaywuvuF21yD4s',
  enableSignalR: false, // Disable SignalR for local development without backend
  googleAnalyticsId: undefined // Disable analytics in local development
};

