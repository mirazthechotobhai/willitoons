import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { idbGet, idbSet, idbDelete } from '../firebase';
import { MediaAsset } from '../types';

const MEDIA_COLLECTION = 'media_assets';
const BACKGROUNDS_COLLECTION = 'backgrounds';
const LOCAL_ASSETS_KEY = 'willitoons_persisted_assets';
const IDB_ALL_MEDIA_KEY = 'willitoons_all_media_assets_v2';

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
    // Sanitize to prevent LocalStorage 5MB QuotaExceededError crashes
    // Strip large Base64 data URLs (> 3000 chars) from localStorage since they are safely kept in IndexedDB
    const sanitized = assets.map(a => ({
      ...a,
      url: a.url && a.url.length > 3000 ? '' : a.url,
      thumbnail: a.thumbnail && a.thumbnail.length > 3000 ? '' : a.thumbnail,
    }));
    localStorage.setItem(LOCAL_ASSETS_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('LocalStorage quota limit reached for media assets:', err);
  }
}

/**
 * Saves all media assets to IndexedDB (virtually unlimited quota for large GIF/image files).
 */
export async function saveMediaAssetsToIndexedDB(assets: MediaAsset[]): Promise<void> {
  try {
    await idbSet(IDB_ALL_MEDIA_KEY, JSON.stringify(assets));
  } catch (err) {
    console.warn('Failed saving media assets list to IndexedDB:', err);
  }
}

/**
 * Loads all media assets from IndexedDB with full high-resolution Base64 & GIF URLs.
 */
export async function loadMediaAssetsFromIndexedDB(): Promise<MediaAsset[]> {
  try {
    const raw = await idbGet(IDB_ALL_MEDIA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed loading media assets list from IndexedDB:', err);
  }
  return [];
}

/**
 * Saves any media asset (Background Image, GIF, Prop, Music, Audio) to IndexedDB, LocalStorage,
 * and Firebase Firestore so it persists permanently across all page reloads and device sessions.
 */
export async function saveMediaAssetToCloud(asset: MediaAsset): Promise<MediaAsset> {
  const targetId = asset.id || `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const preparedAsset: MediaAsset = {
    ...asset,
    id: targetId,
  };

  // 1. If payload URL is large dataUrl or GIF, store safely in IndexedDB
  if (preparedAsset.url) {
    await idbSet(`media_${targetId}`, preparedAsset.url);
  }
  if (preparedAsset.thumbnail) {
    await idbSet(`media_thumb_${targetId}`, preparedAsset.thumbnail);
  }

  // 2. Cache in IndexedDB (full fidelity) and localStorage (sanitized)
  const currentList = await loadMediaAssetsFromIndexedDB();
  const existingIdx = currentList.findIndex(a => a.id === targetId);
  let updatedList: MediaAsset[];
  if (existingIdx >= 0) {
    updatedList = [...currentList];
    updatedList[existingIdx] = preparedAsset;
  } else {
    updatedList = [preparedAsset, ...currentList];
  }
  await saveMediaAssetsToIndexedDB(updatedList);
  saveLocalMediaAssets(updatedList);

  // 3. Synchronize to Firestore media_assets collection with document size safety
  const cloudPayload: Record<string, any> = {
    ...preparedAsset,
  };
  if (cloudPayload.url && cloudPayload.url.length > 50000) {
    // Keep URL safe from 1MB Firestore doc limit
    cloudPayload.url = cloudPayload.thumbnail && cloudPayload.thumbnail.length < 30000 ? cloudPayload.thumbnail : '';
    cloudPayload.hasIndexedDB = true;
  }
  if (cloudPayload.thumbnail && cloudPayload.thumbnail.length > 50000) {
    cloudPayload.thumbnail = '';
  }

  try {
    const docRef = doc(db, MEDIA_COLLECTION, targetId);
    await setDoc(docRef, cloudPayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${MEDIA_COLLECTION}/${targetId}`);
  }

  // If it's an image background (and not a prop/asset library item), mirror to backgrounds collection for compatibility
  if (preparedAsset.type === 'image' && !preparedAsset.isAssetLibrary) {
    try {
      const bgRef = doc(db, BACKGROUNDS_COLLECTION, targetId);
      await setDoc(bgRef, {
        id: targetId,
        name: preparedAsset.name,
        url: cloudPayload.url || preparedAsset.thumbnail || '',
        thumbnail: cloudPayload.thumbnail || '',
        createdAt: Date.now(),
      }, { merge: true });
    } catch {
      // ignore
    }
  }

  return preparedAsset;
}

