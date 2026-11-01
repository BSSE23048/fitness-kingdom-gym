import { demoConfig } from './demoRuntime';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator } from 'firebase/auth';
import { 
  connectFirestoreEmulator,
  memoryLocalCache,
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore 
} from 'firebase/firestore';

// Authentic Firebase configuration for Fitness Kingdom Gym
const localDemoConfig = demoConfig(import.meta.env.MODE, window.location.hostname);
export const isDemo = Boolean(localDemoConfig);
const firebaseConfig = localDemoConfig || {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC5ODFUBtqIKJl5YfQzhAYRCCQbwI-rg0Y",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "fitness-kingdom-gym.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "fitness-kingdom-gym",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "fitness-kingdom-gym.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "992056064087",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:992056064087:web:50c59e38c07ca25bb00b12"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
if (isDemo) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

// Explicitly configure local persistence for instant session retrieval from disk
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase Auth setPersistence error:', err);
});

// Configure Firestore with IndexedDB Multi-Tab Persistent Cache for Offline Resilience
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: isDemo ? memoryLocalCache() : persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (err) {
  console.warn('Firestore persistent cache initialization fallback:', err);
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
if (isDemo) connectFirestoreEmulator(db, '127.0.0.1', 8081);

export default app;


