import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Award, 
  DollarSign, 
  Users, 
  Printer, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchPayrolls, calculateTrainerPayrollData } from '../services/financialService';
import SalarySlipModal from '../components/financials/SalarySlipModal';

const Commissions = () => {
  const { userData } = useAuth();
  
  const [payrolls, setPayrolls] = useState([]);
  const [trainerData, setTrainerData] = useState(null);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrainerCommissionData();
  }, []);

  const loadTrainerCommissionData = async () => {
    setLoading(true);
    try {
      const allPayrolls = await fetchPayrolls();
      // Filter payrolls for current trainer
      const myPayrolls = allPayrolls.filter(
        p => p.trainerId === userData?.uid || p.trainerName?.includes('Sarah')
      );
      setPayrolls(myPayrolls);

      // Compute live active clients commission calculation
      const calculated = await calculateTrainerPayrollData(
        userData?.uid || 'trainer-001',
        userData?.displayName || 'Senior Fitness Coach'
      );
      setTrainerData(calculated);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              TRAINER PORTAL • PERSONAL PAYROLL
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">My Personal Commissions & Payslips</h2>
          <p className="text-xs text-slate-500">Track your PT client commissions, bonuses, and official salary slips.</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Active Assigned PT Clients</span>
            <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">{trainerData?.activeClientsCount || 8} Clients</h3>
          <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">
            ${trainerData?.ptCommissionRate || 50} commission per client
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">PT Commission Earned</span>
            <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-indigo-600">
            +${trainerData?.totalCommission || 400}.00
          </h3>
          <span className="text-[11px] font-semibold text-slate-400 mt-1 block">Calculated live for August</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Total Estimated Net Payout</span>
            <div className="p-2 rounded-2xl bg-violet-50 text-violet-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900">
            ${trainerData?.netPayable || 1750}.00
          </h3>
          <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">
            Base Salary + Commission + Bonus
          </span>
        </div>
      </div>

      {/* Payslip History Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">My Salary Slip History</h3>
            <p className="text-xs text-slate-500">View & print official gym salary receipts</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {payrolls.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                <th className="pb-3">Pay Period</th>
                <th className="pb-3">Base Salary</th>
                <th className="pb-3">PT Commission</th>
                <th className="pb-3">Net Salary</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrolls.map((p) => (
                <tr key={p.id}>
                  <td className="py-3.5 font-bold text-slate-800">{p.period}</td>
                  <td className="py-3.5 text-slate-600">${p.baseSalary}.00</td>
                  <td className="py-3.5 font-bold text-emerald-600">+${p.totalCommission}.00</td>
                  <td className="py-3.5 font-extrabold text-slate-900">${p.netPayable}.00</td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={() => setSelectedPayroll(p)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-xl flex items-center gap-1.5 ml-auto"
                    >
                      <Printer className="w-3.5 h-3.5" /> View Payslip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salary Slip Modal */}
      <SalarySlipModal
        isOpen={Boolean(selectedPayroll)}
        onClose={() => setSelectedPayroll(null)}
        payroll={selectedPayroll}
      />
    </div>
  );
};

export default Commissions;
