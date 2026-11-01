import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Refuse to initialize the Admin SDK unless both services are explicitly local.
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8081' ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') {
  throw new Error('Start the demo Auth and Firestore emulators using npm run demo first.');
}
initializeApp({ projectId: 'demo-fitness-kingdom' });
const auth = getAuth();
const db = getFirestore();
for (const [uid, email, owner] of [
  ['demo-owner', 'owner@gym.test', true],
  ['demo-viewer', 'viewer@gym.test', false],
]) {
  try { await auth.getUser(uid); }
  catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    await auth.createUser({ uid, email, password: 'DemoGym123!', displayName: owner ? 'Demo Owner' : 'Demo Viewer' });
  }
  await auth.setCustomUserClaims(uid, { owner });
}
await db.doc('users/demo-owner').set({ displayName: 'Demo Owner' });
await db.doc('settings/general').set({ gymName: 'Fitness Kingdom Synthetic Demo', currency: 'PKR', defaultAdmissionFee: 2000 });
await db.doc('membership_plans/plan-1m-standard').set({
  id: 'plan-1m-standard', planName: '1 Month Standard', durationMonths: 1, defaultPrice: 8000, isActive: true,
});
const today = new Date();
const date = offset => new Date(today.getTime() + offset * 86400000).toISOString().slice(0, 10);
for (let i = 1; i <= 3; i++) {
  const id = 'FK-' + String(i).padStart(3, '0');
  await db.doc('members/' + id).set({
    id, fullName: 'Demo Member ' + String(i).padStart(2, '0'), phone: '',
    emergencyContact: '', cnicOrId: '', gender: 'Male', dob: '',
    planId: 'plan-1m-standard', membershipType: '1 Month Standard', durationMonths: 1,
    startDate: date(-5), endDate: date(25), status: 'Active', isFrozen: false,
    baseFee: 8000, discount: 0, netMembershipFee: 8000, admissionFee: 2000,
    admissionFeeWaived: false, createdAt: today.toISOString(),
  });
}
await db.doc('counters/members').set({ lastMemberNumber: 3 });
console.log('Synthetic demo ready. Owner: owner@gym.test / DemoGym123! (local emulators only)');
