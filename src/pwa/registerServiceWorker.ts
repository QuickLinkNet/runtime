export const PWA_UPDATE_EVENT = 'runtime:pwa-update';

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    const serviceWorkerUrl = new URL('sw.js', document.baseURI).href;
    void navigator.serviceWorker.register(serviceWorkerUrl, { scope: './' }).then((registration) => {
      function announceUpdate(): void {
        if (registration.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent(PWA_UPDATE_EVENT, { detail: registration }));
        }
      }

      announceUpdate();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') announceUpdate();
        });
      });

      const checkForUpdate = () => {
        if (document.visibilityState === 'visible' && navigator.onLine) void registration.update();
      };
      document.addEventListener('visibilitychange', checkForUpdate);
      window.setInterval(checkForUpdate, 60 * 60 * 1000);
    }).catch(() => {
      // The game remains usable when service-worker registration is unavailable.
    });
  }, { once: true });
}
