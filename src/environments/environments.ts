export const environment = {
  production: true,
  apiUrl: 'https://sri-api.azurewebsites.net/api',
  apiSubscriptionKey: 'ffd675634ab645d7845640bb88d672d8',
  // VAPID public key for push notifications
  // Generated with: npx web-push generate-vapid-keys
  vapidPublicKey: 'BOg-2-T3wIzg42wyoCXxTdkYqShVYCQ87g_ZXUS6lYG-ymcoYfl3qpXq3ImqMoJ9UY1EQAxXBLaywuvuF21yD4s'
};

//Staging
export const staging_environment = {
  production: false,
  apiUrl: 'https://sri-api-staging-b0amh5fpbjbtchf5.centralus-01.azurewebsites.net',
  apiSubscriptionKey: 'ffd675634ab645d7845640bb88d672d8',
  vapidPublicKey: 'BOg-2-T3wIzg42wyoCXxTdkYqShVYCQ87g_ZXUS6lYG-ymcoYfl3qpXq3ImqMoJ9UY1EQAxXBLaywuvuF21yD4s'
};

// Local server
export const local_environment = {
  production: false,
  apiUrl: 'https://localhost:44376/api',
  apiSubscriptionKey: 'ffd675634ab645d7845640bb88d672d8',
  vapidPublicKey: 'BOg-2-T3wIzg42wyoCXxTdkYqShVYCQ87g_ZXUS6lYG-ymcoYfl3qpXq3ImqMoJ9UY1EQAxXBLaywuvuF21yD4s'
};

