import type { AnalysisResult } from "@/lib/types";

const DB_NAME = "agrovision-results";
const STORE_NAME = "results";
const LATEST_KEY = "latest";
const LEGACY_KEY = "agrovision:lastResult";

function openResultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openResultDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = run(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

function compactResult(result: AnalysisResult): AnalysisResult {
  return {
    ...result,
    previewImage: undefined,
    frames: result.frames.map((frame) => ({ ...frame, imageData: undefined })),
  };
}

export async function saveLatestResult(result: AnalysisResult) {
  try {
    await withStore("readwrite", (store) => store.put(result, LATEST_KEY));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(compactResult(result)));
  }
}

export async function loadLatestResult(): Promise<AnalysisResult | null> {
  try {
    const result = await withStore<AnalysisResult | undefined>("readonly", (store) => store.get(LATEST_KEY));
    if (result) return result;
  } catch {
    // Fall through to legacy localStorage.
  }

  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AnalysisResult;
  } catch {
    localStorage.removeItem(LEGACY_KEY);
    return null;
  }
}
