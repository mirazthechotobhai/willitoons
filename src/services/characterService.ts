import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CharacterModel } from '../types';

const CHARACTERS_COLLECTION = 'characters';

/**
 * Saves a character model to Firebase Firestore.
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

  try {
    const docRef = doc(db, CHARACTERS_COLLECTION, targetId);
    await setDoc(docRef, characterToSave, { merge: true });
    return characterToSave;
  } catch (error) {
    console.error('Error saving character to Firestore:', error);
    throw error;
  }
}

/**
 * Loads all saved custom characters from Firebase Firestore.
 */
export async function loadCharactersFromCloud(): Promise<CharacterModel[]> {
  try {
    const charactersRef = collection(db, CHARACTERS_COLLECTION);
    const snapshot = await getDocs(charactersRef);
    const list: CharacterModel[] = [];

    snapshot.forEach(docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data() as CharacterModel;
        if (data.id && data.name && data.joints && data.appearance) {
          list.push(data);
        }
      }
    });

    return list;
  } catch (error) {
    console.warn('Could not load characters from Firestore (operating with local state):', error);
    return [];
  }
}

/**
 * Deletes a custom character from Firebase Firestore.
 */
export async function deleteCharacterFromCloud(characterId: string): Promise<void> {
  try {
    const docRef = doc(db, CHARACTERS_COLLECTION, characterId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting character from Firestore:', error);
    throw error;
  }
}
