// TEMPLATE — copy this file to `environments.ts` and fill in values for your
// environment. The real `environments.ts` is git-ignored and MUST NOT contain
// committed secrets. Secrets (API subscription key, CARTO key, VAPID key) are
// fetched securely at runtime from the backend ConfigurationService — leave the
// corresponding fields empty here.

export const environment = {
  production: true,
  apiUrl: 'https://sri-api.azurewebsites.net/api',
  // ATLAS platform backend (governance & lifecycle API)
  atlasApiUrl: 'https://atlas-api-fqf5e6dfgdebepan.centralus-01.azurewebsites.net/v1',
  receiptBlobBaseUrl: 'https://databaseblob.blob.core.windows.net/expenseimages',
  // Fetched securely at runtime — leave empty.
  vapidPublicKey: '',
  enableSignalR: false,
  googleAnalyticsId: 'G-XXXXXXXXXX',
  // CARTO basemap API key — fetched securely at runtime, never committed.
  cartoApiKey: ''
};

// Staging
export const staging_environment = {
  production: false,
  apiUrl: 'https://sri-api-staging-b0amh5fpbjbtchf5.centralus-01.azurewebsites.net/v1',
  atlasApiUrl: 'https://atlas-api-staging.azurewebsites.net/v1',
  receiptBlobBaseUrl: 'https://databaseblob.blob.core.windows.net/expenseimages',
  vapidPublicKey: '',
  enableSignalR: false,
  googleAnalyticsId: 'G-XXXXXXXXXX',
  cartoApiKey: ''
};

// Local server
export const local_environment = {
  production: false,
  apiUrl: 'https://localhost:44376/api',
  atlasApiUrl: 'https://localhost:7028/v1',
  receiptBlobBaseUrl: 'https://databaseblob.blob.core.windows.net/expenseimages',
  vapidPublicKey: '',
  enableSignalR: false,
  googleAnalyticsId: undefined,
  cartoApiKey: ''
};
