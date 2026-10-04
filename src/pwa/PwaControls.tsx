import { useEffect, useRef, useState } from 'react';
import { PWA_UPDATE_EVENT } from './registerServiceWorker';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function PwaControls() {
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [update, setUpdate] = useState<ServiceWorkerRegistration | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const reloadForUpdate = useRef(false);
  const standalone = isStandalone();
  const showIosInstall = !standalone && !installPrompt && isIos();

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
    const onUpdate = (event: Event) => setUpdate((event as CustomEvent<ServiceWorkerRegistration>).detail);
    const onControllerChange = () => {
      if (reloadForUpdate.current) window.location.reload();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener(PWA_UPDATE_EVENT, onUpdate);
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener(PWA_UPDATE_EVENT, onUpdate);
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  async function install(): Promise<void> {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function activateUpdate(): void {
    reloadForUpdate.current = true;
    update?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  }

  if (standalone && online && !update) return null;
  if (online && !update && !installPrompt && !showIosInstall) return null;

  return (
    <div className="pwa-controls" aria-live="polite">
      {!online && (
        <div className="pwa-notice is-offline">
          <span><i />Offline – dein laufendes Match bleibt erhalten.</span>
        </div>
      )}
      {update && (
        <div className="pwa-notice is-update">
          <span>Eine neue RUNTIME-Version ist bereit.</span>
          <button type="button" onClick={activateUpdate}>Jetzt aktualisieren</button>
        </div>
      )}
      {!standalone && installPrompt && (
        <div className="pwa-notice is-install">
          <span>RUNTIME als App installieren.</span>
          <button type="button" onClick={() => void install()}>Installieren</button>
          <button className="pwa-dismiss" type="button" onClick={() => setInstallPrompt(null)} aria-label="Installationshinweis schließen">×</button>
        </div>
      )}
      {showIosInstall && (
        <div className="pwa-notice is-install">
          <span>{showIosHelp ? 'In Safari: Teilen → Zum Home-Bildschirm.' : 'RUNTIME als App nutzen.'}</span>
          <button type="button" onClick={() => setShowIosHelp((visible) => !visible)}>{showIosHelp ? 'Schließen' : 'Installieren'}</button>
        </div>
      )}
    </div>
  );
}
