import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, CheckCircle2, Flame, Award } from 'lucide-react';
import { formatPKR } from '../../utils/formatters';

const SalarySlipModal = ({ isOpen, onClose, payrollData }) => {
  if (!isOpen || !payrollData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-3xl p-6 w-full max-w-lg border border-zinc-200 shadow-2xl z-10 space-y-6 relative"
        >
          {/* Close & Print Actions Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 print:hidden">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Payroll Salary Receipt
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Slip Document Body */}
          <div className="space-y-6 p-2 text-slate-900 font-sans" id="printable-salary-slip">
            {/* Header Identity */}
            <div className="flex items-start justify-between border-b border-zinc-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 leading-tight">Fitness Kingdom Gym</h2>
                  <p className="text-xs text-slate-500">Official Trainer Salary Payout Receipt</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 block">
                  {payrollData.id}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">Period: {payrollData.period}</span>
              </div>
            </div>

            {/* Trainer Identity */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-zinc-200 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Trainer Name</span>
                <span className="font-extrabold text-slate-900 text-sm block">{payrollData.trainerName}</span>
                <span className="text-slate-500">{payrollData.trainerTitle || 'Senior Coach'}</span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Payment Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 mt-1">
                  <CheckCircle2 className="w-3 h-3" /> Paid ({payrollData.paymentMode || 'Bank'})
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">Date: {payrollData.paymentDate ? payrollData.paymentDate.split('T')[0] : 'Today'}</span>
              </div>
            </div>

            {/* Financial Breakdown Table in PKR */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Financial Breakdown (PKR)</h4>
              
              <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100">
                <div className="p-3 bg-slate-50 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Base Contract Salary:</span>
                  <span className="font-bold text-slate-800">{formatPKR(payrollData.baseSalary)}</span>
                </div>

                {payrollData.totalCommission > 0 && (
                  <div className="p-3 flex items-center justify-between bg-emerald-50/50">
                    <span className="text-emerald-800 font-medium">Personal Training (PT) Commission:</span>
                    <span className="font-bold text-emerald-700">+{formatPKR(payrollData.totalCommission)}</span>
                  </div>
                )}

                {payrollData.bonus > 0 && (
                  <div className="p-3 flex items-center justify-between bg-emerald-50/50">
                    <span className="text-emerald-800 font-medium">Performance Bonus:</span>
                    <span className="font-bold text-emerald-700">+{formatPKR(payrollData.bonus)}</span>
                  </div>
                )}

                {payrollData.deduction > 0 && (
                  <div className="p-3 flex items-center justify-between bg-rose-50/50">
                    <span className="text-rose-800 font-medium">Deductions:</span>
                    <span className="font-bold text-rose-600">-{formatPKR(payrollData.deduction)}</span>
                  </div>
                )}

                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <span className="font-extrabold uppercase tracking-wider text-emerald-400 text-xs">Net Salary Disbursed</span>
                  <span className="text-xl font-extrabold text-emerald-400">{formatPKR(payrollData.netPayable)}</span>
                </div>
              </div>
            </div>

            {/* Signatures Footer */}
            <div className="pt-8 border-t border-zinc-200 grid grid-cols-2 gap-8 text-[11px] text-slate-500">
              <div className="border-t border-slate-300 pt-1 text-center">
                <span>Trainer Signature</span>
              </div>
              <div className="border-t border-slate-300 pt-1 text-center">
                <span>Authorized Owner Stamp</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SalarySlipModal;
