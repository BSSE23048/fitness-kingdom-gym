import assert from 'node:assert/strict';
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, getDocs, terminate } from 'firebase/firestore';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8081' ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') throw new Error('Local emulators required');
const app = initializeApp({ projectId: 'demo-fitness-kingdom', apiKey: 'demo-only-key' });
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8081);
try {
  await signInWithEmailAndPassword(auth, 'owner@gym.test', 'DemoGym123!');
  assert.equal((await getDocs(collection(db, 'members'))).size, 3);
  await signOut(auth);
  await signInWithEmailAndPassword(auth, 'viewer@gym.test', 'DemoGym123!');
  await assert.rejects(getDocs(collection(db, 'members')), error => error.code === 'permission-denied');
  await signOut(auth);
  await assert.rejects(getDocs(collection(db, 'members')), error => error.code === 'permission-denied');
  console.log('Synthetic owner read, non-owner denial and signed-out denial passed.');
} finally {
  await signOut(auth);
  await terminate(db);
}
