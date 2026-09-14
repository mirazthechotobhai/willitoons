import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Use configured database ID if provided, otherwise default
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || undefined
);

// Test server connectivity on startup (non-blocking)
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is running in offline cache mode.');
    }
  }
}

testFirestoreConnection();

export default app;
