/**
 * IndexedDB Utility for persistent cross-refresh PDF & File storage
 * Stores binary PDF Blobs directly in browser storage (up to 2GB+)
 */

const DB_NAME = "SmartLearningPDFStore";
const STORE_NAME = "planning_pdf_files";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a binary Blob persistently to IndexedDB under key
 */
export async function saveFileToIndexedDB(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("IndexedDB save warning:", e);
  }
}

/**
 * Retrieves a binary Blob from IndexedDB key
 */
export async function getFileFromIndexedDB(key: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as Blob) || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn("IndexedDB get warning:", e);
    return null;
  }
}

/**
 * Gets a fresh Blob URL for a stored key, or returns original url if fallback
 */
export async function getPersistentFileUrl(key: string, fallbackUrl?: string): Promise<string> {
  const blob = await getFileFromIndexedDB(key);
  if (blob) {
    return URL.createObjectURL(blob);
  }
  if (fallbackUrl && !fallbackUrl.startsWith("blob:")) {
    return fallbackUrl;
  }
  return fallbackUrl || "";
}
