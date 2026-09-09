import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, 
  Search, 
  Calendar, 
  AlertCircle, 
  X,
  RotateCcw,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  FileText,
  UserPlus,
  Layers,
  MessageCircle,
  Download
} from 'lucide-react';
import { fetchMembers } from '../../services/memberService';
import { fetchPayments } from '../../services/financialService';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatPKR } from '../../utils/formatters';
import { MONTH_OPTIONS, DEFAULT_MONTH } from '../../utils/dateUtils';
import { exportToCSV } from '../../utils/csvExporter';
import { useAuth } from '../../context/AuthContext';
import { getOwnerStamp } from '../../utils/auditLogger';
import Avatar from '../common/Avatar';
import PinConfirmModal from '../common/PinConfirmModal';

const FeeCollectionModule = () => {
  const { userData } = useAuth();

  // Main Module Tabs: 'MONTHLY_FEES' | 'ADMISSION_FEES'
  const [moduleTab, setModuleTab] = useState('MONTHLY_FEES');

  // Month & Year Selector (Default September 2026)
  const [selectedMonth, setSelectedMonth] = useState(DEFAULT_MONTH);
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search for Tab 1 (Monthly Fees)
  const [monthlyFilterTab, setMonthlyFilterTab] = useState('All'); // 'All' | 'Defaulters' | 'Paid' | 'Frozen'
  const [searchTerm, setSearchTerm] = useState('');

  // Collect Fee Modal state
  const [collectingModalData, setCollectingModalData] = useState(null); // { member, feeType: 'MONTHLY_FEE'|'ADMISSION_FEE', amount: number }
  const [feeAmountInput, setFeeAmountInput] = useState(8000);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Receipt Modal state
  const [viewingReceiptPayment, setViewingReceiptPayment] = useState(null);

  // Rollback Payment PIN Modal state
  const [rollbackPaymentId, setRollbackPaymentId] = useState(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadFeeData();
  }, [selectedMonth]);

  const loadFeeData = async () => {
    setLoading(true);
    try {
      const [membersData, paymentsData] = await Promise.all([
        fetchMembers(),
        fetchPayments()
      ]);
      setMembers(membersData);
      setPayments(paymentsData);
    } catch (err) {
      console.error('Failed loading fee collection data:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Idempotent Fee Collection Submit:
   * Uses deterministic Firestore document IDs:
   * - Monthly Fee: `monthly_${memberId}_${selectedMonth}`
   * - Admission Fee: `admission_${memberId}`
   */
  const handleConfirmFeeCollection = async (e) => {
    e.preventDefault();
    if (!collectingModalData) return;

    setSubmittingPayment(true);
    const { member, feeType } = collectingModalData;
    const isMonthly = feeType === 'MONTHLY_FEE';

    // Deterministic Document ID to prevent duplicate writes!
    const paymentId = isMonthly 
      ? `monthly_${member.id}_${selectedMonth}` 
      : `admission_${member.id}`;

    const record = {
      id: paymentId,
      memberId: member.id,
      memberName: member.fullName,
      planName: member.membershipType || '1 Month Standard',
      netAmountPaid: Number(feeAmountInput),
      amount: Number(feeAmountInput),
      month: isMonthly ? selectedMonth : (member.startDate ? member.startDate.slice(0, 7) : selectedMonth),
      type: feeType,
      paymentMethod,
      date: new Date().toISOString().split('T')[0],
      recordedBy: getOwnerStamp(userData),
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'payments', paymentId), record);
      const feeLabel = isMonthly ? `Monthly fee for ${selectedMonth}` : 'One-Time Admission fee';
      setToastMessage(`Collected ${formatPKR(feeAmountInput)} (${feeLabel}) for ${member.fullName}! 🎉`);
      setCollectingModalData(null);
      await loadFeeData();
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error('Firestore setDoc payment error:', err);
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Rollback Fee Payment (PIN 1234 protected)
  const handleRollbackConfirm = async () => {
    if (!rollbackPaymentId) return;
    try {
      await deleteDoc(doc(db, 'payments', rollbackPaymentId));
      setRollbackPaymentId(null);
      setToastMessage('Payment record rolled back to Unpaid status.');
      await loadFeeData();
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error('Firestore deleteDoc payment error:', err);
    }
  };

  /**
   * Evaluate Member Status for Tab 1 (Monthly Fees):
   */
  const evaluateMemberMonthStatus = (member) => {
    if (member.isFrozen || member.status === 'Frozen') {
      return { 
        status: 'FROZEN', 
        label: 'Frozen ❄️', 
        color: 'bg-slate-100 text-slate-700 border-slate-300' 
      };
    }

    // Direct monthly fee payment for selectedMonth (matches deterministic ID or doc query)
    const directPayment = payments.find(
      p => p.memberId === member.id && p.type === 'MONTHLY_FEE' && (p.month === selectedMonth || p.id === `monthly_${member.id}_${selectedMonth}`)
    );

    if (directPayment) {
      return { 
        status: 'PAID', 
        label: 'Paid ✅', 
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        payment: directPayment 
      };
    }

    // 3-Month Advance deal coverage check
    if (member.durationMonths === 3 && member.startDate) {
      const joinMonth = member.startDate.slice(0, 7); // 'YYYY-MM'
      const firstMonthPaid = payments.find(
        p => p.memberId === member.id && p.type === 'MONTHLY_FEE' && (p.month === joinMonth || p.id === `monthly_${member.id}_${joinMonth}`)
      );

      if (firstMonthPaid) {
        const startYear = parseInt(joinMonth.split('-')[0], 10);
        const startM = parseInt(joinMonth.split('-')[1], 10);

        const selYear = parseInt(selectedMonth.split('-')[0], 10);
        const selM = parseInt(selectedMonth.split('-')[1], 10);

        const monthDiff = (selYear - startYear) * 12 + (selM - startM);

        if (monthDiff >= 0 && monthDiff < 3) {
          if (monthDiff === 0) {
            return {
              status: 'PAID',
              label: 'Paid ✅',
              color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
              payment: firstMonthPaid
            };
          }
          return {
            status: 'COVERED_3M',
            label: 'Paid (Covered under 3-Month Plan) ⚡',
            color: 'bg-teal-100 text-teal-800 border-teal-300'
          };
        }
      }
    }

    // Default: Unpaid / Defaulter
    // Default: Unpaid / Defaulter
    const agreedMonthlyFee = member.netMembershipFee ?? (member.baseFee !== undefined ? Math.max(0, member.baseFee - (member.discount || 0)) : 8000);
    return {
      status: 'UNPAID',
      label: 'Unpaid / Defaulter ⚠️',
      color: 'bg-rose-100 text-rose-800 border-rose-300',
      dueAmount: agreedMonthlyFee
    };
  };

  /**
   * Evaluate Member Status for Tab 2 (Admission Fees):
   */
  const evaluateAdmissionStatus = (member) => {
    if (member.admissionFeeWaived || member.admissionFee === 0) {
      return {
        status: 'WAIVED',
        label: 'Fee Waived ⚡',
        color: 'bg-slate-100 text-slate-600 border-slate-200'
      };
    }

    const admissionPayment = payments.find(
      p => p.memberId === member.id && p.type === 'ADMISSION_FEE'
    );

    if (admissionPayment) {
      return {
        status: 'PAID',
        label: 'PAID (One-Time) ✅',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        payment: admissionPayment
      };
    }

    const feeAmount = member.admissionFeeAmount ?? member.admissionFee ?? 2000;
    return {
      status: 'PENDING',
      label: 'PENDING ADMISSION ⚠️',
      color: 'bg-rose-100 text-rose-800 border-rose-300',
      dueAmount: feeAmount
    };
  };

  // Tab 1 Monthly Evaluations & Filter Computation
  const memberMonthlyEvaluations = members.map(m => ({
    member: m,
    evaluation: evaluateMemberMonthStatus(m)
  }));

  const filteredMonthlyMembers = memberMonthlyEvaluations.filter(({ member, evaluation }) => {
    const matchesSearch = 
      member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone.includes(searchTerm) ||
      member.id.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesTab = true;
    if (monthlyFilterTab === 'Defaulters') matchesTab = evaluation.status === 'UNPAID';
    if (monthlyFilterTab === 'Paid') matchesTab = evaluation.status === 'PAID' || evaluation.status === 'COVERED_3M';
    if (monthlyFilterTab === 'Frozen') matchesTab = evaluation.status === 'FROZEN';

    return matchesSearch && matchesTab;
  });

  // Tab 2 Admission Evaluations & Filter Computation
  const memberAdmissionEvaluations = members.map(m => ({
    member: m,
    evaluation: evaluateAdmissionStatus(m)
  }));

  const filteredAdmissionMembers = memberAdmissionEvaluations.filter(({ member }) => {
    return member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone.includes(searchTerm) ||
      member.id.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // KPI Calculations for Selected Month
  const defaultersCount = memberMonthlyEvaluations.filter(e => e.evaluation.status === 'UNPAID').length;
  
  const totalMonthlyCollectedThisMonth = payments
    .filter(p => p.type === 'MONTHLY_FEE' && p.month === selectedMonth)
    .reduce((acc, curr) => acc + Number(curr.netAmountPaid || curr.amount || 0), 0);

  const totalAdmissionCollectedThisMonth = payments
    .filter(p => p.type === 'ADMISSION_FEE' && p.date && p.date.startsWith(selectedMonth))
    .reduce((acc, curr) => acc + Number(curr.netAmountPaid || curr.amount || 0), 0);

  const totalCollectedThisMonth = totalMonthlyCollectedThisMonth + totalAdmissionCollectedThisMonth;

  const totalOutstandingDues = memberMonthlyEvaluations
    .filter(e => e.evaluation.status === 'UNPAID')
    .reduce((acc, curr) => acc + (curr.evaluation.dueAmount ?? 8000), 0);

  // WhatsApp Automated Fee Reminder Handler (Zero Cost wa.me Deep Links)
  const handleSendWhatsAppReminder = (member, dueAmount) => {
    let cleanPhone = (member.phone || '').replace(/[\s\-\+]/g, '');
    if (cleanPhone.startsWith('00')) {
      cleanPhone = cleanPhone.slice(2);
    } else if (cleanPhone.startsWith('0')) {
      cleanPhone = '92' + cleanPhone.slice(1);
    }

    const monthObj = MONTH_OPTIONS.find(m => m.value === selectedMonth);
    const monthName = monthObj ? monthObj.label : selectedMonth;
    const formattedFee = (dueAmount ?? 8000).toLocaleString();

    const msg = `Dear ${member.fullName}, this is a formal reminder from Fitness Kingdom Gym that your membership dues of Rs. ${formattedFee} for the month of ${monthName} are currently pending. Kindly clear your dues at the reception counter at your earliest convenience. Thank you!`;
    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
  };

  // Client-Side CSV Export Handler for Fee Collection Table
  const handleExportFeeDuesCSV = () => {
    const monthObj = MONTH_OPTIONS.find(m => m.value === selectedMonth);
    const monthName = monthObj ? monthObj.label : selectedMonth;
    const filename = `Fee_Dues_${selectedMonth}.csv`;

    const headers = [
      'Member ID',
      'Full Name',
      'Phone Number',
      'Agreed Membership Plan',
      'Expiry Date',
      'Agreed Monthly Rate (PKR)',
      'Status',
      'Due Amount (PKR)'
    ];

    const rows = filteredMonthlyMembers.map(({ member, evaluation }) => [
      member.id,
      member.fullName,
      member.phone,
      member.membershipType || '1 Month Standard',
      member.endDate || 'N/A',
      member.netMembershipFee || (member.baseFee - (member.discount || 0)) || 8000,
      evaluation.label ? evaluation.label.replace(/[^\x00-\x7F]/g, "").trim() : evaluation.status,
      evaluation.status === 'UNPAID' ? (evaluation.dueAmount || 8000) : 0
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

      {/* Header Bar & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
            FEE COLLECTION & RECONCILIATION ENGINE
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Fee Collection Module</h2>
          <p className="text-xs text-slate-500">Manage recurring monthly dues and one-time registration charges in PKR.</p>
        </div>

        {/* Chronological Month Picker Dropdown */}
        <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-2xl border border-zinc-200 shadow-sm">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-500">Billing Period:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none cursor-pointer"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Defaulters Outstanding"
          value={`${defaultersCount} Members Unpaid`}
          subtitle="Awaiting Monthly Fee Collection"
          color="bg-rose-50 border-rose-200 text-rose-900"
          icon={AlertCircle}
        />

        <KpiCard
          title={`Total Revenue (${selectedMonth})`}
          value={formatPKR(totalCollectedThisMonth)}
          subtitle={`Monthly (${formatPKR(totalMonthlyCollectedThisMonth)}) + Adm (${formatPKR(totalAdmissionCollectedThisMonth)})`}
          color="bg-emerald-50 border-emerald-200 text-emerald-900"
          icon={TrendingUp}
        />

        <KpiCard
          title="Total Outstanding Dues"
          value={formatPKR(totalOutstandingDues)}
          subtitle="Pending Unpaid Monthly Dues"
          color="bg-amber-50 border-amber-200 text-amber-900"
          icon={DollarSign}
        />
      </div>

      {/* Dual Sub-Tab Selector Navigation */}
      <div className="flex items-center gap-3 border-b border-zinc-200 pb-1">
        <button
          onClick={() => setModuleTab('MONTHLY_FEES')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-2xl transition-all ${
            moduleTab === 'MONTHLY_FEES'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-zinc-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Tab 1: Recurring Monthly Membership Fees</span>
        </button>

        <button
          onClick={() => setModuleTab('ADMISSION_FEES')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-2xl transition-all ${
            moduleTab === 'ADMISSION_FEES'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-zinc-200'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Tab 2: One-Time Registration / Admission Fees</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4">
        {/* Toolbar: Search & Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by member name, phone, or FK-ID..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Sub-Filters & Export CSV for Tab 1 */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {moduleTab === 'MONTHLY_FEES' && (
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-zinc-200 overflow-x-auto">
                <button
                  onClick={() => setMonthlyFilterTab('All')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    monthlyFilterTab === 'All' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All Members ({members.length})
                </button>
                <button
                  onClick={() => setMonthlyFilterTab('Defaulters')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    monthlyFilterTab === 'Defaulters' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-600 hover:bg-rose-50'
                  }`}
                >
                  Defaulters ({defaultersCount})
                </button>
                <button
                  onClick={() => setMonthlyFilterTab('Paid')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    monthlyFilterTab === 'Paid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Paid Members
                </button>
                <button
                  onClick={() => setMonthlyFilterTab('Frozen')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    monthlyFilterTab === 'Frozen' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Frozen
                </button>
              </div>
            )}

            <button
              onClick={handleExportFeeDuesCSV}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all shrink-0 cursor-pointer"
              title="Export Fee Dues to CSV"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* TAB 1: RECURRING MONTHLY FEES DESKTOP TABLE (>= 640px) */}
        {moduleTab === 'MONTHLY_FEES' && (
          <div className="hidden sm:block w-full overflow-x-auto shadow-sm rounded-xl border border-zinc-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3 pl-2">Member</th>
                  <th className="pb-3">Contact</th>
                  <th className="pb-3">Agreed Plan</th>
                  <th className="pb-3">Monthly Rate (PKR)</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-xs text-slate-400">
                      Evaluating live monthly fee statuses...
                    </td>
                  </tr>
                ) : filteredMonthlyMembers.length > 0 ? (
                  filteredMonthlyMembers.map(({ member, evaluation }) => (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-2">
                        <div className="flex items-center gap-3">
                          <Avatar name={member.fullName} size="md" />
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{member.fullName}</p>
                            <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {member.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 font-medium text-slate-700">{member.phone}</td>

                      <td className="py-3.5">
                        <span className="font-bold text-slate-800 block">{member.membershipType}</span>
                        <span className="text-[10px] text-slate-400">Expires: {member.endDate}</span>
                      </td>

                      <td className="py-3.5 font-extrabold text-slate-900">
                        {formatPKR(member.netMembershipFee || (member.baseFee - (member.discount || 0)) || 8000)}
                      </td>

                      <td className="py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${evaluation.color}`}>
                          {evaluation.label}
                        </span>
                      </td>

                      <td className="py-3.5 text-right pr-2">
                        {evaluation.status === 'UNPAID' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSendWhatsAppReminder(member, evaluation.dueAmount)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:scale-105 flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                              title="Send WhatsApp Fee Reminder"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-100" />
                              <span>WhatsApp</span>
                            </button>

                            <button
                              onClick={() => {
                                setCollectingModalData({
                                  member,
                                  feeType: 'MONTHLY_FEE',
                                  amount: evaluation.dueAmount
                                });
                                setFeeAmountInput(evaluation.dueAmount);
                              }}
                              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-xl shadow-md shadow-rose-600/20 transition-all hover:scale-105 cursor-pointer min-h-[38px]"
                            >
                              Collect Fee ({formatPKR(evaluation.dueAmount)})
                            </button>
                          </div>
                        )}

                        {evaluation.status === 'PAID' && (
                          <div className="flex items-center justify-end gap-1.5">
                            {evaluation.payment && (
                              <button
                                onClick={() => setViewingReceiptPayment(evaluation.payment)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-lg border border-emerald-200 flex items-center gap-1 min-h-[36px]"
                                title="View Receipt"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Receipt</span>
                              </button>
                            )}
                            <button
                              onClick={() => setRollbackPaymentId(evaluation.payment?.id)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] rounded-lg flex items-center gap-1 min-h-[36px]"
                              title="Mark as Unpaid (PIN 1234 Rollback)"
                            >
                              <RotateCcw className="w-3 h-3 text-slate-400" />
                              <span>Mark Unpaid</span>
                            </button>
                          </div>
                        )}

                        {evaluation.status === 'COVERED_3M' && (
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-lg border border-teal-200">
                            Advance Covered
                          </span>
                        )}

                        {evaluation.status === 'FROZEN' && (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                            Billing Paused
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-xs text-slate-400">
                      No members found matching the selected filters for {selectedMonth}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 1: RECURRING MONTHLY FEES MOBILE CARD VIEW (< 640px) */}
        {moduleTab === 'MONTHLY_FEES' && (
          <div className="block sm:hidden space-y-3">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Evaluating live monthly fee statuses...</div>
            ) : filteredMonthlyMembers.length > 0 ? (
              filteredMonthlyMembers.map(({ member, evaluation }) => (
                <div key={member.id} className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.fullName} size="md" />
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{member.fullName}</h4>
                        <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {member.id}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${evaluation.color}`}>
                      {evaluation.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Phone</span>
                      <span className="font-semibold text-slate-700">{member.phone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Plan</span>
                      <span className="font-bold text-slate-800">{member.membershipType}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Monthly Fee</span>
                      <span className="font-extrabold text-slate-900">
                        {formatPKR(member.netMembershipFee || (member.baseFee - (member.discount || 0)) || 8000)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Expires</span>
                      <span className="text-slate-600 font-medium">{member.endDate || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-100">
                    {evaluation.status === 'UNPAID' && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleSendWhatsAppReminder(member, evaluation.dueAmount)}
                          className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-100" /> WhatsApp Reminder
                        </button>
                        <button
                          onClick={() => {
                            setCollectingModalData({
                              member,
                              feeType: 'MONTHLY_FEE',
                              amount: evaluation.dueAmount
                            });
                            setFeeAmountInput(evaluation.dueAmount);
                          }}
                          className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 flex items-center justify-center cursor-pointer min-h-[44px]"
                        >
                          Collect Fee ({formatPKR(evaluation.dueAmount)})
                        </button>
                      </div>
                    )}

                    {evaluation.status === 'PAID' && (
                      <div className="flex items-center gap-2">
                        {evaluation.payment && (
                          <button
                            onClick={() => setViewingReceiptPayment(evaluation.payment)}
                            className="flex-1 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                          >
                            <FileText className="w-4 h-4" /> View Receipt
                          </button>
                        )}
                        <button
                          onClick={() => setRollbackPaymentId(evaluation.payment?.id)}
                          className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                        >
                          <RotateCcw className="w-4 h-4 text-slate-400" /> Mark Unpaid
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">No members found matching filters.</div>
            )}
          </div>
        )}

        {/* TAB 2: ONE-TIME ADMISSION FEES DESKTOP TABLE (>= 640px) */}
        {moduleTab === 'ADMISSION_FEES' && (
          <div className="hidden sm:block w-full overflow-x-auto shadow-sm rounded-xl border border-zinc-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3 pl-2">Member</th>
                  <th className="pb-3">Contact</th>
                  <th className="pb-3">Joining Date</th>
                  <th className="pb-3">Admission Fee (PKR)</th>
                  <th className="pb-3">Admission Status</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-xs text-slate-400">
                      Loading admission fee records...
                    </td>
                  </tr>
                ) : filteredAdmissionMembers.length > 0 ? (
                  filteredAdmissionMembers.map(({ member, evaluation }) => (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-2">
                        <div className="flex items-center gap-3">
                          <Avatar name={member.fullName} size="md" />
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{member.fullName}</p>
                            <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {member.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 font-medium text-slate-700">{member.phone}</td>

                      <td className="py-3.5 text-slate-600 font-medium">
                        {member.startDate || 'N/A'}
                      </td>

                      <td className="py-3.5 font-extrabold text-slate-900">
                        {formatPKR(member.admissionFeeAmount || member.admissionFee || 2000)}
                      </td>

                      <td className="py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${evaluation.color}`}>
                          {evaluation.label}
                        </span>
                      </td>

                      <td className="py-3.5 text-right pr-2">
                        {evaluation.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setCollectingModalData({
                                member,
                                feeType: 'ADMISSION_FEE',
                                amount: evaluation.dueAmount
                              });
                              setFeeAmountInput(evaluation.dueAmount);
                            }}
                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-xl shadow-md shadow-rose-600/20 transition-all hover:scale-105 min-h-[38px] cursor-pointer"
                          >
                            Collect Admission Fee ({formatPKR(evaluation.dueAmount)})
                          </button>
                        )}

                        {evaluation.status === 'PAID' && (
                          <div className="flex items-center justify-end gap-1.5">
                            {evaluation.payment && (
                              <button
                                onClick={() => setViewingReceiptPayment(evaluation.payment)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-lg border border-emerald-200 flex items-center gap-1 min-h-[36px]"
                                title="View Receipt"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Receipt</span>
                              </button>
                            )}
                          </div>
                        )}

                        {evaluation.status === 'WAIVED' && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                            Fee Waived Off
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-xs text-slate-400">
                      No members found matching the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: ONE-TIME ADMISSION FEES MOBILE CARD VIEW (< 640px) */}
        {moduleTab === 'ADMISSION_FEES' && (
          <div className="block sm:hidden space-y-3">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading admission fee records...</div>
            ) : filteredAdmissionMembers.length > 0 ? (
              filteredAdmissionMembers.map(({ member, evaluation }) => (
                <div key={member.id} className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.fullName} size="md" />
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{member.fullName}</h4>
                        <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {member.id}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${evaluation.color}`}>
                      {evaluation.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Phone</span>
                      <span className="font-semibold text-slate-700">{member.phone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Joining Date</span>
                      <span className="font-semibold text-slate-700">{member.startDate || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Admission Fee</span>
                      <span className="font-extrabold text-slate-900">
                        {formatPKR(member.admissionFeeAmount || member.admissionFee || 2000)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-100">
                    {evaluation.status === 'PENDING' && (
                      <button
                        onClick={() => {
                          setCollectingModalData({
                            member,
                            feeType: 'ADMISSION_FEE',
                            amount: evaluation.dueAmount
                          });
                          setFeeAmountInput(evaluation.dueAmount);
                        }}
                        className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 flex items-center justify-center cursor-pointer min-h-[44px]"
                      >
                        Collect Admission Fee ({formatPKR(evaluation.dueAmount)})
                      </button>
                    )}

                    {evaluation.status === 'PAID' && evaluation.payment && (
                      <button
                        onClick={() => setViewingReceiptPayment(evaluation.payment)}
                        className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                      >
                        <FileText className="w-4 h-4" /> View Receipt
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">No members found matching filters.</div>
            )}
          </div>
        )}
      </div>

      {/* Collect Fee Modal */}
      <AnimatePresence>
        {collectingModalData && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCollectingModalData(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%', sm: 0 }}
              animate={{ y: 0, sm: 0 }}
              exit={{ y: '100%', sm: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-md border border-zinc-200 shadow-2xl z-10 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden shrink-0" />

              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {collectingModalData.feeType === 'MONTHLY_FEE' ? 'Collect Monthly Fee' : 'Collect Admission Fee'}
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      {collectingModalData.feeType === 'MONTHLY_FEE' ? `Billing Period: ${selectedMonth}` : 'One-Time Lifetime Charge'}
                    </p>
                  </div>
                </div>

                <button onClick={() => setCollectingModalData(null)} className="text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-zinc-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Member Profile</span>
                <span className="font-extrabold text-slate-900 text-sm block">{collectingModalData.member.fullName}</span>
                <span className="text-xs text-slate-500">Phone: {collectingModalData.member.phone} • FK-ID: {collectingModalData.member.id}</span>
              </div>

              <form onSubmit={handleConfirmFeeCollection} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {collectingModalData.feeType === 'MONTHLY_FEE' ? 'Monthly Fee Amount (PKR)' : 'Admission Fee Amount (PKR)'}
                  </label>
                  <input
                    type="number"
                    required
                    value={feeAmountInput}
                    onChange={(e) => setFeeAmountInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base sm:text-xs font-extrabold border border-zinc-200 rounded-xl bg-slate-50 text-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base sm:text-xs font-bold border border-zinc-200 rounded-xl bg-slate-50"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online Bank Transfer">Online Bank Transfer</option>
                    <option value="EasyPaisa / JazzCash">EasyPaisa / JazzCash</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Confirm Payment</span>
                  <span className="text-xl font-extrabold text-emerald-400">{formatPKR(feeAmountInput)}</span>
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCollectingModalData(null)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 min-h-[44px]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{submittingPayment ? 'Processing...' : 'Confirm Fee Payment'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Receipt Modal */}
      <AnimatePresence>
        {viewingReceiptPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingReceiptPayment(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm border border-zinc-200 shadow-2xl z-10 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">Payment Receipt</h3>
                </div>
                <button onClick={() => setViewingReceiptPayment(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-zinc-200">
                <div className="flex justify-between text-slate-500">
                  <span>Receipt ID:</span>
                  <span className="font-mono text-slate-800 font-bold">{viewingReceiptPayment.id}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Member:</span>
                  <span className="font-bold text-slate-900">{viewingReceiptPayment.memberName}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Payment Type:</span>
                  <span className="font-bold text-slate-800">
                    {viewingReceiptPayment.type === 'ADMISSION_FEE' ? 'One-Time Admission Charge' : 'Monthly Recurring Fee'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Billing Period:</span>
                  <span className="font-bold text-slate-800">{viewingReceiptPayment.month}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Payment Date:</span>
                  <span className="font-bold text-slate-800">{viewingReceiptPayment.date}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Payment Method:</span>
                  <span className="font-bold text-slate-800">{viewingReceiptPayment.paymentMethod || 'Cash'}</span>
                </div>
                <div className="pt-2 border-t border-zinc-200 flex justify-between items-center font-extrabold text-slate-900 text-sm">
                  <span>Amount Paid:</span>
                  <span className="text-emerald-600">{formatPKR(viewingReceiptPayment.netAmountPaid || viewingReceiptPayment.amount)}</span>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Print Receipt
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PIN Confirmation Modal for Rollback */}
      <PinConfirmModal
        isOpen={Boolean(rollbackPaymentId)}
        onClose={() => setRollbackPaymentId(null)}
        onConfirm={handleRollbackConfirm}
        title="Rollback Payment to Unpaid"
        description="Are you sure you want to delete this payment record and revert the member's status back to Unpaid for this fee item?"
      />
    </div>
  );
};

const KpiCard = ({ title, value, subtitle, color, icon: Icon }) => (
  <div className={`p-5 rounded-3xl border shadow-sm ${color} flex items-center justify-between`}>
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{title}</p>
      <h3 className="text-2xl font-extrabold mt-1">{value}</h3>
      <p className="text-[10px] opacity-80 mt-0.5">{subtitle}</p>
    </div>
    <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-sm">
      <Icon className="w-5 h-5" />
    </div>
  </div>
);

export default FeeCollectionModule;
