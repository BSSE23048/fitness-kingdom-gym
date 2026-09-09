import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CalendarCheck, 
  Snowflake, 
  RefreshCw, 
  Clock, 
  Phone, 
  CheckCircle2, 
  Edit3,
  Flame,
  User,
  Save
} from 'lucide-react';
import Avatar from '../common/Avatar';
import { 
  getDaysRemaining, 
  markMemberAttendance, 
  fetchMemberAttendance, 
  freezeMembership, 
  unfreezeMembership,
  renewMembership,
  updateMemberDetails 
} from '../../services/memberService';
import { fetchActivePlans } from '../../services/planService';
import { formatPKR } from '../../utils/formatters';

const MemberDetailModal = ({ isOpen, onClose, member, onMemberUpdated }) => {
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Modals for Freeze, Unfreeze, Renew & Edit actions
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Edit fields
  const [editPhone, setEditPhone] = useState('');
  const [editEmergency, setEditEmergency] = useState('');
  const [editCnic, setEditCnic] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Freezing & Renewal fields
  const [freezeReason, setFreezeReason] = useState('Travel / Vacations');
  const [activePlans, setActivePlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [renewPlanName, setRenewPlanName] = useState('1 Month Standard');
  const [renewDuration, setRenewDuration] = useState(1);
  const [renewFee, setRenewFee] = useState(8000);

  useEffect(() => {
    if (member && isOpen) {
      loadAttendance();
      loadPlans();
      setEditPhone(member.phone || '');
      setEditEmergency(member.emergencyContact || '');
      setEditCnic(member.cnicOrId || '');
    }
  }, [member, isOpen]);

  const loadPlans = async () => {
    try {
      const plans = await fetchActivePlans();
      setActivePlans(plans);
      if (plans.length > 0) {
        setSelectedPlanId(plans[0].id);
        setRenewPlanName(plans[0].planName);
        setRenewDuration(plans[0].durationMonths);
        setRenewFee(plans[0].defaultPrice);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAttendance = async () => {
    if (!member) return;
    setLoadingAttendance(true);
    try {
      const logs = await fetchMemberAttendance(member.id);
      setAttendanceLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  if (!member) return null;

  const daysRemaining = getDaysRemaining(member.endDate);

  // Dynamic Status Pill Logic
  let statusBadge = {
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500',
    label: `${daysRemaining} Days Remaining (Active)`
  };

  if (member.isFrozen || member.status === 'Frozen') {
    statusBadge = {
      color: 'bg-sky-100 text-sky-800 border-sky-300',
      dot: 'bg-sky-500',
      label: 'Membership Frozen ❄️'
    };
  } else if (daysRemaining < 0 || member.status === 'Expired') {
    statusBadge = {
      color: 'bg-rose-100 text-rose-800 border-rose-300',
      dot: 'bg-rose-500',
      label: `Expired ${Math.abs(daysRemaining)} days ago`
    };
  } else if (daysRemaining <= 10 || member.status === 'Expiring Soon') {
    statusBadge = {
      color: 'bg-amber-100 text-amber-800 border-amber-300',
      dot: 'bg-amber-500',
      label: `Expiring Soon (${daysRemaining} Days Left)`
    };
  }

  // Quick Action Handler: Mark Attendance
  const handleMarkAttendance = async () => {
    try {
      const record = await markMemberAttendance(member.id, member.fullName, 'Reception');
      setAttendanceLogs([record, ...attendanceLogs]);
      setActionMessage('Attendance checked-in for today! ✅');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Action Handler: Freeze Membership
  const handleFreezeConfirm = async () => {
    try {
      await freezeMembership(member.id, freezeReason);
      setShowFreezeModal(false);
      setActionMessage('Membership successfully frozen ❄️');
      onMemberUpdated();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Action Handler: UNFREEZE Membership (Shifts end date forward)
  const handleUnfreezeConfirm = async () => {
    try {
      await unfreezeMembership(member.id);
      setActionMessage('Membership unfrozen & expiry date shifted forward! ⚡');
      onMemberUpdated();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Action Handler: Renew Membership
  const handleRenewConfirm = async () => {
    try {
      await renewMembership(member.id, renewPlanName, renewDuration, renewFee);
      setShowRenewModal(false);
      setActionMessage(`Membership renewed for ${renewPlanName}! 🎉`);
      onMemberUpdated();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Save Edit Profile
  const handleSaveProfileEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await updateMemberDetails(member.id, {
        phone: editPhone,
        emergencyContact: editEmergency,
        cnicOrId: editCnic
      });
      setIsEditMode(false);
      setActionMessage('Member details updated cleanly! ✨');
      onMemberUpdated();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
          />

          {/* Slide-Over Drawer on Desktop / Bottom Sheet on Mobile */}
          <motion.div
            initial={{ y: '100%', x: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: '100%', x: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-xl bg-white h-[90vh] sm:h-full rounded-t-3xl sm:rounded-none shadow-2xl z-10 flex flex-col justify-between overflow-hidden self-end sm:self-auto"
          >
            {/* Mobile Drag Indicator Pill */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

            {/* Top Bar Header */}
            <div className="p-4 sm:p-6 border-b border-zinc-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Member ID:
                </span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                  {member.id}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditMode ? 'Cancel Edit' : 'Edit Profile'}</span>
                </button>

                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Profile Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Notification Banner */}
              {actionMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{actionMessage}</span>
                </motion.div>
              )}

              {/* User Photo & Header Identity */}
              <div className="flex items-start gap-4 p-4 rounded-3xl bg-slate-50 border border-zinc-200">
                <Avatar name={member.fullName} size="xl" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
                    {member.fullName}
                  </h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {member.phone}
                  </p>

                  <div className="mt-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.color}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
                      {statusBadge.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* EDIT MODE FORM */}
              {isEditMode ? (
                <form onSubmit={handleSaveProfileEdit} className="p-4 rounded-3xl bg-slate-50 border border-zinc-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" /> Edit Member Contact Specs
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-zinc-200 rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      value={editEmergency}
                      onChange={(e) => setEditEmergency(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-zinc-200 rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">CNIC / Govt ID</label>
                    <input
                      type="text"
                      value={editCnic}
                      onChange={(e) => setEditCnic(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-zinc-200 rounded-xl bg-white"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="px-4 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20"
                    >
                      {savingEdit ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Quick Action Bar */
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Quick Actions
                  </h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      onClick={handleMarkAttendance}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-105"
                    >
                      <CalendarCheck className="w-5 h-5 mb-1" />
                      <span>Check-In Today</span>
                    </button>

                    {/* FREEZE vs UNFREEZE TOGGLE */}
                    {member.isFrozen || member.status === 'Frozen' ? (
                      <button
                        onClick={handleUnfreezeConfirm}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs transition-all hover:scale-105"
                      >
                        <Sparkles className="w-5 h-5 mb-1 text-emerald-600" />
                        <span>Unfreeze Plan ⚡</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowFreezeModal(true)}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 font-bold text-xs transition-all hover:scale-105"
                      >
                        <Snowflake className="w-5 h-5 mb-1 text-sky-600" />
                        <span>Freeze Plan</span>
                      </button>
                    )}

                    <button
                      onClick={() => setShowRenewModal(true)}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 font-bold text-xs transition-all hover:scale-105"
                    >
                      <RefreshCw className="w-5 h-5 mb-1 text-indigo-600" />
                      <span>Renew Plan</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Detailed Specs Grid in PKR */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-zinc-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Membership Plan</span>
                  <span className="text-sm font-extrabold text-slate-800">{member.membershipType}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-zinc-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Fee Collected</span>
                  <span className="text-sm font-extrabold text-emerald-600">{formatPKR(member.totalPayable || member.netMembershipFee || 8000)}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-zinc-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Start Date</span>
                  <span className="text-xs font-bold text-slate-700">{member.startDate}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-zinc-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Expiration End Date</span>
                  <span className="text-xs font-bold text-slate-700">{member.endDate}</span>
                </div>
              </div>

              {/* Attendance Log History Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" /> Attendance Log History
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {attendanceLogs.length} Check-ins
                  </span>
                </div>

                {loadingAttendance ? (
                  <div className="p-4 text-center text-xs text-slate-400">Loading attendance history...</div>
                ) : attendanceLogs.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {attendanceLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-2xl bg-slate-50 border border-zinc-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{log.dateString}</p>
                            <p className="text-[10px] text-slate-500">Logged by: {log.markedBy}</p>
                          </div>
                        </div>
                        <span className="font-mono text-slate-500 font-semibold">{log.timeString}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-zinc-200 text-center text-xs text-slate-400">
                    No attendance check-ins logged yet for this member.
                  </div>
                )}
              </div>
            </div>

            {/* Freeze Membership Modal */}
            <AnimatePresence>
              {showFreezeModal && (
                <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-3xl p-6 w-full max-w-sm border border-zinc-200 shadow-2xl space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
                        <Snowflake className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900">Freeze Membership</h4>
                        <p className="text-xs text-slate-500">Pause plan duration & billing</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Freezing</label>
                      <select
                        value={freezeReason}
                        onChange={(e) => setFreezeReason(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs border border-zinc-200 rounded-xl bg-slate-50"
                      >
                        <option value="Travel / Vacations">Travel / Vacations</option>
                        <option value="Medical / Injury">Medical / Injury</option>
                        <option value="Work Commitments">Work Commitments</option>
                        <option value="Other Personal Request">Other Personal Request</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={() => setShowFreezeModal(false)}
                        className="px-3.5 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleFreezeConfirm}
                        className="px-4 py-2 bg-sky-600 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20"
                      >
                        Confirm Freeze
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Dynamic Renew Plan Modal (Synced with Firestore plans in PKR) */}
            <AnimatePresence>
              {showRenewModal && (
                <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-3xl p-6 w-full max-w-sm border border-zinc-200 shadow-2xl space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                        <RefreshCw className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900">Renew Membership Plan</h4>
                        <p className="text-xs text-slate-500">Extend subscription in PKR</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Select Configured Plan</label>
                        <select
                          value={selectedPlanId}
                          onChange={(e) => {
                            setSelectedPlanId(e.target.value);
                            const plan = activePlans.find(p => p.id === e.target.value);
                            if (plan) {
                              setRenewPlanName(plan.planName);
                              setRenewDuration(plan.durationMonths);
                              setRenewFee(plan.defaultPrice);
                            }
                          }}
                          className="w-full px-3.5 py-2.5 text-xs font-bold border border-zinc-200 rounded-xl bg-slate-50"
                        >
                          {activePlans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.planName} ({p.durationMonths}m) — {formatPKR(p.defaultPrice)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Renewal Fee (PKR)</label>
                        <input
                          type="number"
                          value={renewFee}
                          onChange={(e) => setRenewFee(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs font-bold border border-zinc-200 rounded-xl bg-slate-50 text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={() => setShowRenewModal(false)}
                        className="px-3.5 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRenewConfirm}
                        className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20"
                      >
                        Confirm Renewal
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MemberDetailModal;
