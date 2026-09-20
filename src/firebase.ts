import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "./lib/firebase";
import { SavedAnimation } from "./types";
import { uploadBase64ToImgBB } from "./services/imgbbService";

export { db };

const COLLECTION_NAME = "animations";
const LOCAL_STORAGE_KEY = "willitoons_saved_animations_v2";
const IDB_NAME = "willitoons_hires_db";
const IDB_STORE = "hires_images";

// Lightweight IndexedDB helper for 100% lossless, crystal-clear full-resolution local image caching
function openHiresDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const dbInstance = request.result;
        if (!dbInstance.objectStoreNames.contains(IDB_STORE)) {
          dbInstance.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbGet(key: string): Promise<string | null> {
  try {
    const idb = await openHiresDB();
    if (!idb) return null;
    return new Promise((resolve) => {
      try {
        const tx = idb.transaction(IDB_STORE, "readonly");
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: string): Promise<void> {
  try {
    const idb = await openHiresDB();
    if (!idb) return;
    return new Promise((resolve) => {
      try {
        const tx = idb.transaction(IDB_STORE, "readwrite");
        const store = tx.objectStore(IDB_STORE);
        store.put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    // Ignore IndexedDB quota limits gracefully
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    const idb = await openHiresDB();
    if (!idb) return;
    return new Promise((resolve) => {
      try {
        const tx = idb.transaction(IDB_STORE, "readwrite");
        const store = tx.objectStore(IDB_STORE);
        store.delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    // ignore
  }
}

// Local storage backup cache for offline and fast loading
export function getLocalCache(): SavedAnimation[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setLocalCache(items: SavedAnimation[]): void {
  try {
    // Store metadata with compact thumbnails in localStorage to stay well under 5MB browser limits
    const safeItems = items.map((it) => ({
      ...it,
      imageUrl: it.imageUrl && it.imageUrl.length > 50000 ? "" : it.imageUrl,
    }));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(safeItems));
  } catch {
    // ignore quota
  }
}

// Convert image URL to Data URL if needed
export async function ensureDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Could not convert image to data URL:", err);
    return url;
  }
}

// Generate a lightweight thumbnail (< 20KB) for fast cloud sync and preview
export async function generateThumbnail(
  imageUrl: string,
  frameWidth: number,
  frameHeight: number,
  activeRow: number = 0,
  maxSize: number = 100
): Promise<string> {
  if (!imageUrl) return "";
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const fw = frameWidth || img.naturalWidth || 100;
        const fh = frameHeight || img.naturalHeight || 100;
        const scale = Math.min(maxSize / fw, maxSize / fh, 1);
        const tw = Math.max(32, Math.round(fw * scale));
        const th = Math.max(32, Math.round(fh * scale));
        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, activeRow * fh, fw, fh, 0, 0, tw, th);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
          return;
        }
      } catch {
        // ignore
      }
      resolve(imageUrl.length < 30000 ? imageUrl : "");
    };
    img.onerror = () => resolve(imageUrl.length < 30000 ? imageUrl : "");
    img.src = imageUrl;
  });
}

// Subscribe to real-time animation updates from Firestore
export function subscribeToSavedAnimations(
  callback: (animations: SavedAnimation[]) => void
): () => void {
  // 1. Immediately emit local cache for instant UI response
  const initialCache = getLocalCache();
  if (initialCache.length > 0) {
    callback(initialCache);
    (async () => {
      let updated = false;
      const hydrated = await Promise.all(
        initialCache.map(async (item) => {
          if (!item.imageUrl) {
            const cached = await idbGet(`img_${item.id}`);
            if (cached) {
              updated = true;
              return { ...item, imageUrl: cached };
            }
          }
          return item;
        })
      );
      if (updated) {
        callback(hydrated);
      }
    })();
  }

  let unsubFirestore: (() => void) | null = null;

  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("serialNumber", "asc"));
    unsubFirestore = onSnapshot(
      q,
      async (snapshot) => {
        const items: SavedAnimation[] = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          let img = (data.imageUrl as string) || (data.thumbnailUrl as string) || "";

          // Hydrate full-resolution image from local IndexedDB first
          const localOriginal = await idbGet(`img_${docSnap.id}`);
          if (localOriginal) {
            img = localOriginal;
          }

          const rowCount = Number(data.rowCount) || 1;
          const activeRow = data.activeRow !== undefined ? Number(data.activeRow) : 0;
          const natW = Number(data.naturalWidth) || 1600;
          const natH = Number(data.naturalHeight) || 600;
          const fCount = Number(data.frameCount) || 4;
          const singleWidth = Math.max(1, Math.round(natW / fCount));
          const singleHeight = Math.max(1, Math.round(natH / rowCount));
          const ratio = singleWidth / singleHeight;

          items.push({
            id: docSnap.id,
            serialNumber: data.serialNumber || items.length + 1,
            imageUrl: img,
            fileName: data.fileName || `Animation ${data.serialNumber || items.length + 1}`,
            frameCount: fCount,
            rowCount: rowCount,
            activeRow: activeRow,
            duration: Number(data.duration) || 1,
            naturalWidth: natW,
            naturalHeight: natH,
            frameWidth: Number(data.frameWidth) || singleWidth,
            frameHeight: Number(data.frameHeight) || singleHeight,
            aspectRatio: Number(data.aspectRatio) || ratio,
            fps: Number(data.fps) || 4,
            createdAt: Number(data.createdAt) || Date.now(),
          });
        }

        items.sort((a, b) => a.serialNumber - b.serialNumber);
        setLocalCache(items);
        callback(items);
      },
      (error) => {
        console.warn("Firestore snapshot listener error, using local fallback:", error);
      }
    );
  } catch (err) {
    console.warn("Firestore subscribe error:", err);
  }

  return () => {
    if (unsubFirestore) unsubFirestore();
  };
}

