import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Award, CheckCircle2, Printer } from 'lucide-react';
import { fetchTrainers } from '../../services/trainerService';
import { fetchPayrolls } from '../../services/financialService';
import { formatPKR } from '../../utils/formatters';

const PayrollModal = ({ isOpen, onClose, onProcessPayout, onPrintSlip }) => {
  const [trainers, setTrainers] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, pData] = await Promise.all([
        fetchTrainers(),
        fetchPayrolls()
      ]);
      setTrainers(tData);
      setPayrolls(pData);
      if (tData.length > 0) {
        setSelectedTrainer(tData[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-3xl p-6 w-full max-w-lg border border-zinc-200 shadow-2xl z-10 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900">Trainer Payroll Console</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading payroll database...</div>
          ) : trainers.length > 0 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Trainer / Staff Member</label>
                <select
                  value={selectedTrainer?.id || ''}
                  onChange={(e) => {
                    const found = trainers.find(t => t.id === e.target.value);
                    setSelectedTrainer(found);
                  }}
                  className="w-full px-3.5 py-2.5 text-xs font-bold border border-zinc-200 rounded-xl bg-slate-50 text-slate-900"
                >
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} (Base: {formatPKR(t.baseSalary)} • {t.commissionRate}% PT)
                    </option>
                  ))}
                </select>
              </div>

              {selectedTrainer && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-zinc-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Base Monthly Salary:</span>
                    <span className="font-bold text-slate-800">{formatPKR(selectedTrainer.baseSalary)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">PT Commission Rate:</span>
                    <span className="font-bold text-emerald-600">{selectedTrainer.commissionRate}%</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Total Net Salary:</span>
                    <span className="text-base font-extrabold text-emerald-600">{formatPKR(selectedTrainer.baseSalary)}</span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No staff members registered. Please add staff in the Staff section first.
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PayrollModal;