/**
 * Loads all saved media assets (GIFs, Props, Backgrounds, Audio, Images) from IndexedDB, LocalStorage,
 * and Firebase Firestore. Merges everything to guarantee zero loss on page reload.
 */
export async function loadAllMediaAssetsFromCloud(): Promise<MediaAsset[]> {
  const assetMap = new Map<string, MediaAsset>();

  // 1. Gather all assets from IndexedDB first (contains large Base64 URLs & GIFs)
  try {
    const idbList = await loadMediaAssetsFromIndexedDB();
    idbList.forEach(a => {
      if (a && a.id) {
        assetMap.set(a.id, a);
      }
    });
  } catch {
    // ignore
  }

  // 2. Gather from local storage as supplementary source
  const localList = getLocalMediaAssets();
  localList.forEach(a => {
    if (a && a.id && !assetMap.has(a.id)) {
      assetMap.set(a.id, a);
    }
  });

  // 3. Also import legacy uploaded backgrounds if present
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
    // 4. Fetch from media_assets collection with 8s timeout
    const mediaRef = collection(db, MEDIA_COLLECTION);
    const mediaPromise = getDocs(mediaRef);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore media assets timeout')), 8000)
    );

    const snapshot = await Promise.race([mediaPromise, timeoutPromise]);
    snapshot.forEach(docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data() as MediaAsset & { hasIndexedDB?: boolean };
        if (data.id && data.name) {
          const existing = assetMap.get(data.id);
          if (!existing) {
            assetMap.set(data.id, data);
          } else {
            // Merge cloud metadata while preserving high-resolution local URL/GIF from IndexedDB
            assetMap.set(data.id, {
              ...data,
              url: existing.url || data.url,
              thumbnail: existing.thumbnail || data.thumbnail,
            });
          }
        }
      }
    });

    // 5. Fetch from backgrounds collection as well
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

    // 6. Hydrate any missing URLs from IndexedDB
    const merged = Array.from(assetMap.values());
    const hydrated = await Promise.all(
      merged.map(async (asset) => {
        let url = asset.url;
        if (!url || url.length < 20 || (asset as any).hasIndexedDB) {
          const cached = await idbGet(`media_${asset.id}`);
          if (cached) {
            url = cached;
          }
        }
        let thumb = asset.thumbnail || url;
        if (!thumb || thumb.length < 20) {
          const cachedThumb = await idbGet(`media_thumb_${asset.id}`);
          if (cachedThumb) thumb = cachedThumb;
        }
        return { ...asset, url: url || thumb, thumbnail: thumb || url };
      })
    );

    // Save full list back to IndexedDB and sanitized list to localStorage
    await saveMediaAssetsToIndexedDB(hydrated);
    saveLocalMediaAssets(hydrated);
    return hydrated;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, MEDIA_COLLECTION);
    const fallback = Array.from(assetMap.values());
    const hydratedFallback = await Promise.all(
      fallback.map(async (asset) => {
        let url = asset.url;
        if (!url || url.length < 20 || (asset as any).hasIndexedDB) {
          const cached = await idbGet(`media_${asset.id}`);
          if (cached) {
            url = cached;
          }
        }
        let thumb = asset.thumbnail || url;
        if (!thumb || thumb.length < 20) {
          const cachedThumb = await idbGet(`media_thumb_${asset.id}`);
          if (cachedThumb) thumb = cachedThumb;
        }
        return { ...asset, url: url || thumb, thumbnail: thumb || url };
      })
    );
    await saveMediaAssetsToIndexedDB(hydratedFallback);
    saveLocalMediaAssets(hydratedFallback);
    return hydratedFallback;
  }
}

/**
 * Permanently deletes any media asset from Firestore, IndexedDB, and local cache.
 */
export async function deleteMediaAssetFromCloud(assetId: string): Promise<void> {
  // 1. Remove from local cache & IndexedDB
  const updatedList = getLocalMediaAssets().filter(a => a.id !== assetId);
  saveLocalMediaAssets(updatedList);

  const idbList = await loadMediaAssetsFromIndexedDB();
  const updatedIdbList = idbList.filter(a => a.id !== assetId);
  await saveMediaAssetsToIndexedDB(updatedIdbList);

  // Remove individual keys from IndexedDB
  await idbDelete(`media_${assetId}`);
  await idbDelete(`media_thumb_${assetId}`);

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
