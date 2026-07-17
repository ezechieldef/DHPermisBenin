import { Platform } from 'react-native';

export type OfflineFile = { url: string; bytes: number; sha256?: string };
export type OfflinePack = { id: string; title: string; version: number; bytes: number; fileCount: number; files: OfflineFile[] };
export type OfflineCatalog = { schemaVersion: number; generatedAt: string; integrity: string; totalBytes: number; totalFiles: number; packs: OfflinePack[] };
export type OfflineEvent = {
  type: 'PACK_PROGRESS' | 'PACK_COMPLETE' | 'PACK_ERROR' | 'PACK_DELETED' | 'PACK_CANCELLED' | 'PACK_STATUS' | 'UPDATE_AVAILABLE';
  packId?: string;
  completed?: number;
  total?: number;
  message?: string;
  installed?: string[];
};

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
let deferredInstallPrompt: InstallPromptEvent | null = null;
const installListeners = new Set<() => void>();

function isWeb() { return Platform.OS === 'web' && typeof window !== 'undefined'; }

if (isWeb()) {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as InstallPromptEvent;
    installListeners.forEach((listener) => listener());
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installListeners.forEach((listener) => listener());
  });
}

export function isPwaSupported() {
  return isWeb() && 'serviceWorker' in navigator && 'caches' in window;
}

export function isStandalonePwa() {
  if (!isWeb()) return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function canPromptInstall() { return Boolean(deferredInstallPrompt) && !isStandalonePwa(); }

export function subscribeInstallAvailability(listener: () => void) {
  installListeners.add(listener);
  return () => { installListeners.delete(listener); };
}

export async function promptPwaInstall() {
  if (!deferredInstallPrompt) return 'unavailable' as const;
  await deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') deferredInstallPrompt = null;
  installListeners.forEach((listener) => listener());
  return outcome;
}

export function isIosBrowser() {
  return isWeb() && /iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalonePwa();
}

export async function loadOfflineCatalog(): Promise<OfflineCatalog> {
  if (!isPwaSupported()) throw new Error('Le stockage hors ligne complet est disponible dans la version web installable.');
  const response = await fetch('/offline-packs.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Le catalogue hors ligne est indisponible.');
  return response.json();
}

async function activeWorker() {
  if (!isPwaSupported()) throw new Error('Service hors ligne indisponible.');
  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active || navigator.serviceWorker.controller;
  if (!worker) throw new Error('Le service hors ligne démarre. Rechargez la page puis réessayez.');
  return worker;
}

export async function downloadOfflinePack(pack: OfflinePack) {
  (await activeWorker()).postMessage({ type: 'DOWNLOAD_PACK', pack });
}

export async function cancelOfflinePack(packId: string) {
  (await activeWorker()).postMessage({ type: 'CANCEL_PACK', pack: { id: packId } });
}

export async function deleteOfflinePack(packId: string) {
  (await activeWorker()).postMessage({ type: 'DELETE_PACK', pack: { id: packId } });
}

export async function requestOfflinePackStatus() {
  (await activeWorker()).postMessage({ type: 'GET_PACK_STATUS' });
}

export function subscribeOfflineEvents(listener: (event: OfflineEvent) => void) {
  if (!isPwaSupported()) return () => undefined;
  const handler = (event: MessageEvent<OfflineEvent>) => listener(event.data);
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}

export async function getOfflineStorageInfo() {
  if (!isWeb()) return { usage: 0, quota: 0, available: 0, persisted: false };
  const estimate = await navigator.storage?.estimate?.();
  const persisted = await navigator.storage?.persisted?.();
  return {
    usage: estimate?.usage || 0,
    quota: estimate?.quota || 0,
    available: Math.max(0, (estimate?.quota || 0) - (estimate?.usage || 0)),
    persisted: Boolean(persisted),
  };
}

export async function requestPersistentStorage() {
  if (!isWeb() || !navigator.storage?.persist) return false;
  return navigator.storage.persist();
}

export async function activateWaitingServiceWorker() {
  if (!isPwaSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.waiting) return;
  const changed = new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  await Promise.race([changed, new Promise<void>((resolve) => window.setTimeout(resolve, 3000))]);
  window.location.reload();
}

export function watchForPwaUpdate(listener: (available: boolean) => void) {
  if (!isPwaSupported()) return () => undefined;
  let registration: ServiceWorkerRegistration | undefined;
  let installing: ServiceWorker | null = null;
  const stateChanged = () => {
    if (installing?.state === 'installed' && navigator.serviceWorker.controller) listener(true);
  };
  const updateFound = () => {
    installing?.removeEventListener('statechange', stateChanged);
    installing = registration?.installing ?? null;
    installing?.addEventListener('statechange', stateChanged);
  };
  void navigator.serviceWorker.getRegistration().then((value) => {
    registration = value;
    if (registration?.waiting) listener(true);
    registration?.addEventListener('updatefound', updateFound);
    void registration?.update();
  });
  return () => {
    installing?.removeEventListener('statechange', stateChanged);
    registration?.removeEventListener('updatefound', updateFound);
  };
}

export function formatBytes(bytes: number) {
  if (!bytes) return '0 Mo';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
