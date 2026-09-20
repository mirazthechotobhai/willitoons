import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  writeBatch
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { AnimationPreset, FrameData } from "../types";

export type { AnimationPreset, FrameData };

const PRESETS_COLLECTION = "character_presets";
const FRAMES_SUBCOLLECTION = "frames";

// IndexedDB database for fast & unlimited local persistence
const IDB_NAME = "SundorPresetsDB";
const IDB_STORE = "presets_store";
const IDB_VERSION = 1;

function openPresetsIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const dbInstance = req.result;
      if (!dbInstance.objectStoreNames.contains(IDB_STORE)) {
        dbInstance.createObjectStore(IDB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function savePresetToIDB(preset: AnimationPreset): Promise<void> {
  try {
    const dbInstance = await openPresetsIDB();
    return new Promise((resolve, reject) => {
      const tx = dbInstance.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      store.put(preset);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("IndexedDB save warning:", err);
  }
}

async function loadPresetsFromIDB(): Promise<AnimationPreset[]> {
  try {
    const dbInstance = await openPresetsIDB();
    return new Promise((resolve, reject) => {
      const tx = dbInstance.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return [];
  }
}

async function deletePresetFromIDB(presetId: string): Promise<void> {
  try {
    const dbInstance = await openPresetsIDB();
    return new Promise((resolve, reject) => {
      const tx = dbInstance.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      store.delete(presetId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("IndexedDB delete warning:", err);
  }
}

/**
 * Creates a fast compressed thumbnail for drawer list preview
 */
export async function createThumbnail(dataUrl: string, maxDim: number = 96): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.naturalWidth || 100;
      let h = img.naturalHeight || 100;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/webp", 0.7));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Save Preset:
 * 1. Saves metadata to Firestore doc `character_presets/{presetId}`
 * 2. Saves each frame to Firestore subcollection `character_presets/{presetId}/frames/{frameId}`
 * 3. Saves all original full frames to IndexedDB for instantaneous local access.
 */
export async function savePresetToFirebase(
  preset: Omit<AnimationPreset, "createdAt" | "updatedAt">,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<void> {
  const totalFrames = preset.frames.length;
  const defIdx = preset.defaultFrameIndex ?? 0;

  // 1. Create quick thumbnail from default frame (or first frame)
  const thumbSource = preset.frames[defIdx]?.dataUrl || preset.frames[0]?.dataUrl;
  const thumb = thumbSource ? await createThumbnail(thumbSource, 96) : "";

  // 2. Save full original preset to local IndexedDB first
  const fullPreset: AnimationPreset = {
    ...preset,
    defaultFrameIndex: defIdx,
    thumbnailUrl: thumb,
  };
  await savePresetToIDB(fullPreset);

  // 3. Save main preset metadata document in Firestore
  if (onProgress) {
    onProgress(0, totalFrames, "Saving preset metadata to Firestore...");
  }

  try {
    const presetDocRef = doc(db, PRESETS_COLLECTION, preset.id);
    await setDoc(
      presetDocRef,
      {
        id: preset.id,
        name: preset.name,
        category: preset.category || "walking",
        fps: preset.fps,
        loop: preset.loop,
        frameCount: preset.frameCount,
        defaultFrameIndex: defIdx,
        thumbnailUrl: thumb,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Could not save preset to Firestore, using IndexedDB:", err);
  }

  // 4. Save frame metadata with writeBatch in controlled batches to avoid write stream exhaustion
  try {
    const BATCH_LIMIT = 20;
    for (let i = 0; i < totalFrames; i += BATCH_LIMIT) {
      const slice = preset.frames.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const frameItem of slice) {
        const frameDocRef = doc(db, PRESETS_COLLECTION, preset.id, FRAMES_SUBCOLLECTION, `frame_${frameItem.id}`);
        // Store lightweight dataUrl or preview
        batch.set(frameDocRef, {
          id: frameItem.id,
          name: frameItem.name,
          dataUrl: frameItem.dataUrl && frameItem.dataUrl.length < 100000 ? frameItem.dataUrl : "",
          isDefault: frameItem.isDefault || false,
        }, { merge: true });
      }
      await batch.commit();

      if (onProgress) {
        const current = Math.min(i + BATCH_LIMIT, totalFrames);
        onProgress(current, totalFrames, `Saved frames (${current}/${totalFrames})`);
      }
    }
  } catch (err) {
    console.warn("Could not batch save frames to Firestore (IndexedDB copy intact):", err);
  }
}

/**
 * Fetch all presets from Firestore.
 */
export async function getPresetsFromFirebase(): Promise<AnimationPreset[]> {
  const map = new Map<string, AnimationPreset>();

  // 1. Load from IndexedDB (instant, contains full frames)
  const localPresets = await loadPresetsFromIDB();
  localPresets.forEach((p) => map.set(p.id, p));

  // 2. Fetch all presets metadata from Firestore
  try {
    const colRef = collection(db, PRESETS_COLLECTION);
    const q = query(colRef, orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);

    for (const d of snap.docs) {
      const data = d.data() as AnimationPreset;
      const existing = map.get(d.id);
      if (!existing) {
        map.set(d.id, {
          id: d.id,
          name: data.name,
          category: data.category || "walking",
          fps: data.fps || 8,
          loop: data.loop !== false,
          frameCount: data.frameCount || 0,
          defaultFrameIndex: data.defaultFrameIndex ?? 0,
          thumbnailUrl: data.thumbnailUrl || "",
          frames: [],
        });
      }
    }
  } catch (err) {
    console.warn("Firestore ordered fetch error, trying unordered:", err);
    try {
      const snap = await getDocs(collection(db, PRESETS_COLLECTION));
      for (const d of snap.docs) {
        const data = d.data() as AnimationPreset;
        const existing = map.get(d.id);
        if (!existing) {
          map.set(d.id, {
            id: d.id,
            name: data.name,
            category: data.category || "walking",
            fps: data.fps || 8,
            loop: data.loop !== false,
            frameCount: data.frameCount || 0,
            defaultFrameIndex: data.defaultFrameIndex ?? 0,
            thumbnailUrl: data.thumbnailUrl || "",
            frames: [],
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch presets from Firestore:", e);
    }
  }

  return Array.from(map.values());
}

/**
 * Fetches the full original frames for a preset if they aren't loaded yet
 */
export async function getPresetFrames(presetId: string): Promise<{ id: number; name: string; dataUrl: string; isDefault?: boolean }[]> {
  // Check local IDB first
  const localPresets = await loadPresetsFromIDB();
  const found = localPresets.find((p) => p.id === presetId);
  if (found && found.frames && found.frames.length > 0) {
    return found.frames;
  }

  // Fetch from Firestore subcollection
  try {
    const subColRef = collection(db, PRESETS_COLLECTION, presetId, FRAMES_SUBCOLLECTION);
    const snap = await getDocs(subColRef);
    const framesList: { id: number; name: string; dataUrl: string; isDefault?: boolean }[] = [];
    snap.forEach((docSnap) => {
      framesList.push(docSnap.data() as { id: number; name: string; dataUrl: string; isDefault?: boolean });
    });
    framesList.sort((a, b) => a.id - b.id);
    return framesList;
  } catch (err) {
    console.error("Failed to get preset frames from Firestore subcollection:", err);
    return [];
  }
}

/**
 * Delete a preset from Firestore and local IndexedDB
 */
export async function deletePresetFromFirebase(presetId: string): Promise<void> {
  // 1. Delete all frame subdocuments from Firestore
  try {
    const subColRef = collection(db, PRESETS_COLLECTION, presetId, FRAMES_SUBCOLLECTION);
    const snap = await getDocs(subColRef);
    await Promise.all(snap.docs.map((docSnap) => deleteDoc(docSnap.ref)));
  } catch (e) {
    console.warn("Firestore delete frame subdocs warning:", e);
  }

  // 2. Delete main preset document from Firestore
  try {
    const docRef = doc(db, PRESETS_COLLECTION, presetId);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn("Firestore delete doc warning:", e);
  }

  // 3. Delete from IndexedDB
  await deletePresetFromIDB(presetId);
}
