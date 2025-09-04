self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New task or lead update!',
    icon: 'https://via.placeholder.com/192x192?text=AG',
    badge: 'https://via.placeholder.com/32x32?text=AG',
    requireInteraction: true,
  };
  event.waitUntil(
    self.registration.showNotification('Aavana Greens AI', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});