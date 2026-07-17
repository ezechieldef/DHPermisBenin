export async function getOfflineStorageInfo() {
  const estimate = await navigator.storage?.estimate?.();
  const persisted = await navigator.storage?.persisted?.();
  return {
    supported: Boolean(navigator.serviceWorker && 'caches' in globalThis),
    usage: estimate?.usage || 0,
    quota: estimate?.quota || 0,
    available: Math.max(0, (estimate?.quota || 0) - (estimate?.usage || 0)),
    persisted: Boolean(persisted),
  };
}

export async function requestPersistentOfflineStorage() {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}

export async function loadPackCatalog() {
  const response = await fetch('/offline-packs.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Le catalogue hors ligne est indisponible.');
  return response.json();
}

export async function downloadOfflinePack(pack) {
  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active;
  if (!worker) throw new Error('Le service hors ligne n’est pas encore actif.');
  worker.postMessage({ type: 'DOWNLOAD_PACK', pack });
}

export async function deleteOfflinePack(packId) {
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({ type: 'DELETE_PACK', pack: { id: packId } });
}

export async function requestOfflinePackStatus() {
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({ type: 'GET_PACK_STATUS' });
}

export function subscribeToOfflineEvents(listener) {
  const handler = (event) => listener(event.data);
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}

export function formatBytes(bytes) {
  if (!bytes) return '0 Mo';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
