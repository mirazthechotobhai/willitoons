import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { BackgroundAsset, MediaAsset } from '../types';

const BACKGROUNDS_COLLECTION = 'backgrounds';
const LOCAL_BACKGROUNDS_KEY = 'willitoons_uploaded_backgrounds';

export function getLocalBackgrounds(): BackgroundAsset[] {
  try {
    const raw = localStorage.getItem(LOCAL_BACKGROUNDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalBackgrounds(bgs: BackgroundAsset[]) {
  try {
    localStorage.setItem(LOCAL_BACKGROUNDS_KEY, JSON.stringify(bgs));
  } catch (err) {
    console.warn('LocalStorage quota limit reached for background assets:', err);
  }
}

/**
 * Converts a BackgroundAsset to a MediaAsset for compatibility with stage and media drawer
 */
export function backgroundToMediaAsset(bg: BackgroundAsset): MediaAsset {
  return {
    id: bg.id,
    name: bg.name,
    type: 'image',
    url: bg.url,
    thumbnail: bg.thumbnail || bg.url,
    width: bg.width,
    height: bg.height,
    category: 'Uploaded Background',
  };
}

/**
 * Saves an uploaded background asset to Firebase Firestore and local cache.
 * Guarantees permanent persistence until explicitly deleted.
 */
export async function saveBackgroundToCloud(
  bg: BackgroundAsset
): Promise<BackgroundAsset> {
  const targetId = bg.id || `bg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = Date.now();

  const assetToSave: BackgroundAsset = {
    ...bg,
    id: targetId,
    createdAt: bg.createdAt || now,
    updatedAt: now,
  };

  // 1. Immediately cache locally for instant UI update and offline guarantee
  const localList = getLocalBackgrounds();
  const existingIdx = localList.findIndex(b => b.id === targetId);
  if (existingIdx >= 0) {
    localList[existingIdx] = assetToSave;
  } else {
    localList.unshift(assetToSave);
  }
  saveLocalBackgrounds(localList);

  // 2. Synchronize to Firestore collection
  try {
    const docRef = doc(db, BACKGROUNDS_COLLECTION, targetId);
    await setDoc(docRef, assetToSave, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${BACKGROUNDS_COLLECTION}/${targetId}`);
  }

  return assetToSave;
}

/**
 * Loads all saved uploaded backgrounds from Firebase Firestore.
 * Automatically falls back to local storage cache if offline or on timeout.
 */
export async function loadBackgroundsFromCloud(): Promise<BackgroundAsset[]> {
  const localList = getLocalBackgrounds();

  try {
    const bgsRef = collection(db, BACKGROUNDS_COLLECTION);
    
    // 8-second race timeout prevents stalling if connection is slow
    const fetchPromise = getDocs(bgsRef);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore fetch timeout')), 8000)
    );

    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
    const cloudList: BackgroundAsset[] = [];

    snapshot.forEach(docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data() as BackgroundAsset;
        if (data.id && data.url && data.name) {
          cloudList.push(data);
        }
      }
    });

    if (cloudList.length > 0) {
      // Merge cloud list with local list (cloud takes precedence for matching IDs)
      const map = new Map<string, BackgroundAsset>();
      localList.forEach(b => map.set(b.id, b));
      cloudList.forEach(b => map.set(b.id, b));
      // Sort newest first
      const merged = Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      saveLocalBackgrounds(merged);
      return merged;
    }

    return localList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, BACKGROUNDS_COLLECTION);
    return localList;
  }
}

/**
 * Permanently deletes an uploaded background asset from Firestore and local cache.
 */
export async function deleteBackgroundFromCloud(bgId: string): Promise<void> {
  // 1. Remove from local cache immediately
  const localList = getLocalBackgrounds().filter(b => b.id !== bgId);
  saveLocalBackgrounds(localList);

  // 2. Remove from Firestore
  try {
    const docRef = doc(db, BACKGROUNDS_COLLECTION, bgId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${BACKGROUNDS_COLLECTION}/${bgId}`);
  }
}
