import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
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
    localStorage.setItem(LOCAL_CHARACTERS_KEY, JSON.stringify(chars));
  } catch {
    // Ignore storage quota limits gracefully
  }
}

/**
 * Saves a character model to Firebase Firestore with local fallback.
 * If `isSaveAsNew` is true, generates a fresh unique ID.
 * Returns the saved CharacterModel.
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

  // 1. Immediately persist to local storage cache so user never loses their changes
  const localList = getLocalCharacters();
  const existingIndex = localList.findIndex(c => c.id === targetId);
  if (existingIndex >= 0) {
    localList[existingIndex] = characterToSave;
  } else {
    localList.unshift(characterToSave);
  }
  saveLocalCharacters(localList);

  // 2. Synchronize to Firestore cloud
  try {
    const docRef = doc(db, CHARACTERS_COLLECTION, targetId);
    await setDoc(docRef, characterToSave, { merge: true });
  } catch (error) {
    console.warn('Saved to local storage; Firestore will sync when online:', error);
  }

  return characterToSave;
}

/**
 * Loads all saved custom characters from Firebase Firestore.
 * Automatically falls back to local storage cache if network is unavailable or offline.
 */
export async function loadCharactersFromCloud(): Promise<CharacterModel[]> {
  const localCharacters = getLocalCharacters();

  try {
    const charactersRef = collection(db, CHARACTERS_COLLECTION);
    
    // Set a 4-second timeout race to prevent UI delay if Firestore is in offline mode
    const fetchPromise = getDocs(charactersRef);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore fetch timeout')), 4000)
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

    if (cloudList.length > 0) {
      // Merge cloud characters with local characters (cloud taking precedence for matching IDs)
      const mergedMap = new Map<string, CharacterModel>();
      localCharacters.forEach(c => mergedMap.set(c.id, c));
      cloudList.forEach(c => mergedMap.set(c.id, c));
      const mergedList = Array.from(mergedMap.values());
      saveLocalCharacters(mergedList);
      return mergedList;
    }

    return localCharacters;
  } catch (error) {
    // Network offline, timeout, or unavailable: smoothly return local cache
    return localCharacters;
  }
}

/**
 * Deletes a custom character from Firebase Firestore and local storage.
 */
export async function deleteCharacterFromCloud(characterId: string): Promise<void> {
  // Remove from local cache immediately
  const localList = getLocalCharacters().filter(c => c.id !== characterId);
  saveLocalCharacters(localList);

  try {
    const docRef = doc(db, CHARACTERS_COLLECTION, characterId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('Deleted from local storage; Firestore sync pending:', error);
  }
}
