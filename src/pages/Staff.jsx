import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  DollarSign, 
  UserCheck, 
  Phone, 
  CheckCircle2,
  X,
  Printer,
  Trash2
} from 'lucide-react';
import { subscribeTrainers, addTrainer, deleteTrainer } from '../services/trainerService';
import { savePayrollEntry, fetchPayrolls } from '../services/financialService';
import { formatPKR } from '../utils/formatters';
import Avatar from '../components/common/Avatar';
import SalarySlipModal from '../components/financials/SalarySlipModal';
import PinConfirmModal from '../components/common/PinConfirmModal';

const Staff = () => {
  const [trainers, setTrainers] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [selectedTrainerForPayroll, setSelectedTrainerForPayroll] = useState(null);
  const [selectedSalarySlip, setSelectedSalarySlip] = useState(null);
  const [deletingTrainerId, setDeletingTrainerId] = useState(null);

  // Form states for Add Trainer
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [baseSalary, setBaseSalary] = useState(40000);
  const [commissionRate, setCommissionRate] = useState(5);
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);

  // Form states for Payroll calculation
  const [calcBaseSalary, setCalcBaseSalary] = useState(40000);
  const [calcBonus, setCalcBonus] = useState(0);
  const [calcDeduction, setCalcDeduction] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');

  const [toastMessage, setToastMessage] = useState('');

  // Subscribe to Trainers collection via onSnapshot for real-time sync
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeTrainers((docs) => {
      setTrainers(docs);
      setLoading(false);
    });

    loadPayrollsData();
    return () => unsubscribe();
  }, []);

  const loadPayrollsData = async () => {
    try {
      const data = await fetchPayrolls();
      setPayrolls(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTrainer = async (e) => {
    e.preventDefault();
    try {
      const newTrainer = await addTrainer({
        fullName,
        phone,
        cnic,
        baseSalary: Number(baseSalary),
        commissionRate: Number(commissionRate),
        joiningDate,
        status: 'Active'
      });
      setToastMessage(`Trainer "${newTrainer.fullName}" registered successfully! ✨`);
      setShowTrainerModal(false);
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTrainerConfirm = async () => {
    if (!deletingTrainerId) return;
    try {
      await deleteTrainer(deletingTrainerId);
      setDeletingTrainerId(null);
      setToastMessage('Trainer record deleted permanently.');
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenPayrollModal = (trainer) => {
    setSelectedTrainerForPayroll(trainer);
    setCalcBaseSalary(trainer.baseSalary || 40000);
    setCalcBonus(0);
    setCalcDeduction(0);
    setShowPayrollModal(true);
  };

  const handleProcessPayroll = async (e) => {
    e.preventDefault();
    if (!selectedTrainerForPayroll) return;

    const commissionAmount = (Number(calcBaseSalary) * (Number(selectedTrainerForPayroll.commissionRate || 0) / 100));
    const netSalary = (Number(calcBaseSalary) + commissionAmount + Number(calcBonus)) - Number(calcDeduction);

    const payload = {
      trainerId: selectedTrainerForPayroll.id,
      trainerName: selectedTrainerForPayroll.fullName,
      period: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      baseSalary: Number(calcBaseSalary),
      activeClientsCount: 0,
      ptCommissionRate: Number(selectedTrainerForPayroll.commissionRate || 0),
      totalCommission: commissionAmount,
      bonus: Number(calcBonus),
      deduction: Number(calcDeduction),
      netPayable: netSalary,
      status: 'Paid',
      paymentDate: new Date().toISOString(),
      paymentMode
    };

    try {
      const savedRecord = await savePayrollEntry(payload);
      setToastMessage(`Payroll paid ${formatPKR(netSalary)} to ${selectedTrainerForPayroll.fullName}! 🎉`);
      setShowPayrollModal(false);
      setSelectedSalarySlip(savedRecord);
      await loadPayrollsData();
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-emerald-600/20"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="text-white/80 hover:text-white">✕</button>
        </motion.div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
            OWNER STAFF PORTAL
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Staff & Trainer Management</h2>
          <p className="text-xs text-slate-500">Manage gym trainers, base salaries, commissions, and monthly payroll payouts in PKR.</p>
        </div>

        <button
          onClick={() => {
            setFullName('');
            setPhone('');
            setCnic('');
            setBaseSalary(40000);
            setCommissionRate(5);
            setShowTrainerModal(true);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" /> Add Trainer / Staff
        </button>
      </div>

      {/* Trainers Roster Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading real-time trainers roster...</div>
      ) : trainers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trainers.map((t) => (
            <div key={t.id} className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Avatar name={t.fullName} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-slate-900 truncate">{t.fullName}</h4>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" /> {t.phone || '0300-0000000'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">CNIC: {t.cnic || 'N/A'}</p>
                  </div>
                </div>

                <button
                  onClick={() => setDeletingTrainerId(t.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Remove Trainer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 text-xs">
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-zinc-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Base Salary</span>
                  <span className="font-extrabold text-slate-900">{formatPKR(t.baseSalary)}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-zinc-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Commission Rate</span>
                  <span className="font-extrabold text-emerald-600">{t.commissionRate}%</span>
                </div>
              </div>

              <button
                onClick={() => handleOpenPayrollModal(t)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" /> Calculate & Pay Salary
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No staff members registered</h3>
          <p className="text-xs text-slate-500 mt-1">Click "Add Trainer / Staff" to register your gym trainers.</p>
        </div>
      )}

      {/* Paid Payroll Transactions Table */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">Payroll Payout History</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-slate-400 font-bold uppercase text-[10px]">
                <th className="pb-3 pl-2">Trainer</th>
                <th className="pb-3">Period</th>
                <th className="pb-3">Base Salary</th>
                <th className="pb-3">Commission</th>
                <th className="pb-3">Net Paid (PKR)</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-2">Receipt</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {payrolls.length > 0 ? (
                payrolls.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-3 pl-2 font-bold text-slate-900">{p.trainerName}</td>
                    <td className="py-3 text-slate-600">{p.period}</td>
                    <td className="py-3 font-semibold text-slate-800">{formatPKR(p.baseSalary)}</td>
                    <td className="py-3 font-semibold text-emerald-600">{formatPKR(p.totalCommission || 0)}</td>
                    <td className="py-3 font-extrabold text-emerald-700">{formatPKR(p.netPayable)}</td>
                    <td className="py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {p.status} ({p.paymentMode})
                      </span>
                    </td>
                    <td className="py-3 text-right pr-2">
                      <button
                        onClick={() => setSelectedSalarySlip(p)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg flex items-center gap-1 ml-auto"
                      >
                        <Printer className="w-3.5 h-3.5" /> Receipt
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-xs text-slate-400">
                    No payroll payout records logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Trainer Modal */}
      <AnimatePresence>
        {showTrainerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTrainerModal(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md border border-zinc-200 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">Add Staff / Trainer</h3>
                <button onClick={() => setShowTrainerModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddTrainer} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Miller"
                    className="w-full px-3.5 py-2.5 text-xs border border-zinc-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0300-1234567"
                      className="w-full px-3.5 py-2.5 text-xs border border-zinc-200 rounded-xl bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">CNIC / ID</label>
                    <input
                      type="text"
                      value={cnic}
                      onChange={(e) => setCnic(e.target.value)}
                      placeholder="42101-XXXXXXX-X"
                      className="w-full px-3.5 py-2.5 text-xs border border-zinc-200 rounded-xl bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Base Salary (PKR)</label>
                    <input
                      type="number"
                      required
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(e.target.value)}
                      placeholder="40000"
                      className="w-full px-3.5 py-2.5 text-xs font-bold border border-zinc-200 rounded-xl bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Commission Rate (%)</label>
                    <input
                      type="number"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                      placeholder="5"
                      className="w-full px-3.5 py-2.5 text-xs font-bold border border-zinc-200 rounded-xl bg-slate-50 text-emerald-600"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTrainerModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20"
                  >
                    Register Trainer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Calculate & Pay Salary Modal */}
      <AnimatePresence>
        {showPayrollModal && selectedTrainerForPayroll && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPayrollModal(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md border border-zinc-200 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Process Payroll Payout</h3>
                  <p className="text-xs text-slate-500">{selectedTrainerForPayroll.fullName}</p>
                </div>
                <button onClick={() => setShowPayrollModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProcessPayroll} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Base Salary (PKR)</label>
                    <input
                      type="number"
                      required
                      value={calcBaseSalary}
                      onChange={(e) => setCalcBaseSalary(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-bold border border-zinc-200 rounded-xl bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bonus / Performance (PKR)</label>
                    <input
                      type="number"
                      value={calcBonus}
                      onChange={(e) => setCalcBonus(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-bold border border-zinc-200 rounded-xl bg-slate-50 text-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Deductions (PKR)</label>
                    <input
                      type="number"
                      value={calcDeduction}
                      onChange={(e) => setCalcDeduction(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-bold border border-zinc-200 rounded-xl bg-slate-50 text-rose-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-bold border border-zinc-200 rounded-xl bg-slate-50"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Net Salary Payout</span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    {formatPKR(
                      (Number(calcBaseSalary) + (Number(calcBaseSalary) * (Number(selectedTrainerForPayroll.commissionRate || 0) / 100)) + Number(calcBonus)) - Number(calcDeduction)
                    )}
                  </span>
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPayrollModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20"
                  >
                    Confirm & Print Receipt
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SalarySlipModal
        isOpen={Boolean(selectedSalarySlip)}
        onClose={() => setSelectedSalarySlip(null)}
        payrollData={selectedSalarySlip}
      />

      <PinConfirmModal
        isOpen={Boolean(deletingTrainerId)}
        onClose={() => setDeletingTrainerId(null)}
        onConfirm={handleDeleteTrainerConfirm}
        title="Remove Staff / Trainer"
        description="Are you sure you want to remove this trainer from the staff database?"
      />
    </div>
  );
};

export default Staff;
