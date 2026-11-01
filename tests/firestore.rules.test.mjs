import { after, before, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let env;
const projectId = 'demo-fitness-kingdom';
const collections = ['members', 'payments', 'expenses', 'trainers', 'attendance', 'counters', 'users'];
before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { host: '127.0.0.1', port: 8081, rules: readFileSync('firestore.rules', 'utf8') },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const name of collections) {
      await setDoc(doc(db, name, 'fixture'), { label: 'Synthetic test record' });
    }
    await setDoc(doc(db, 'users', 'ordinary'), { role: 'OWNER' });
  });
});
after(async () => { await env?.cleanup(); });

test('anonymous callers cannot read or mutate any operational collection', async () => {
  const db = env.unauthenticatedContext().firestore();
  for (const name of collections) {
    await assertFails(getDoc(doc(db, name, 'fixture')));
    await assertFails(getDocs(collection(db, name)));
    await assertFails(setDoc(doc(db, name, 'anonymous'), { label: 'Denied' }));
    await assertFails(updateDoc(doc(db, name, 'fixture'), { label: 'Denied' }));
    await assertFails(deleteDoc(doc(db, name, 'fixture')));
  }
});
test('an authenticated account or stored OWNER profile cannot grant ownership', async () => {
  const db = env.authenticatedContext('ordinary', { email: 'owner@example.test' }).firestore();
  await assertFails(getDoc(doc(db, 'members', 'fixture')));
  await assertFails(setDoc(doc(db, 'users', 'ordinary'), { role: 'OWNER' }));
  await assertFails(setDoc(doc(db, 'payments', 'forged'), { amount: 100 }));
});
test('owner claim must be the boolean true, not a truthy string or false', async () => {
  for (const claim of ['true', false]) {
    const db = env.authenticatedContext('not-owner', { owner: claim }).firestore();
    await assertFails(getDoc(doc(db, 'members', 'fixture')));
    await assertFails(deleteDoc(doc(db, 'expenses', 'fixture')));
  }
});
test('a trusted owner can manage operational records', async () => {
  const db = env.authenticatedContext('owner', { owner: true }).firestore();
  for (const name of collections) {
    const ref = doc(db, name, 'owner-test');
    await assertSucceeds(getDoc(doc(db, name, 'fixture')));
    await assertSucceeds(getDocs(collection(db, name)));
    await assertSucceeds(setDoc(ref, { label: 'Synthetic owner record' }));
    await assertSucceeds(updateDoc(ref, { label: 'Updated' }));
    await assertSucceeds(deleteDoc(ref));
  }
});
