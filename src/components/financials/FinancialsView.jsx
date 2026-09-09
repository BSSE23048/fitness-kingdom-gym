import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  UserCheck, 
  Award, 
  Calendar, 
  CheckCircle2,
  Trash2,
  FileText,
  RotateCcw,
  Download
} from 'lucide-react';
import { 
  fetchExpenses, 
  addExpense, 
  deleteExpense,
  fetchPayrolls, 
  markPayrollPaid, 
  fetchPayments 
} from '../../services/financialService';
import ExpenseFormModal from './ExpenseFormModal';
import PayrollModal from './PayrollModal';
import SalarySlipModal from './SalarySlipModal';
import { formatPKR } from '../../utils/formatters';
import { MONTH_OPTIONS, DEFAULT_MONTH } from '../../utils/dateUtils';
import { exportToCSV } from '../../utils/csvExporter';
import { useAuth } from '../../context/AuthContext';
import { getOwnerStamp } from '../../utils/auditLogger';
import PinConfirmModal from '../common/PinConfirmModal';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const FinancialsView = () => {
  const { userData } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(DEFAULT_MONTH); // YYYY-MM
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [selectedSalarySlip, setSelectedSalarySlip] = useState(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);
  
  // Void Payment PIN Modal state
  const [voidPaymentId, setVoidPaymentId] = useState(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadFinancialData();
  }, [selectedMonth]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const [paymentsData, expData, payData] = await Promise.all([
        fetchPayments(),
        fetchExpenses(),
        fetchPayrolls()
      ]);
      setPayments(paymentsData);
      setExpenses(expData);
      setPayrolls(payData);
    } catch (err) {
      console.error('Failed loading financials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (payload) => {
    try {
      const newExp = await addExpense({
        ...payload,
        loggedBy: getOwnerStamp(userData),
        date: payload.date || `${selectedMonth}-01`
      });
      setToastMessage(`Logged expense "${newExp.title}" (${formatPKR(newExp.amount)})! ✨`);
      await loadFinancialData();
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExpenseConfirm = async () => {
    if (!deletingExpenseId) return;
    try {
      await deleteExpense(deletingExpenseId);
      setDeletingExpenseId(null);
      setToastMessage('Expense record deleted permanently.');
      await loadFinancialData();
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  // Void / Delete Transaction (PIN 1234 protected)
  const handleVoidPaymentConfirm = async () => {
    if (!voidPaymentId) return;
    try {
      await deleteDoc(doc(db, 'payments', voidPaymentId));
      setVoidPaymentId(null);
      setToastMessage('Payment transaction voided and removed from ledger.');
      await loadFinancialData();
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error('Firestore delete payment error:', err);
    }
  };

  const handleProcessPayrollPayout = async (payrollId, paymentMode) => {
    try {
      await markPayrollPaid(payrollId, paymentMode);
      setToastMessage(`Payroll payout processed via ${paymentMode}! 🎉`);
      await loadFinancialData();
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Formula for Selected Month Revenue:
   * Query 1: All MONTHLY_FEE payments where month == selectedMonth
   * Query 2: All ADMISSION_FEE payments where date starts with selectedMonth
   */
  const monthlyFeePayments = payments.filter(
    p => p.type === 'MONTHLY_FEE' && p.month === selectedMonth
  );

  const admissionFeePayments = payments.filter(
    p => p.type === 'ADMISSION_FEE' && p.date && p.date.startsWith(selectedMonth)
  );

  const filteredPayments = [...monthlyFeePayments, ...admissionFeePayments].sort(
    (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
  );

  const filteredExpenses = expenses.filter(
    e => e.date && e.date.startsWith(selectedMonth)
  );

  const filteredPayrolls = payrolls.filter(p => {
    if (p.period && p.period.toLowerCase().includes(selectedMonth)) return true;
    if (p.paymentDate && p.paymentDate.startsWith(selectedMonth)) return true;
    return true;
  });

  // Calculations in PKR
  const monthlyFeeTotal = monthlyFeePayments.reduce((acc, curr) => acc + Number(curr.netAmountPaid || curr.amount || 0), 0);
  const admissionFeeTotal = admissionFeePayments.reduce((acc, curr) => acc + Number(curr.netAmountPaid || curr.amount || 0), 0);
  const totalRevenueCollected = monthlyFeeTotal + admissionFeeTotal;

  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalPaidPayroll = filteredPayrolls.filter(p => p.status === 'Paid').reduce((acc, curr) => acc + Number(curr.netPayable || 0), 0);
  const netCashflow = totalRevenueCollected - (totalExpenses + totalPaidPayroll);

  // Client-Side CSV Export Handler for Expenses Table
  const handleExportExpensesCSV = () => {
    const filename = `Gym_Expenses_${selectedMonth}.csv`;
    const headers = [
      'Expense ID',
      'Title / Description',
      'Category',
      'Amount (PKR)',
      'Date',
      'Payment Mode',
      'Logged By'
    ];

    const rows = filteredExpenses.map(exp => [
      exp.id || 'N/A',
      exp.title || exp.description || 'Expense',
      exp.category || 'General',
      exp.amount || 0,
      exp.date || selectedMonth,
      exp.paymentMode || exp.paymentMethod || 'Cash',
      exp.recordedBy || 'Admin'
    ]);

    exportToCSV(filename, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-emerald-600/20"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage('')} className="text-white/80 hover:text-white">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
            EXECUTIVE FINANCIAL CONSOLE
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Revenue, Expenses & Trainer Payroll</h2>
          <p className="text-xs text-slate-500">Track net cashflow, operational overheads, and personal training commissions in PKR.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chronological Billing Period Selector */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-zinc-200 shadow-sm">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-500">Period:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-[11px] font-extrabold text-slate-900 focus:outline-none cursor-pointer"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons Toolbar */}
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Log Expense
          </button>

          <button
            onClick={() => setIsPayrollModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 min-h-[44px] cursor-pointer"
          >
            <UserCheck className="w-4 h-4" /> Calculate Payroll
          </button>
        </div>
      </div>

      {/* KPI Cards in PKR for Selected Month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinanceCard title={`Paid Revenue (${selectedMonth})`} amount={formatPKR(totalRevenueCollected)} color="bg-emerald-50 border-emerald-200 text-emerald-900" icon={TrendingUp} />
        <FinanceCard title={`Operating Expenses`} amount={formatPKR(totalExpenses)} color="bg-rose-50 border-rose-200 text-rose-900" icon={TrendingDown} />
        <FinanceCard title={`Paid Staff Payroll`} amount={formatPKR(totalPaidPayroll)} color="bg-slate-900 text-white border-slate-800" icon={Award} />
        <FinanceCard title={`Net Profit Cashflow`} amount={formatPKR(netCashflow)} color="bg-emerald-50 border-emerald-200 text-emerald-900" icon={DollarSign} />
      </div>

      {/* Confirmed Payment Ledger with Void Action */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Confirmed Payment Collections</h3>
            <p className="text-xs text-slate-500">
              Actual paid member monthly dues ({formatPKR(monthlyFeeTotal)}) & admission charges ({formatPKR(admissionFeeTotal)}) for {selectedMonth}
            </p>
          </div>
          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
            Strict Cash Accounting
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-slate-400 font-bold uppercase text-[10px]">
                <th className="pb-3 pl-2">Member</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Plan / Description</th>
                <th className="pb-3">Payment Mode</th>
                <th className="pb-3">Confirmed Paid</th>
                <th className="pb-3">Date</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-xs text-slate-400">
                    Loading payment transaction ledger...
                  </td>
                </tr>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 pl-2 font-bold text-slate-900">{p.memberName}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.type === 'ADMISSION_FEE' 
                          ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {p.type === 'ADMISSION_FEE' ? 'Admission Fee' : 'Monthly Fee'}
                      </span>
                    </td>
                    <td className="py-3 text-slate-700">{p.planName || '1 Month Standard'}</td>
                    <td className="py-3 text-slate-600">{p.paymentMethod || 'Cash'}</td>
                    <td className="py-3 font-extrabold text-emerald-600">{formatPKR(p.netAmountPaid || p.amount)}</td>
                    <td className="py-3 text-slate-400">{p.date}</td>
                    <td className="py-3 text-right pr-2">
                      <button
                        onClick={() => setVoidPaymentId(p.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-auto flex items-center gap-1"
                        title="Void / Delete Transaction (PIN 1234)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-xs text-slate-400">
                    No confirmed payments logged for {selectedMonth}. Collect fees in Fee Collection module to generate revenue records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Log Section */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Operational Expenses Log ({selectedMonth})</h3>
            <p className="text-xs text-slate-500">Rent, utilities, machine maintenance, and supplements</p>
          </div>

          <button
            onClick={handleExportExpensesCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all shrink-0 cursor-pointer"
            title="Export Expenses to CSV"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-slate-400 font-bold uppercase text-[10px]">
                <th className="pb-3 pl-2">Expense Title</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Amount (PKR)</th>
                <th className="pb-3">Date</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80">
                    <td className="py-3 pl-2 font-bold text-slate-900">{e.title}</td>
                    <td className="py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 font-extrabold text-rose-600">{formatPKR(e.amount)}</td>
                    <td className="py-3 text-slate-500">{e.date}</td>
                    <td className="py-3 text-right pr-2">
                      <button
                        onClick={() => setDeletingExpenseId(e.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-auto"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-xs text-slate-400">
                    No expense records logged for {selectedMonth}. Click "Log Expense" to record overheads.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSubmit={handleCreateExpense}
      />

      <PayrollModal
        isOpen={isPayrollModalOpen}
        onClose={() => setIsPayrollModalOpen(false)}
        onProcessPayout={handleProcessPayrollPayout}
        onPrintSlip={(slip) => setSelectedSalarySlip(slip)}
      />

      <SalarySlipModal
        isOpen={Boolean(selectedSalarySlip)}
        onClose={() => setSelectedSalarySlip(null)}
        payrollData={selectedSalarySlip}
      />

      <PinConfirmModal
        isOpen={Boolean(deletingExpenseId)}
        onClose={() => setDeletingExpenseId(null)}
        onConfirm={handleDeleteExpenseConfirm}
        title="Delete Expense Record"
        description="Are you sure you want to delete this expense record from Firestore?"
      />

      <PinConfirmModal
        isOpen={Boolean(voidPaymentId)}
        onClose={() => setVoidPaymentId(null)}
        onConfirm={handleVoidPaymentConfirm}
        title="Void Payment Transaction"
        description="Are you sure you want to void and delete this payment collection document from Firestore?"
      />
    </div>
  );
};

const FinanceCard = ({ title, amount, color, icon: Icon }) => (
  <div className={`p-5 rounded-3xl border shadow-sm ${color} flex items-center justify-between`}>
    <div className="min-w-0 flex-1 pr-2">
      <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{title}</p>
      <h3 className="text-xl sm:text-2xl font-extrabold mt-1 break-words">{amount}</h3>
    </div>
    <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-sm shrink-0">
      <Icon className="w-5 h-5" />
    </div>
  </div>
);

export default FinancialsView;
