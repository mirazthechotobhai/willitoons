import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

// Use the project's provisioned Firebase configuration from firebase-applet-config.json
export const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  projectId: firebaseAppletConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId,
  measurementId: firebaseAppletConfig.measurementId || undefined,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with force long-polling to prevent WebSocket connection failures in iframe sandboxes
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseAppletConfig.firestoreDatabaseId || undefined
);
export const auth = getAuth(app);

// Validate Connection to Firestore on startup
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.info('Firestore backend connection confirmed.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is operating in offline mode. Local cache active.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

// Initialize Firebase Analytics if supported
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
    isSupported().then(supported => {
      if (supported) {
        getAnalytics(app);
      }
    }).catch(() => {});
  }).catch(() => {});
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const isPermissionError =
    error instanceof Error &&
    (error.message.includes('permission-denied') || error.message.includes('Missing or insufficient permissions'));

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  if (isPermissionError) {
    console.error('Firestore Permission Error:', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  } else {
    // Graceful logging for offline/transient network events
    console.info(`Firestore (${operationType} at ${path}):`, errInfo.error);
  }
}

export default app;
