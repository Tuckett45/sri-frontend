// Service Worker for Push Notifications
// This handles push notifications when the app is not active

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Handle push notification received
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  if (!event.data) {
    console.warn('Push event has no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (error) {
    console.error('Failed to parse push data:', error);
    data = {
      title: 'Deployment Update',
      body: event.data.text(),
      icon: '/assets/icons/icon-192x192.png'
    };
  }

  const options = {
    body: data.body || 'You have a new deployment notification',
    icon: data.icon || '/assets/icons/icon-192x192.png',
    badge: data.badge || '/assets/icons/badge-72x72.png',
    data: data.data || {},
    tag: data.tag || 'deployment-notification',
    requireInteraction: data.requireInteraction || false,
    vibrate: data.vibrate || [200, 100, 200],
    actions: data.actions || [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Deployment Update', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Handle notification click - navigate to relevant page
  const data = event.notification.data || {};
  let url = '/';

  // Check if navigateOnClick is specified (for Magic 8 Ball and other features)
  if (data.navigateOnClick && Array.isArray(data.navigateOnClick)) {
    url = data.navigateOnClick.join('/');
  } else if (data.deploymentId) {
    // Legacy deployment notification handling
    if (data.type === 'signoff') {
      url = `/deployments/${data.deploymentId}/handoff`;
    } else if (data.type === 'issue') {
      url = `/deployments/${data.deploymentId}/issues`;
    } else {
      url = `/deployments/${data.deploymentId}`;
    }
  } else if (data.type === 'magic-8-ball') {
    // Magic 8 Ball notifications navigate to notifications page
    url = '/notifications';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no existing window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  // Could track analytics here
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Track notification dismissal if needed
  const notification = event.notification;
  const data = notification.data || {};

  if (data.trackDismissal) {
    // Send analytics event or API call
    console.log('Notification dismissed:', data);
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data.payload;
    self.registration.showNotification(title, options);
  }
});
