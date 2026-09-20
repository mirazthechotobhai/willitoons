import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { idbGet, idbSet, idbDelete } from '../firebase';
import { uploadBase64ToImgBB } from './imgbbService';
import { CharacterModel } from '../types';

const CHARACTERS_COLLECTION = 'characters';
const LOCAL_CHARACTERS_KEY = 'willitoons_custom_characters';

function getLocalCharacters(): CharacterModel[] {
  try {
    const raw = localStorage.getItem(LOCAL_CHARACTERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCharacters(chars: CharacterModel[]) {
  try {
    // Avoid saving massive multi-megabyte base64 strings in localStorage to prevent quota crashes
    const safeChars = chars.map((c) => {
      if (c.isSpriteSheet && c.spriteSheet && c.spriteSheet.imageUrl && c.spriteSheet.imageUrl.length > 80000) {
        return {
          ...c,
          spriteSheet: {
            ...c.spriteSheet,
            imageUrl: '', // Full image is preserved safely in IndexedDB
          },
        };
      }
      return c;
    });
    localStorage.setItem(LOCAL_CHARACTERS_KEY, JSON.stringify(safeChars));
  } catch {
    // Ignore storage quota limits gracefully
  }
}

/**
 * Saves a character model to Firebase Firestore with local fallback.
 * If `isSaveAsNew` is true, generates a fresh unique ID.
 * Automatically keeps Firestore documents ultra-lightweight (< 50KB) by preserving
 * full-resolution sprite sheet images in IndexedDB.
 */
export async function saveCharacterToCloud(
  character: CharacterModel,
  isSaveAsNew: boolean = false
): Promise<CharacterModel> {
  const targetId = isSaveAsNew
    ? `custom-char-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    : character.id;

  const characterToSave: CharacterModel & { updatedAt: number; createdAt?: number } = {
    ...character,
    id: targetId,
    name: isSaveAsNew && !character.name.includes('(Copy)') && !character.name.includes('New')
      ? `${character.name} (Custom)`
      : character.name,
    isCustom: true,
    updatedAt: Date.now(),
    createdAt: (character as any).createdAt || Date.now(),
  };

  // 1. If this is a sprite sheet character with a full image, store the high-res image safely in IndexedDB
  if (characterToSave.isSpriteSheet && characterToSave.spriteSheet?.imageUrl) {
    await idbSet(`char_sprite_${targetId}`, characterToSave.spriteSheet.imageUrl);
  }

  // 2. Immediately persist to local storage cache so user never loses their changes
  const localList = getLocalCharacters();
  const existingIndex = localList.findIndex(c => c.id === targetId);
  if (existingIndex >= 0) {
    localList[existingIndex] = characterToSave;
  } else {
    localList.unshift(characterToSave);
  }
  saveLocalCharacters(localList);

  // 3. Prepare Firestore document payload, ensuring sprite sheet has a permanent cross-device URL
  const cloudPayload: Record<string, any> = {
    ...characterToSave,
  };

  if (cloudPayload.isSpriteSheet && cloudPayload.spriteSheet) {
    let spriteUrl = cloudPayload.spriteSheet.imageUrl || '';
    if (spriteUrl && !spriteUrl.startsWith('http')) {
      try {
        const uploadRes = await uploadBase64ToImgBB(spriteUrl, characterToSave.name);
        if (uploadRes.success && uploadRes.url.startsWith('http')) {
          spriteUrl = uploadRes.url;
          characterToSave.spriteSheet.imageUrl = uploadRes.url;
          if (!characterToSave.thumbnail && uploadRes.thumbnailUrl) {
            characterToSave.thumbnail = uploadRes.thumbnailUrl;
          }
        }
      } catch (err) {
        console.warn('ImgBB upload for character sprite failed:', err);
      }
    }

    const safeUrl = spriteUrl.startsWith('http')
      ? spriteUrl
      : (spriteUrl.length < 650000 ? spriteUrl : '');

    cloudPayload.spriteSheet = {
      ...cloudPayload.spriteSheet,
      imageUrl: safeUrl,
      hasIndexedDBAsset: true,
    };
  }

  // Truncate gigantic thumbnail strings if they exceed 50KB
  if (cloudPayload.thumbnail && cloudPayload.thumbnail.length > 50000) {
    cloudPayload.thumbnail = '';
  }

  // 4. Synchronize to Firestore cloud
  try {
    const docRef = doc(db, CHARACTERS_COLLECTION, targetId);
    await setDoc(docRef, cloudPayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CHARACTERS_COLLECTION}/${targetId}`);
  }

  return characterToSave;
}

/**
 * Loads all saved custom characters from Firebase Firestore.
 * Automatically falls back to local storage cache if network is unavailable or offline.
 * Hydrates full-resolution sprite sheet images from IndexedDB.
 */
export async function loadCharactersFromCloud(): Promise<CharacterModel[]> {
  const localCharacters = getLocalCharacters();

  try {
    const charactersRef = collection(db, CHARACTERS_COLLECTION);
    
    // Set an 8-second timeout race to prevent UI freeze while allowing initial connection
    const fetchPromise = getDocs(charactersRef);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore fetch timeout')), 8000)
    );

    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
    const cloudList: CharacterModel[] = [];

    snapshot.forEach(docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data() as CharacterModel;
        if (data.id && data.name && data.joints && data.appearance) {
          cloudList.push(data);
        }
      }
    });

    // Merge cloud characters with local characters (cloud taking precedence for matching IDs)
    const mergedMap = new Map<string, CharacterModel>();
    localCharacters.forEach(c => mergedMap.set(c.id, c));
    cloudList.forEach(c => mergedMap.set(c.id, c));
    const mergedList = Array.from(mergedMap.values());

    // Hydrate any sprite sheet characters whose image was offloaded to IndexedDB
    const hydratedList = await Promise.all(
      mergedList.map(async (char) => {
        if (char.isSpriteSheet && char.spriteSheet) {
          if (!char.spriteSheet.imageUrl) {
            const cached = await idbGet(`char_sprite_${char.id}`);
            if (cached) {
              return {
                ...char,
                thumbnail: char.thumbnail || cached,
                spriteSheet: {
                  ...char.spriteSheet,
                  imageUrl: cached,
                },
              };
            }
          }
        }
        return char;
      })
    );

    saveLocalCharacters(hydratedList);
    return hydratedList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CHARACTERS_COLLECTION);
    
    // Still hydrate local characters
    const hydratedLocal = await Promise.all(
      localCharacters.map(async (char) => {
        if (char.isSpriteSheet && char.spriteSheet && !char.spriteSheet.imageUrl) {
          const cached = await idbGet(`char_sprite_${char.id}`);
          if (cached) {
            return {
              ...char,
              thumbnail: char.thumbnail || cached,
              spriteSheet: {
                ...char.spriteSheet,
                imageUrl: cached,
              },
            };
          }
        }
        return char;
      })
    );
    return hydratedLocal;
  }
}

/**
 * Deletes a custom character from Firebase Firestore and local storage.
 */
export async function deleteCharacterFromCloud(characterId: string): Promise<void> {
  // Remove from local cache immediately
  const localList = getLocalCharacters().filter(c => c.id !== characterId);
  saveLocalCharacters(localList);

  // Remove from IndexedDB
  await idbDelete(`char_sprite_${characterId}`);

  try {
    const docRef = doc(db, CHARACTERS_COLLECTION, characterId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${CHARACTERS_COLLECTION}/${characterId}`);
  }
}
