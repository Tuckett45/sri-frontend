export const environment = {
  production: true,
  apiUrl: 'https://sri-api.azurewebsites.net/api',
  // API subscription key and VAPID key are now fetched securely at runtime
  // from the backend configuration service for security
  receiptBlobBaseUrl: 'https://databaseblob.blob.core.windows.net/expenseimages'
};

//Staging
export const staging_environment = {
  production: false,
  apiUrl: 'https://sri-api-staging-b0amh5fpbjbtchf5.centralus-01.azurewebsites.net',
  // API subscription key and VAPID key are now fetched securely at runtime
  receiptBlobBaseUrl: 'https://databaseblob.blob.core.windows.net/expenseimages'
};

// Local server
export const local_environment = {
  production: false,
  apiUrl: 'https://localhost:44376/api',
  // API subscription key and VAPID key are now fetched securely at runtime
  receiptBlobBaseUrl: 'https://databaseblob.blob.core.windows.net/expenseimages'
};

