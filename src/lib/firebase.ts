import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Configure Firestore with forced long-polling for rock-solid connection in web iframe sandbox environments
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
    },
    firebaseConfig.firestoreDatabaseId || undefined
  );
} catch {
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
}

export const db = firestoreInstance;

// Non-blocking, graceful connection check with delay to allow SDK initialization
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('offline') || msg.includes('unavailable') || msg.includes('could not be completed')) {
      console.info('Firestore operating with offline persistence until cloud sync connects.');
    } else {
      console.warn('Firestore connectivity status:', msg);
    }
  }
}

if (typeof window !== 'undefined') {
  // Run safely in background after page load so it never blocks UI or throws on initial render
  setTimeout(() => {
    testFirestoreConnection();
  }, 2000);
}

export default app;
