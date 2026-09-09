import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { fetchMembers } from './memberService';

let cachedExpenses = [];
let cachedPayrolls = [];
let cachedPayments = [];

/**
 * Fetch all payments collected from members
 */
export const fetchPayments = async () => {
  try {
    const colRef = collection(db, 'payments');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      cachedPayments = docs;
      return docs;
    } else {
      cachedPayments = [];
      return [];
    }
  } catch (err) {
    console.warn('Firestore fetchPayments failed:', err);
  }
  return cachedPayments;
};

/**
 * Fetch all expense records
 */
export const fetchExpenses = async () => {
  try {
    const colRef = collection(db, 'expenses');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      cachedExpenses = docs;
      return docs;
    } else {
      cachedExpenses = [];
      return [];
    }
  } catch (err) {
    console.warn('Firestore fetchExpenses failed:', err);
  }
  return cachedExpenses;
};

/**
 * Record a new gym expense
 */
export const addExpense = async (payload) => {
  const expenseId = 'EXP-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900);
  const record = {
    id: expenseId,
    title: payload.title,
    category: payload.category || 'Misc',
    amount: Number(payload.amount),
    date: payload.date || new Date().toISOString().split('T')[0],
    receiptUrl: payload.receiptUrl || '',
    loggedBy: payload.loggedBy || 'Owner',
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = doc(db, 'expenses', expenseId);
    await setDoc(docRef, record);
  } catch (err) {
    console.warn('Firestore addExpense failed:', err);
  }

  cachedExpenses.unshift(record);
  return record;
};

/**
 * Delete Expense (Protected by Owner PIN 1234)
 */
export const deleteExpense = async (expenseId) => {
  try {
    const docRef = doc(db, 'expenses', expenseId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteExpense failed:', err);
  }
  cachedExpenses = cachedExpenses.filter(e => e.id !== expenseId);
};

/**
 * Fetch all trainer payroll entries
 */
export const fetchPayrolls = async () => {
  try {
    const colRef = collection(db, 'payrolls');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      cachedPayrolls = docs;
      return docs;
    } else {
      cachedPayrolls = [];
      return [];
    }
  } catch (err) {
    console.warn('Firestore fetchPayrolls failed:', err);
  }
  return cachedPayrolls;
};

/**
 * Save or Update Payroll calculation entry
 */
export const savePayrollEntry = async (payrollPayload) => {
  const payrollId = payrollPayload.id || ('PAY-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900));
  const record = {
    id: payrollId,
    trainerId: payrollPayload.trainerId,
    trainerName: payrollPayload.trainerName,
    trainerTitle: payrollPayload.trainerTitle || 'Senior Fitness Coach',
    period: payrollPayload.period || 'September 2026',
    baseSalary: Number(payrollPayload.baseSalary),
    activeClientsCount: Number(payrollPayload.activeClientsCount || 0),
    ptCommissionRate: Number(payrollPayload.ptCommissionRate || 0),
    totalCommission: Number(payrollPayload.totalCommission || 0),
    bonus: Number(payrollPayload.bonus || 0),
    bonusNote: payrollPayload.bonusNote || '',
    deduction: Number(payrollPayload.deduction || 0),
    deductionNote: payrollPayload.deductionNote || '',
    netPayable: Number(payrollPayload.netPayable),
    status: payrollPayload.status || 'Pending',
    paymentDate: payrollPayload.paymentDate || null,
    paymentMode: payrollPayload.paymentMode || null,
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = doc(db, 'payrolls', payrollId);
    await setDoc(docRef, record);
  } catch (err) {
    console.warn('Firestore savePayrollEntry failed:', err);
  }

  const idx = cachedPayrolls.findIndex(p => p.id === payrollId);
  if (idx !== -1) {
    cachedPayrolls[idx] = record;
  } else {
    cachedPayrolls.unshift(record);
  }

  return record;
};

/**
 * Mark Payroll as Paid
 */
export const markPayrollPaid = async (payrollId, paymentMode = 'Bank Transfer') => {
  const paymentDate = new Date().toISOString();
  const updates = {
    status: 'Paid',
    paymentDate,
    paymentMode
  };

  try {
    const docRef = doc(db, 'payrolls', payrollId);
    await updateDoc(docRef, updates);
  } catch (err) {
    console.warn('Firestore markPayrollPaid failed:', err);
  }

  const idx = cachedPayrolls.findIndex(p => p.id === payrollId);
  if (idx !== -1) {
    cachedPayrolls[idx] = { ...cachedPayrolls[idx], ...updates };
  }
};
