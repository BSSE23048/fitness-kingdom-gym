import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

const DEFAULT_PLANS = [
  {
    id: 'plan-1m-standard',
    planName: '1 Month Standard',
    durationMonths: 1,
    defaultPrice: 8000,
    isActive: true,
    description: 'Regular monthly gym membership'
  },
  {
    id: 'plan-3m-advance',
    planName: '3 Months Advance Deal',
    durationMonths: 3,
    defaultPrice: 20000,
    isActive: true,
    description: 'Advance 3-month package (Saves Rs. 4,000)'
  }
];

const DEFAULT_GENERAL_SETTINGS = {
  defaultAdmissionFee: 2000,
  gymName: 'Fitness Kingdom Gym',
  currency: 'PKR'
};

let cachedPlans = [...DEFAULT_PLANS];
let cachedSettings = { ...DEFAULT_GENERAL_SETTINGS };

/**
 * Fetch all membership plans. Auto-seeds defaults if Firestore collection is empty.
 */
export const fetchPlans = async () => {
  try {
    const colRef = collection(db, 'membership_plans');
    const snapshot = await getDocs(colRef);

    if (!snapshot.empty) {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      cachedPlans = docs;
      return docs;
    } else {
      // Auto-seed default plans if empty
      for (const p of DEFAULT_PLANS) {
        await setDoc(doc(db, 'membership_plans', p.id), p);
      }
      cachedPlans = DEFAULT_PLANS;
      return DEFAULT_PLANS;
    }
  } catch (err) {
    console.warn('Firestore fetchPlans failed (using seeded defaults):', err);
    return cachedPlans;
  }
};

/**
 * Fetch active plans only (for dropdowns)
 */
export const fetchActivePlans = async () => {
  const plans = await fetchPlans();
  return plans.filter(p => p.isActive);
};

/**
 * Add a new membership plan
 */
export const addPlan = async (planPayload) => {
  const planId = 'plan-' + Math.floor(1000 + Math.random() * 9000);
  const record = {
    id: planId,
    planName: planPayload.planName,
    durationMonths: Number(planPayload.durationMonths) || 1,
    defaultPrice: Number(planPayload.defaultPrice) || 8000,
    isActive: planPayload.isActive ?? true,
    description: planPayload.description || '',
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'membership_plans', planId), record);
  } catch (err) {
    console.warn('Firestore addPlan failed:', err);
  }

  cachedPlans.unshift(record);
  return record;
};

/**
 * Update an existing membership plan
 */
export const updatePlan = async (planId, updates) => {
  try {
    await updateDoc(doc(db, 'membership_plans', planId), updates);
  } catch (err) {
    console.warn('Firestore updatePlan failed:', err);
  }

  const idx = cachedPlans.findIndex(p => p.id === planId);
  if (idx !== -1) {
    cachedPlans[idx] = { ...cachedPlans[idx], ...updates };
  }
};

/**
 * Delete Membership Plan (Protected by Owner PIN 1234)
 */
export const deletePlan = async (planId) => {
  try {
    const docRef = doc(db, 'membership_plans', planId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deletePlan failed:', err);
  }
  cachedPlans = cachedPlans.filter(p => p.id !== planId);
};

/**
 * Fetch general gym settings (Admission Fee, etc.)
 */
export const fetchGeneralSettings = async () => {
  try {
    const docRef = doc(db, 'settings', 'general');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      cachedSettings = snap.data();
      return snap.data();
    } else {
      await setDoc(docRef, DEFAULT_GENERAL_SETTINGS);
      cachedSettings = DEFAULT_GENERAL_SETTINGS;
      return DEFAULT_GENERAL_SETTINGS;
    }
  } catch (err) {
    console.warn('Firestore fetchGeneralSettings failed:', err);
    return cachedSettings;
  }
};

/**
 * Update general gym settings
 */
export const updateGeneralSettings = async (updates) => {
  try {
    const docRef = doc(db, 'settings', 'general');
    await setDoc(docRef, updates, { merge: true });
  } catch (err) {
    console.warn('Firestore updateGeneralSettings failed:', err);
  }
  cachedSettings = { ...cachedSettings, ...updates };
  return cachedSettings;
};