// Save a new animation with serial order (1, 2, 3...) at 100% UNTOUCHED ORIGINAL RESOLUTION
export async function saveAnimation(params: {
  imageUrl: string;
  fileName: string;
  frameCount: number;
  rowCount?: number;
  activeRow?: number;
  duration: number;
  naturalWidth: number;
  naturalHeight: number;
}): Promise<SavedAnimation> {
  const rawImageUrl = params.imageUrl;
  const imageUrl = await ensureDataUrl(rawImageUrl);
  const { fileName, frameCount, duration, naturalWidth, naturalHeight } = params;
  const rowCount = params.rowCount || 1;
  const activeRow = params.activeRow !== undefined ? params.activeRow : 0;

  // 1. Determine next serial number
  let nextSerial = 1;
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    let highestSerial = 0;
    snapshot.forEach((d) => {
      const data = d.data();
      const num = Number(data.serialNumber);
      if (!isNaN(num) && num > highestSerial) {
        highestSerial = num;
      }
    });
    nextSerial = highestSerial + 1;
  } catch (err) {
    console.warn("Firestore query fallback to local cache:", err);
    const local = getLocalCache();
    const highestLocal = local.reduce((max, cur) => Math.max(max, cur.serialNumber || 0), 0);
    nextSerial = highestLocal + 1;
  }

  const singleWidth = Math.max(1, Math.round(naturalWidth / frameCount));
  const singleHeight = Math.max(1, Math.round(naturalHeight / rowCount));
  const ratio = singleWidth / singleHeight;
  const calculatedFps = Math.max(1, Math.round(frameCount / duration));

  const createdId = `anim_${Date.now()}_${nextSerial}`;

  // 2. Store 100% original full-resolution image in IndexedDB (zero latency, no quota limit)
  await idbSet(`img_${createdId}`, imageUrl);

  // 3. Obtain a permanent, cross-device public URL via ImgBB for Firestore
  let cloudImageUrl = imageUrl;
  if (!imageUrl.startsWith("http")) {
    try {
      const uploadRes = await uploadBase64ToImgBB(imageUrl, fileName || `Animation ${nextSerial}`);
      if (uploadRes.success && uploadRes.url.startsWith("http")) {
        cloudImageUrl = uploadRes.url;
      }
    } catch (err) {
      console.warn("ImgBB upload failed for animation, using fallback:", err);
    }
  }

  // 4. Generate a tiny thumbnail (< 20KB) for the cloud document
  const thumbUrl = await generateThumbnail(imageUrl, singleWidth, singleHeight, activeRow);

  // If cloudImageUrl is remote (http/https), save directly. If base64, save if under 650KB.
  const safeCloudImage = cloudImageUrl.startsWith("http")
    ? cloudImageUrl
    : (cloudImageUrl.length < 650000 ? cloudImageUrl : "");

  const docPayload: Record<string, unknown> = {
    id: createdId,
    serialNumber: nextSerial,
    thumbnailUrl: thumbUrl,
    imageUrl: safeCloudImage,
    fileName: fileName || `Animation ${nextSerial}`,
    frameCount,
    rowCount,
    activeRow,
    duration,
    naturalWidth,
    naturalHeight,
    frameWidth: singleWidth,
    frameHeight: singleHeight,
    aspectRatio: ratio,
    fps: calculatedFps,
    loop: true,
    type: "character_spritesheet",
    createdAt: Date.now(),
  };

  // 5. Save metadata to Cloud Firestore (single atomic document write)
  try {
    const docRef = doc(db, COLLECTION_NAME, createdId);
    await setDoc(docRef, docPayload, { merge: true });
  } catch (err) {
    console.warn("Firestore write error, relying on local storage:", err);
  }

  const effectiveImageUrl = cloudImageUrl.startsWith("http") ? cloudImageUrl : imageUrl;

  const newSavedItem: SavedAnimation = {
    id: createdId,
    serialNumber: nextSerial,
    imageUrl: effectiveImageUrl,
    thumbnailUrl: thumbUrl,
    fileName: fileName || `Animation ${nextSerial}`,
    frameCount,
    rowCount,
    activeRow,
    duration,
    naturalWidth,
    naturalHeight,
    frameWidth: singleWidth,
    frameHeight: singleHeight,
    aspectRatio: ratio,
    fps: calculatedFps,
    createdAt: docPayload.createdAt as number,
  };

  // Sync local cache
  const current = getLocalCache().filter((i) => i.id !== createdId);
  current.push(newSavedItem);
  current.sort((a, b) => a.serialNumber - b.serialNumber);
  setLocalCache(current);

  return newSavedItem;
}

// Delete an animation from Firestore, IndexedDB, and LocalStorage
export async function deleteSavedAnimation(id: string): Promise<void> {
  // Delete from Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Firestore delete warning:", err);
  }

  // Delete from local IndexedDB
  await idbDelete(`img_${id}`);

  // Update local cache
  const local = getLocalCache().filter((item) => item.id !== id);
  setLocalCache(local);
}
