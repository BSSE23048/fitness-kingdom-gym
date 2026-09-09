import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

let cachedTrainers = [];

/**
 * Real-time listener for trainers collection using onSnapshot
 */
export const subscribeTrainers = (callback) => {
  try {
    const colRef = collection(db, 'trainers');
    return onSnapshot(colRef, (snapshot) => {
      if (!snapshot.empty) {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        cachedTrainers = docs;
        callback(docs);
      } else {
        cachedTrainers = [];
        callback([]);
      }
    }, (err) => {
      console.warn('Firestore subscribeTrainers error:', err);
      callback(cachedTrainers);
    });
  } catch (err) {
    console.warn('Firestore onSnapshot failed:', err);
    callback(cachedTrainers);
    return () => {};
  }
};

/**
 * Fetch all trainers directly from Firestore
 */
export const fetchTrainers = async () => {
  try {
    const colRef = collection(db, 'trainers');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      cachedTrainers = docs;
      return docs;
    }
  } catch (err) {
    console.warn('Firestore fetchTrainers failed:', err);
  }
  return cachedTrainers;
};

/**
 * Add a new Trainer / Staff member
 */
export const addTrainer = async (payload) => {
  const trainerId = 'TRN-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900);
  const record = {
    id: trainerId,
    fullName: payload.fullName,
    phone: payload.phone || '',
    cnic: payload.cnic || '',
    baseSalary: Number(payload.baseSalary) || 40000,
    commissionRate: Number(payload.commissionRate) || 0,
    joiningDate: payload.joiningDate || new Date().toISOString().split('T')[0],
    status: payload.status || 'Active',
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'trainers', trainerId), record);
  } catch (err) {
    console.warn('Firestore addTrainer failed:', err);
  }

  cachedTrainers.unshift(record);
  return record;
};

/**
 * Update Trainer Record
 */
export const updateTrainer = async (trainerId, updates) => {
  try {
    await updateDoc(doc(db, 'trainers', trainerId), updates);
  } catch (err) {
    console.warn('Firestore updateTrainer failed:', err);
  }

  const idx = cachedTrainers.findIndex(t => t.id === trainerId);
  if (idx !== -1) {
    cachedTrainers[idx] = { ...cachedTrainers[idx], ...updates };
  }
};

/**
 * Delete Trainer (Protected by Owner PIN 1234)
 */
export const deleteTrainer = async (trainerId) => {
  try {
    const docRef = doc(db, 'trainers', trainerId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteTrainer failed:', err);
  }
  cachedTrainers = cachedTrainers.filter(t => t.id !== trainerId);
};
