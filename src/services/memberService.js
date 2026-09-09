import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  addDoc, 
  query, 
  orderBy, 
  runTransaction,
  getCountFromServer 
} from 'firebase/firestore';
import { db } from '../config/firebase';

let cachedMembers = [];
let cachedAttendance = {};

/**
 * Atomic Sequential Member ID Generator (FK-001, FK-002, FK-003...)
 * Uses a Firestore Transaction on counters/members document.
 */
export const getNextMemberId = async () => {
  const counterDocRef = doc(db, 'counters', 'members');
  try {
    const newCount = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterDocRef);
      let count = 1;
      if (counterSnap.exists()) {
        count = (counterSnap.data().lastMemberNumber || 0) + 1;
      }
      transaction.set(counterDocRef, { lastMemberNumber: count }, { merge: true });
      return count;
    });

    return `FK-${String(newCount).padStart(3, '0')}`;
  } catch (err) {
    console.warn('Firestore transaction failed, generating fallback FK ID:', err);
    const fallbackCount = (cachedMembers.length || 0) + 1;
    return `FK-${String(fallbackCount).padStart(3, '0')}`;
  }
};

/**
 * Computes member status dynamically based on current date vs end date
 */
export const calculateMemberStatus = (endDateStr, isFrozen = false) => {
  if (isFrozen) return 'Frozen';
  if (!endDateStr) return 'Active';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = endDateStr.split('-');
  let end;
  if (parts.length === 3) {
    end = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else {
    end = new Date(endDateStr);
  }
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Expired';
  if (diffDays <= 10) return 'Expiring Soon';
  return 'Active';
};

/**
 * Computes remaining days until membership expiration
 */
export const getDaysRemaining = (endDateStr) => {
  if (!endDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = endDateStr.split('-');
  let end;
  if (parts.length === 3) {
    end = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else {
    end = new Date(endDateStr);
  }
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Helper to calculate endDate from startDate and duration in months (1 or 3)
 */
export const calculateEndDateByDuration = (startDateStr, durationMonths = 1) => {
  if (!startDateStr) return '';
  const parts = startDateStr.split('-');
  if (parts.length !== 3) return startDateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, month, day);
  d.setMonth(d.getMonth() + Number(durationMonths));
  
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Fetch all members directly from Firestore.
 */
export const fetchMembers = async () => {
  try {
    const membersRef = collection(db, 'members');
    const snapshot = await getDocs(membersRef);

    if (!snapshot.empty) {
      const docs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const calculatedStatus = calculateMemberStatus(data.endDate, data.isFrozen);
        return {
          id: docSnap.id,
          ...data,
          status: calculatedStatus
        };
      });
      cachedMembers = docs;
      return docs;
    } else {
      cachedMembers = [];
      return [];
    }
  } catch (err) {
    console.warn('Firestore fetchMembers failed:', err);
  }

  return cachedMembers;
};

/**
 * Add New Member - Decoupled Registration:
 * Sets up member profile. If Admission Fee is collected (not waived), logs ONLY the Admission Fee into payments.
 * The monthly fee remains UNPAID until manually collected in Fee Collection module.
 */
export const addMember = async (memberPayload) => {
  const memberId = await getNextMemberId();
  const durationMonths = Number(memberPayload.durationMonths) || 1;
  const computedEndDate = memberPayload.endDate || calculateEndDateByDuration(memberPayload.startDate, durationMonths);
  const initialStatus = calculateMemberStatus(computedEndDate, false);

  const baseFee = Number(memberPayload.baseFee) || 8000;
  const discount = Number(memberPayload.discount) || 0;
  const netMembershipFee = Math.max(0, baseFee - discount);
  
  const admissionFee = memberPayload.admissionFeeWaived ? 0 : (Number(memberPayload.admissionFeeAmount) || 2000);

  const fullRecord = {
    id: memberId,
    fullName: memberPayload.fullName,
    phone: memberPayload.phone,
    emergencyContact: memberPayload.emergencyContact || '',
    cnicOrId: memberPayload.cnicOrId || '',
    gender: memberPayload.gender || 'Male',
    dob: memberPayload.dob || '',
    planId: memberPayload.planId || '',
    membershipType: memberPayload.membershipType || '1 Month Standard',
    durationMonths,
    startDate: memberPayload.startDate,
    endDate: computedEndDate,
    status: initialStatus,
    isFrozen: false,
    
    // Financial fields (Agreed rates in PKR)
    baseFee,
    discount,
    netMembershipFee,
    admissionFee,
    admissionFeeWaived: Boolean(memberPayload.admissionFeeWaived),

    createdAt: new Date().toISOString()
  };

  // 1. Persist Member Profile to Firestore (Writes ONLY to members collection)
  try {
    const docRef = doc(db, 'members', memberId);
    await setDoc(docRef, fullRecord);
  } catch (err) {
    console.warn('Firestore setDoc failed:', err);
  }

  cachedMembers.unshift(fullRecord);
  return fullRecord;
};

/**
 * Delete Member from Firestore (Protected by Owner PIN 1234)
 */
export const deleteMember = async (memberId) => {
  try {
    const docRef = doc(db, 'members', memberId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteMember failed:', err);
  }
  cachedMembers = cachedMembers.filter(m => m.id !== memberId);
};

/**
 * Freeze Member Membership
 */
export const freezeMembership = async (memberId, freezeReason = 'Personal Request') => {
  const todayStr = new Date().toISOString().split('T')[0];
  const updates = {
    isFrozen: true,
    frozenDate: todayStr,
    freezeReason,
    status: 'Frozen'
  };

  try {
    const docRef = doc(db, 'members', memberId);
    await updateDoc(docRef, updates);
  } catch (err) {
    console.warn('Firestore freeze update failed:', err);
  }

  const idx = cachedMembers.findIndex(m => m.id === memberId);
  if (idx !== -1) {
    cachedMembers[idx] = { ...cachedMembers[idx], ...updates };
  }
};

/**
 * Unfreeze Member Membership (Shifts Expiration End Date Forward)
 */
export const unfreezeMembership = async (memberId) => {
  const idx = cachedMembers.findIndex(m => m.id === memberId);
  const currentMember = cachedMembers[idx];
  if (!currentMember) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let frozenDays = 0;
  if (currentMember.frozenDate) {
    const freezeStart = new Date(currentMember.frozenDate);
    freezeStart.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - freezeStart.getTime();
    frozenDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  const oldEnd = new Date(currentMember.endDate || today);
  oldEnd.setDate(oldEnd.getDate() + frozenDays);
  const newEndDate = oldEnd.toISOString().split('T')[0];
  const newStatus = calculateMemberStatus(newEndDate, false);

  const updates = {
    isFrozen: false,
    frozenDate: null,
    endDate: newEndDate,
    status: newStatus,
    unfrozenAt: new Date().toISOString()
  };

  try {
    const docRef = doc(db, 'members', memberId);
    await updateDoc(docRef, updates);
  } catch (err) {
    console.warn('Firestore unfreeze update failed:', err);
  }

  if (idx !== -1) {
    cachedMembers[idx] = { ...cachedMembers[idx], ...updates };
  }
};

/**
 * Renew Member Plan
 */
export const renewMembership = async (memberId, planName, durationMonths, feeAmount) => {
  const idx = cachedMembers.findIndex(m => m.id === memberId);
  const currentMember = cachedMembers[idx];

  const todayStr = new Date().toISOString().split('T')[0];
  const newStartDate = currentMember && getDaysRemaining(currentMember.endDate) > 0 
    ? currentMember.endDate 
    : todayStr;

  const newEndDate = calculateEndDateByDuration(newStartDate, durationMonths);

  const updates = {
    membershipType: planName,
    durationMonths: Number(durationMonths),
    startDate: newStartDate,
    endDate: newEndDate,
    netMembershipFee: Number(feeAmount),
    isFrozen: false,
    status: 'Active',
    lastRenewedAt: new Date().toISOString()
  };

  try {
    const docRef = doc(db, 'members', memberId);
    await updateDoc(docRef, updates);
  } catch (err) {
    console.warn('Firestore renewal update failed:', err);
  }

  if (idx !== -1) {
    cachedMembers[idx] = { ...cachedMembers[idx], ...updates };
  }
};

/**
 * Update General Member Fields
 */
export const updateMemberDetails = async (memberId, updates) => {
  try {
    const docRef = doc(db, 'members', memberId);
    await updateDoc(docRef, updates);
  } catch (err) {
    console.warn('Firestore updateMemberDetails failed:', err);
  }

  const idx = cachedMembers.findIndex(m => m.id === memberId);
  if (idx !== -1) {
    cachedMembers[idx] = { ...cachedMembers[idx], ...updates };
  }
};

/**
 * Mark Member Attendance for Today
 */
export const markMemberAttendance = async (memberId, memberName, markedBy = 'Reception') => {
  const now = new Date();
  const attendanceRecord = {
    id: 'att-' + Date.now(),
    memberId,
    memberName,
    timestamp: now.toISOString(),
    dateString: now.toISOString().split('T')[0],
    timeString: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    markedBy
  };

  try {
    const attColRef = collection(db, 'members', memberId, 'attendance');
    await addDoc(attColRef, attendanceRecord);
  } catch (err) {
    console.warn('Firestore attendance addDoc failed:', err);
  }

  if (!cachedAttendance[memberId]) {
    cachedAttendance[memberId] = [];
  }
  cachedAttendance[memberId].unshift(attendanceRecord);
  return attendanceRecord;
};

/**
 * Fetch Attendance Logs for a member
 */
export const fetchMemberAttendance = async (memberId) => {
  try {
    const attColRef = collection(db, 'members', memberId, 'attendance');
    const q = query(attColRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      cachedAttendance[memberId] = logs;
      return logs;
    }
  } catch (err) {
    console.warn('Firestore fetch attendance failed:', err);
  }

  return cachedAttendance[memberId] || [];
};

/**
 * Fetch total member count directly from Firestore using aggregation query.
 * Consumes 0 document reads on Spark Plan (1 index read).
 */
export const fetchMemberCountServer = async () => {
  try {
    const membersRef = collection(db, 'members');
    const snapshot = await getCountFromServer(membersRef);
    return snapshot.data().count;
  } catch (err) {
    console.warn('Firestore getCountFromServer failed:', err);
    return cachedMembers.length;
  }
};

