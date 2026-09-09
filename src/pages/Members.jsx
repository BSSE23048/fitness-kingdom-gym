import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  Plus, 
  CalendarCheck, 
  Eye, 
  CheckCircle2, 
  UserCheck, 
  AlertTriangle, 
  Snowflake,
  ArrowUpDown,
  Trash2,
  Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  fetchMembers, 
  addMember, 
  deleteMember,
  getDaysRemaining, 
  markMemberAttendance 
} from '../services/memberService';
import MemberRegistrationModal from '../components/members/MemberRegistrationModal';
import MemberDetailModal from '../components/members/MemberDetailModal';
import Avatar from '../components/common/Avatar';
import { formatPKR } from '../utils/formatters';
import { exportToCSV } from '../utils/csvExporter';
import PinConfirmModal from '../components/common/PinConfirmModal';

const Members = () => {
  const { isOwner } = useAuth();
  
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Searching
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMemberForDetail, setSelectedMemberForDetail] = useState(null);
  const [deletingMemberId, setDeletingMemberId] = useState(null);

  // Banner toast state
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadMembersData();

    const handleOpenAddModal = () => setIsFormOpen(true);
    window.addEventListener('open-add-member-modal', handleOpenAddModal);
    return () => window.removeEventListener('open-add-member-modal', handleOpenAddModal);
  }, []);

  const loadMembersData = async () => {
    setLoading(true);
    try {
      const data = await fetchMembers();
      setMembers(data);
    } catch (err) {
      console.error('Failed loading members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterMember = async (payload) => {
    try {
      const newMember = await addMember(payload);
      const admissionMsg = newMember.admissionFee > 0 
        ? `Admission Fee logged: ${formatPKR(newMember.admissionFee)}.` 
        : 'Admission Fee waived off.';
      setToastMessage(`Member ${newMember.fullName} registered as ${newMember.id}! ${admissionMsg} Monthly fee is UNPAID until collected in Fee Collection. ✨`);
      await loadMembersData();
      setTimeout(() => setToastMessage(''), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMemberConfirm = async () => {
    if (!deletingMemberId) return;
    try {
      await deleteMember(deletingMemberId);
      setDeletingMemberId(null);
      setSelectedMemberForDetail(null);
      setToastMessage('Member record deleted permanently.');
      await loadMembersData();
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickCheckIn = async (member, e) => {
    e.stopPropagation();
    try {
      await markMemberAttendance(member.id, member.fullName, 'Reception Quick Action');
      setToastMessage(`Attendance checked-in for ${member.fullName}! ✅`);
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter & Search computation
  const filteredMembers = members.filter((m) => {
    const matchesSearch = 
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
    const matchesPlan = planFilter === 'All' || m.membershipType === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
    if (sortBy === 'endDate') return new Date(a.endDate) - new Date(b.endDate);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Calculate Metrics
  const activeCount = members.filter(m => m.status === 'Active').length;
  const expiringCount = members.filter(m => m.status === 'Expiring Soon').length;
  const frozenCount = members.filter(m => m.status === 'Frozen').length;

  // Client-Side CSV Export Handler for Members CRM Directory
  const handleExportMembersCSV = () => {
    const filename = 'Active_Members_List.csv';
    const headers = [
      'Member ID',
      'Full Name',
      'Phone Number',
      'CNIC / Govt ID',
      'Gender',
      'Membership Plan',
      'Joining Date',
      'Expiry Date',
      'Status',
      'Agreed Monthly Fee (PKR)'
    ];

    const rows = filteredMembers.map(m => [
      m.id || 'N/A',
      m.fullName,
      m.phone,
      m.cnicOrId || 'N/A',
      m.gender || 'Male',
      m.membershipType || '1 Month Standard',
      m.startDate || 'N/A',
      m.endDate || 'N/A',
      m.status || 'Active',
      m.netMembershipFee || (m.baseFee - (m.discount || 0)) || 8000
    ]);

    exportToCSV(filename, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              FITNESS KINGDOM GYM CRM
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Client & Member Management</h2>
          <p className="text-xs text-slate-500">Manage member subscriptions, fee waivers, and attendance check-ins.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportMembersCSV}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 border border-zinc-200 shadow-sm transition-all cursor-pointer"
            title="Export Members Directory to CSV"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Export CSV
          </button>

          {isOwner && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add New Member
            </button>
          )}
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricBadge title="Total Registered" count={members.length} color="bg-slate-900 text-white border-slate-800" icon={Users} />
        <MetricBadge title="Active Members" count={activeCount} color="bg-emerald-50 border-emerald-200 text-emerald-900" icon={UserCheck} />
        <MetricBadge title="Expiring (&lt;10 Days)" count={expiringCount} color="bg-amber-50 border-amber-200 text-amber-900" icon={AlertTriangle} />
        <MetricBadge title="Frozen Subscriptions" count={frozenCount} color="bg-sky-50 border-sky-200 text-sky-900" icon={Snowflake} />
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search member by name, phone, or ID (e.g. FK-001)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 bg-slate-50 p-1 border border-zinc-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border-0 text-xs font-bold text-slate-700 py-1 px-2 rounded-lg focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Expired">Expired</option>
                <option value="Frozen">Frozen</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-slate-50 p-1 border border-zinc-200 rounded-xl">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 ml-2" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border-0 text-xs font-bold text-slate-700 py-1 px-2 rounded-lg focus:outline-none"
              >
                <option value="name">Sort by Name</option>
                <option value="endDate">Sort by Expiration</option>
                <option value="created">Sort by Join Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* DESKTOP & TABLET DATA TABLE (>= 640px) */}
        <div className="hidden sm:block w-full overflow-x-auto shadow-sm rounded-xl border border-zinc-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-slate-400 font-bold uppercase text-[10px]">
                <th className="pb-3 pl-2">Member</th>
                <th className="pb-3">Contact & Gender</th>
                <th className="pb-3">Plan & Expiry</th>
                <th className="pb-3">Days Remaining</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-slate-400">
                    Loading member database from Firestore...
                  </td>
                </tr>
              ) : filteredMembers.length > 0 ? (
                filteredMembers.map((m) => {
                  const days = getDaysRemaining(m.endDate);

                  let pillStyle = "bg-emerald-100 text-emerald-800 border-emerald-200";
                  let statusText = m.status || "Active";
                  if (m.isFrozen || m.status === 'Frozen') {
                    pillStyle = "bg-sky-100 text-sky-800 border-sky-200";
                    statusText = "Frozen ❄️";
                  } else if (days < 0 || m.status === 'Expired') {
                    pillStyle = "bg-rose-100 text-rose-800 border-rose-200";
                    statusText = "Expired";
                  } else if (days <= 10 || m.status === 'Expiring Soon') {
                    pillStyle = "bg-amber-100 text-amber-800 border-amber-200";
                    statusText = "Expiring Soon";
                  }

                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMemberForDetail(m)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 pl-2">
                        <div className="flex items-center gap-3">
                          <Avatar name={m.fullName} size="md" />
                          <div>
                            <p className="font-bold text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors">
                              {m.fullName}
                            </p>
                            <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {m.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <p className="font-medium text-slate-700">{m.phone}</p>
                        <p className="text-[10px] text-slate-400">{m.gender}</p>
                      </td>

                      <td className="py-3.5">
                        <span className="font-bold text-slate-800 block">{m.membershipType}</span>
                        <span className="text-[10px] text-slate-400">Ends: {m.endDate}</span>
                      </td>

                      <td className="py-3.5 font-bold text-slate-700">
                        {m.isFrozen ? "Frozen ❄️" : days < 0 ? `Expired (${Math.abs(days)}d ago)` : `${days} Days Left`}
                      </td>

                      <td className="py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${pillStyle}`}>
                          {statusText}
                        </span>
                      </td>

                      <td className="py-3.5 text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedMemberForDetail(m)}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs min-h-[44px] min-w-[44px] justify-center"
                            title="View / Edit Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeletingMemberId(m.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Delete Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-800">No registered members found</h3>
                    <p className="text-xs text-slate-500 mt-1">Click "Add New Member" to register a client to Fitness Kingdom Gym.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW (< 640px) */}
        <div className="block sm:hidden space-y-3">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Loading member database from Firestore...
            </div>
          ) : filteredMembers.length > 0 ? (
            filteredMembers.map((m) => {
              const days = getDaysRemaining(m.endDate);

              let pillStyle = "bg-emerald-100 text-emerald-800 border-emerald-200";
              let statusText = m.status || "Active";
              if (m.isFrozen || m.status === 'Frozen') {
                pillStyle = "bg-sky-100 text-sky-800 border-sky-200";
                statusText = "Frozen ❄️";
              } else if (days < 0 || m.status === 'Expired') {
                pillStyle = "bg-rose-100 text-rose-800 border-rose-200";
                statusText = "Expired";
              } else if (days <= 10 || m.status === 'Expiring Soon') {
                pillStyle = "bg-amber-100 text-amber-800 border-amber-200";
                statusText = "Expiring Soon";
              }

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMemberForDetail(m)}
                  className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-3 active:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.fullName} size="md" />
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{m.fullName}</h4>
                        <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {m.id}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${pillStyle}`}>
                      {statusText}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Phone</span>
                      <span className="font-semibold text-slate-700">{m.phone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Plan</span>
                      <span className="font-bold text-slate-800">{m.membershipType}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Expires</span>
                      <span className="text-slate-600 font-medium">{m.endDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Validity</span>
                      <span className="font-extrabold text-emerald-700">
                        {m.isFrozen ? "Frozen ❄️" : days < 0 ? `Expired (${Math.abs(days)}d ago)` : `${days} Days Left`}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleQuickCheckIn(m, e)}
                      className="flex-1 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CalendarCheck className="w-4 h-4" /> Check-in
                    </button>
                    <button
                      onClick={() => setSelectedMemberForDetail(m)}
                      className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" /> Profile
                    </button>
                    {isOwner && (
                      <button
                        onClick={() => setDeletingMemberId(m.id)}
                        className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                        title="Delete Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No registered members found.
            </div>
          )}
        </div>
      </div>

      {/* Smart Member Registration Drawer */}
      <MemberRegistrationModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleRegisterMember}
      />

      {/* Member Profile Detail Drawer */}
      <MemberDetailModal
        isOpen={Boolean(selectedMemberForDetail)}
        onClose={() => setSelectedMemberForDetail(null)}
        member={selectedMemberForDetail}
        onMemberUpdated={loadMembersData}
        onDeleteRequest={(memberId) => setDeletingMemberId(memberId)}
      />

      {/* PIN Confirmation Modal for Deletion */}
      <PinConfirmModal
        isOpen={Boolean(deletingMemberId)}
        onClose={() => setDeletingMemberId(null)}
        onConfirm={handleDeleteMemberConfirm}
        title="Delete Member Record"
        description="Are you sure you want to permanently delete this member record from Firestore?"
      />
    </div>
  );
};

const MetricBadge = ({ title, count, color, icon: Icon }) => (
  <div className={`p-4 rounded-3xl border shadow-sm ${color} flex items-center justify-between`}>
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{title}</p>
      <h3 className="text-2xl font-extrabold mt-0.5">{count}</h3>
    </div>
    <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-sm">
      <Icon className="w-5 h-5" />
    </div>
  </div>
);

export default Members;
