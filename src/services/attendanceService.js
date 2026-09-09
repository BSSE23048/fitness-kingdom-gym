import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

let cachedSheets = {};

/**
 * Fetch daily attendance sheet for a specific date (YYYY-MM-DD)
 */
export const fetchDailyAttendanceSheet = async (dateStr) => {
  try {
    const docRef = doc(db, 'attendance', dateStr);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      cachedSheets[dateStr] = snap.data();
      return snap.data();
    }
  } catch (err) {
    console.warn('Firestore fetchDailyAttendanceSheet failed:', err);
  }

  return cachedSheets[dateStr] || { date: dateStr, records: {}, lastSavedAt: null };
};

/**
 * Batch save daily attendance sheet to Firestore document attendance/{dateStr}
 */
export const saveDailyAttendanceSheet = async (dateStr, recordsMap, savedBy = 'Reception') => {
  const payload = {
    date: dateStr,
    records: recordsMap, // Map of { memberId: 'Present' | 'Absent' }
    lastSavedAt: new Date().toISOString(),
    savedBy
  };

  try {
    const docRef = doc(db, 'attendance', dateStr);
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.warn('Firestore saveDailyAttendanceSheet failed:', err);
  }

  cachedSheets[dateStr] = payload;
  return payload;
};
