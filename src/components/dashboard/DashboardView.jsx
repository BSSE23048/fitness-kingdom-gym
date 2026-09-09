import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import {
  TrendingUp,
  Users,
  DollarSign,
  ArrowUpRight,
  Activity,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchMembers, getDaysRemaining } from '../../services/memberService';
import { fetchExpenses, fetchPayrolls, fetchPayments } from '../../services/financialService';
import { DashboardSkeleton } from '../ui/Skeleton';
import Avatar from '../common/Avatar';
import { formatPKR } from '../../utils/formatters';
import { MONTH_OPTIONS, DEFAULT_MONTH } from '../../utils/dateUtils';

const DashboardView = () => {
  const { userData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [payments, setPayments] = useState([]);

  // Month & Year Selector State
  const [selectedPeriod, setSelectedPeriod] = useState(DEFAULT_MONTH); // YYYY-MM

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [membersData, expData, payData, paymentData] = await Promise.all([
        fetchMembers(),
        fetchExpenses(),
        fetchPayrolls(),
        fetchPayments()
      ]);

      setMembers(membersData);
      setExpenses(expData);
      setPayrolls(payData);
      setPayments(paymentData);
    } catch (err) {
      console.error('Failed loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  // Formula for Selected Month Revenue:
  const monthlyFeePayments = payments.filter(
    p => p.type === 'MONTHLY_FEE' && p.month === selectedPeriod
  );

  const admissionFeePayments = payments.filter(
    p => p.type === 'ADMISSION_FEE' && p.date && p.date.startsWith(selectedPeriod)
  );

  const filteredPayments = [...monthlyFeePayments, ...admissionFeePayments];

  const filteredExpenses = expenses.filter(
    e => e.date && e.date.startsWith(selectedPeriod)
  );

  const filteredMembers = members.filter(
    m => m.createdAt && m.createdAt.startsWith(selectedPeriod)
  );

  // Dynamic Real-Cash Monthly Math in PKR
  const newRegistrationsCount = filteredMembers.length;
  
  const admissionsRevenue = admissionFeePayments.reduce((acc, curr) => acc + Number(curr.netAmountPaid || curr.amount || 0), 0);
  const mrr = monthlyFeePayments.reduce((acc, curr) => acc + Number(curr.netAmountPaid || curr.amount || 0), 0);
  const totalGrossRevenue = admissionsRevenue + mrr;

  const totalOperatingExpenses = filteredExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalPaidPayroll = payrolls.filter(p => p.status === 'Paid').reduce((acc, curr) => acc + Number(curr.netPayable || 0), 0);
  
  const netGymProfit = totalGrossRevenue - (totalOperatingExpenses + totalPaidPayroll);

  // Expiring Members within 7 days
  const expiringWithin7Days = members.filter(m => {
    const days = getDaysRemaining(m.endDate);
    return days >= 0 && days <= 7;
  });

  // Recharts Datasets (Daily Revenue vs Expense for selected month)
  const dailyDataMap = {};
  filteredPayments.forEach(p => {
    const day = p.date ? p.date.slice(-2) : '01';
    if (!dailyDataMap[day]) dailyDataMap[day] = { day: `Day ${day}`, revenue: 0, expenses: 0 };
    dailyDataMap[day].revenue += Number(p.netAmountPaid || p.amount || 0);
  });
  filteredExpenses.forEach(e => {
    const day = e.date ? e.date.slice(-2) : '01';
    if (!dailyDataMap[day]) dailyDataMap[day] = { day: `Day ${day}`, revenue: 0, expenses: 0 };
    dailyDataMap[day].expenses += Number(e.amount || 0);
  });

  const dailyChartData = Object.values(dailyDataMap).sort((a, b) => a.day.localeCompare(b.day));
  if (dailyChartData.length === 0) {
    dailyChartData.push({ day: 'Selected Period', revenue: totalGrossRevenue, expenses: totalOperatingExpenses });
  }

  // Expense breakdown Donut chart dataset
  const expenseBreakdownData = filteredExpenses.length > 0 ? filteredExpenses.map((e, idx) => ({
    name: e.title || e.category,
    value: Number(e.amount),
    color: ['#10b981', '#059669', '#047857', '#34d399', '#6ee7b7'][idx % 5]
  })) : [];

  return (
    <div className="space-y-6">
      {/* Top Banner with Month Selector */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              REAL-CASH FINANCIAL HUB
            </span>
            <span className="text-slate-400 text-xs">• Fitness Kingdom Gym</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">
            Welcome to Fitness Kingdom Gym, {userData?.displayName || 'Owner'}! 👋
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
            Real-time monthly revenue streams, confirmed fee collections, overheads, and net profit calculations in PKR.
          </p>
        </div>

        {/* Chronological Month Selector Dropdown */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400 ml-2" />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-transparent text-white font-bold text-xs py-1.5 pr-3 focus:outline-none cursor-pointer"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value} className="text-slate-900">
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Monthly Dynamic KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="New Registrations"
          value={`${newRegistrationsCount} Members`}
          trend="Joined This Month"
          trendUp={true}
          icon={Users}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          title="Admissions Revenue"
          value={formatPKR(admissionsRevenue)}
          trend="Confirmed Admission Fees"
          trendUp={true}
          icon={DollarSign}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          title="Paid Gross Revenue"
          value={formatPKR(totalGrossRevenue)}
          trend="Admissions + MRR"
          trendUp={true}
          icon={TrendingUp}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          title="Net Gym Profit"
          value={formatPKR(netGymProfit)}
          trend="Revenue - (Expenses + Payroll)"
          trendUp={netGymProfit >= 0}
          icon={Activity}
          iconBg="bg-slate-900 text-white"
        />
      </div>

      {/* Recharts Financial Bar Chart & Expense Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Revenue vs Expense Bar Chart */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Daily Financial Breakdown ({selectedPeriod})</h3>
              <p className="text-xs text-slate-500">Confirmed revenue collections vs operational expenses in PKR</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Expenses</span>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expenses" fill="#f43f5e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Donut Chart */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Expense Distribution ({selectedPeriod})</h3>
            <p className="text-xs text-slate-500">Overhead expense breakdown in PKR</p>
          </div>

          {expenseBreakdownData.length > 0 ? (
            <>
              <div className="h-52 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseBreakdownData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={5} dataKey="value">
                      {expenseBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {expenseBreakdownData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 truncate">{item.name}:</span>
                    <strong className="text-slate-800">{formatPKR(item.value)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-zinc-100">
              No operational expenses logged for this month.
            </div>
          )}
        </div>
      </div>

      {/* Expiring Memberships Alert Widget */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Expiring Within 7 Days
          </h3>
          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
            {expiringWithin7Days.length} Members
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {expiringWithin7Days.length > 0 ? (
            expiringWithin7Days.map((m) => {
              const daysLeft = getDaysRemaining(m.endDate);
              return (
                <div key={m.id} className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.fullName} size="sm" />
                    <div>
                      <p className="font-bold text-slate-800 leading-tight">{m.fullName}</p>
                      <p className="text-[10px] text-slate-500">{m.phone}</p>
                    </div>
                  </div>
                  <span className="font-bold text-amber-700 bg-white px-2 py-0.5 rounded-lg border border-amber-200 text-[10px]">
                    {daysLeft} Days Left
                  </span>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
              No memberships expiring within the next 7 days! ✨
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, trend, trendUp, icon: Icon, iconBg }) => (
  <motion.div
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-slate-500">{title}</span>
      <div className={`p-2 rounded-2xl ${iconBg} shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight break-words">{value}</h3>
    <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-emerald-600">
      <ArrowUpRight className="w-3.5 h-3.5" />
      <span>{trend}</span>
    </div>
  </motion.div>
);

export default DashboardView;
