export const environment = {
  production: true,
  apiUrl: 'https://sri-api.azurewebsites.net/api',
  apiSubscriptionKey: 'ffd675634ab645d7845640bb88d672d8',
  vapidPublicKey: '' // TODO: Generate VAPID keys with: npx web-push generate-vapid-keys
};

//Staging
export const staging_environment = {
  production: false,
  apiUrl: 'https://sri-api-staging-b0amh5fpbjbtchf5.centralus-01.azurewebsites.net',
  apiSubscriptionKey: 'ffd675634ab645d7845640bb88d672d8',
  vapidPublicKey: '' // TODO: Generate VAPID keys with: npx web-push generate-vapid-keys
};

// Local server
export const local_environment = {
  production: false,
  apiUrl: 'https://localhost:44376/api',
  apiSubscriptionKey: 'ffd675634ab645d7845640bb88d672d8',
  vapidPublicKey: '' // TODO: Generate VAPID keys with: npx web-push generate-vapid-keys
};
