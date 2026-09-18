import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { MediaAsset } from '../types';

const MEDIA_COLLECTION = 'media_assets';
const BACKGROUNDS_COLLECTION = 'backgrounds';
const LOCAL_ASSETS_KEY = 'willitoons_persisted_assets';

export function getLocalMediaAssets(): MediaAsset[] {
  try {
    const raw = localStorage.getItem(LOCAL_ASSETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalMediaAssets(assets: MediaAsset[]): void {
  try {
    localStorage.setItem(LOCAL_ASSETS_KEY, JSON.stringify(assets));
  } catch (err) {
    console.warn('LocalStorage quota limit reached for media assets:', err);
  }
}

/**
 * Saves any media asset (Background Image, Music, Audio, Video) to Firebase Firestore
 * and local cache so it persists forever across all sessions and website visits.
 */
export async function saveMediaAssetToCloud(asset: MediaAsset): Promise<MediaAsset> {
  const targetId = asset.id || `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const preparedAsset: MediaAsset = {
    ...asset,
    id: targetId,
  };

  // 1. Immediately cache locally for zero-latency load & offline resilience
  const localList = getLocalMediaAssets();
  const existingIdx = localList.findIndex(a => a.id === targetId);
  if (existingIdx >= 0) {
    localList[existingIdx] = preparedAsset;
  } else {
    localList.unshift(preparedAsset);
  }
  saveLocalMediaAssets(localList);

  // 2. Synchronize to Firestore media_assets collection
  try {
    const docRef = doc(db, MEDIA_COLLECTION, targetId);
    await setDoc(docRef, preparedAsset, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${MEDIA_COLLECTION}/${targetId}`);
  }

  // If it's an image background, also mirror to backgrounds collection for compatibility
  if (preparedAsset.type === 'image') {
    try {
      const bgRef = doc(db, BACKGROUNDS_COLLECTION, targetId);
      await setDoc(bgRef, {
        id: targetId,
        name: preparedAsset.name,
        url: preparedAsset.url,
        thumbnail: preparedAsset.thumbnail || preparedAsset.url,
        createdAt: Date.now(),
      }, { merge: true });
    } catch {
      // ignore
    }
  }

  return preparedAsset;
}

/**
 * Loads all saved media assets (Backgrounds, Music, Audio, Images) from Firebase Firestore.
 * Merges with local cache to guarantee everything is available immediately when visiting the website.
 */
export async function loadAllMediaAssetsFromCloud(): Promise<MediaAsset[]> {
  const localList = getLocalMediaAssets();
  const assetMap = new Map<string, MediaAsset>();

  // Add local assets first
  localList.forEach(a => assetMap.set(a.id, a));

  // Also import legacy uploaded backgrounds if present
  try {
    const rawBgs = localStorage.getItem('willitoons_uploaded_backgrounds');
    if (rawBgs) {
      const bgs = JSON.parse(rawBgs);
      if (Array.isArray(bgs)) {
        bgs.forEach(b => {
          if (b.id && b.url && !assetMap.has(b.id)) {
            assetMap.set(b.id, {
              id: b.id,
              name: b.name || 'Uploaded Background',
              type: 'image',
              url: b.url,
              thumbnail: b.thumbnail || b.url,
              category: 'Uploaded Background',
            });
          }
        });
      }
    }
  } catch {
    // ignore
  }

  try {
    // 1. Fetch from media_assets collection with 4s timeout
    const mediaRef = collection(db, MEDIA_COLLECTION);
    const mediaPromise = getDocs(mediaRef);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore media assets timeout')), 4000)
    );

    const snapshot = await Promise.race([mediaPromise, timeoutPromise]);
    snapshot.forEach(docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data() as MediaAsset;
        if (data.id && data.url && data.name) {
          assetMap.set(data.id, data);
        }
      }
    });

    // 2. Fetch from backgrounds collection as well
    try {
      const bgRef = collection(db, BACKGROUNDS_COLLECTION);
      const bgSnapshot = await getDocs(bgRef);
      bgSnapshot.forEach(docSnap => {
        if (docSnap.exists()) {
          const bgData = docSnap.data() as { id: string; name: string; url: string; thumbnail?: string };
          if (bgData.id && bgData.url && !assetMap.has(bgData.id)) {
            assetMap.set(bgData.id, {
              id: bgData.id,
              name: bgData.name || 'Uploaded Background',
              type: 'image',
              url: bgData.url,
              thumbnail: bgData.thumbnail || bgData.url,
              category: 'Uploaded Background',
            });
          }
        }
      });
    } catch {
      // ignore
    }

    const merged = Array.from(assetMap.values());
    saveLocalMediaAssets(merged);
    return merged;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, MEDIA_COLLECTION);
    return Array.from(assetMap.values());
  }
}

/**
 * Permanently deletes any media asset from Firestore and local cache.
 */
export async function deleteMediaAssetFromCloud(assetId: string): Promise<void> {
  // 1. Remove from local cache
  const updatedList = getLocalMediaAssets().filter(a => a.id !== assetId);
  saveLocalMediaAssets(updatedList);

  // Also remove from local backgrounds cache if present
  try {
    const rawBgs = localStorage.getItem('willitoons_uploaded_backgrounds');
    if (rawBgs) {
      const bgs = JSON.parse(rawBgs);
      if (Array.isArray(bgs)) {
        localStorage.setItem(
          'willitoons_uploaded_backgrounds',
          JSON.stringify(bgs.filter((b: { id: string }) => b.id !== assetId))
        );
      }
    }
  } catch {
    // ignore
  }

  // 2. Delete from Firestore media_assets
  try {
    const docRef = doc(db, MEDIA_COLLECTION, assetId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${MEDIA_COLLECTION}/${assetId}`);
  }

  // Also delete from backgrounds collection if present
  try {
    const bgDocRef = doc(db, BACKGROUNDS_COLLECTION, assetId);
    await deleteDoc(bgDocRef);
  } catch {
    // ignore
  }
}

/**
 * Converts a file (e.g. audio, music, image) to a persistent base64 data URL
 * so it never expires like temporary blob URLs.
 */
export function fileToPermanentDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
