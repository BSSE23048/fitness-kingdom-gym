import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Trash2,
  AlertCircle 
} from 'lucide-react';
import { updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { 
  fetchPlans, 
  addPlan, 
  updatePlan, 
  deletePlan,
  fetchGeneralSettings, 
  updateGeneralSettings 
} from '../../services/planService';
import { formatPKR } from '../../utils/formatters';
import PinConfirmModal from '../common/PinConfirmModal';

const SettingsView = () => {
  const { userData } = useAuth();

  const [plans, setPlans] = useState([]);
  const [generalSettings, setGeneralSettings] = useState({ defaultAdmissionFee: 2000 });
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Plan modal & Delete state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletingPlanId, setDeletingPlanId] = useState(null);
  
  const [planName, setPlanName] = useState('');
  const [durationMonths, setDurationMonths] = useState(1);
  const [defaultPrice, setDefaultPrice] = useState(8000);
  const [description, setDescription] = useState('');

  // Admission fee settings state
  const [admissionFeeInput, setAdmissionFeeInput] = useState(2000);
  const [savingSettings, setSavingSettings] = useState(false);

  // Security / Password state
  const [displayName, setDisplayName] = useState(userData?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [updatingAuth, setUpdatingAuth] = useState(false);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      const [plansData, settingsData] = await Promise.all([
        fetchPlans(),
        fetchGeneralSettings()
      ]);
      setPlans(plansData);
      setGeneralSettings(settingsData);
      setAdmissionFeeInput(settingsData.defaultAdmissionFee || 2000);
      setDisplayName(userData?.displayName || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Plan Save Handler
  const handleSavePlan = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, {
          planName,
          durationMonths: Number(durationMonths),
          defaultPrice: Number(defaultPrice),
          description
        });
        setToastMessage(`Plan "${planName}" updated! ✨`);
      } else {
        await addPlan({
          planName,
          durationMonths: Number(durationMonths),
          defaultPrice: Number(defaultPrice),
          isActive: true,
          description
        });
        setToastMessage(`New Plan "${planName}" created! ✨`);
      }
      setShowPlanModal(false);
      await loadSettingsData();
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  // Plan Delete Handler (PIN Protected)
  const handleDeletePlanConfirm = async () => {
    if (!deletingPlanId) return;
    try {
      await deletePlan(deletingPlanId);
      setDeletingPlanId(null);
      setToastMessage('Membership plan removed from database.');
      await loadSettingsData();
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePlanActive = async (plan) => {
    try {
      await updatePlan(plan.id, { isActive: !plan.isActive });
      await loadSettingsData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGeneralSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateGeneralSettings({
        defaultAdmissionFee: Number(admissionFeeInput)
      });
      setToastMessage('Default Admission Fee updated to ' + formatPKR(admissionFeeInput) + '! ✨');
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateSecurity = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword && newPassword !== confirmPassword) {
      return setPasswordError('New passwords do not match.');
    }

    if (newPassword && newPassword.length < 6) {
      return setPasswordError('Password must be at least 6 characters.');
    }

    setUpdatingAuth(true);

    try {
      const activeFirebaseUser = auth.currentUser;

      if (activeFirebaseUser) {
        if (newPassword) {
          if (!currentPassword) {
            setUpdatingAuth(false);
            return setPasswordError('Please enter your current password to authorize password update.');
          }
          const credential = EmailAuthProvider.credential(activeFirebaseUser.email, currentPassword);
          await reauthenticateWithCredential(activeFirebaseUser, credential);
          await updatePassword(activeFirebaseUser, newPassword);
        }

        if (displayName && displayName !== activeFirebaseUser.displayName) {
          await updateProfile(activeFirebaseUser, { displayName });
          await setDoc(doc(db, 'users', activeFirebaseUser.uid), { displayName, email: activeFirebaseUser.email, role: 'OWNER' }, { merge: true });
          localStorage.setItem('fk_owner_name', displayName);
        }

        setPasswordSuccess('Security credentials updated successfully in Firebase Auth & Firestore! 🔒');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordSuccess('Account profile updated successfully! 🔒');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPasswordError('Incorrect current password. Please try again.');
      } else {
        setPasswordError(err.message || 'Failed to update security credentials.');
      }
    } finally {
      setUpdatingAuth(false);
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

      {/* Header */}
      <div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
          OWNER MANAGEMENT CONSOLE
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Gym Plans & Settings Engine</h2>
        <p className="text-xs text-slate-500">Configure pricing deals, global admission fees, and account security credentials.</p>
      </div>

      {/* SECTION 1: Membership Plans Manager */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Membership Pricing Plans</h3>
            <p className="text-xs text-slate-500">Active membership deals available in registration dropdowns</p>
          </div>

          <button
            onClick={() => {
              setEditingPlan(null);
              setPlanName('');
              setDurationMonths(1);
              setDefaultPrice(8000);
              setDescription('');
              setShowPlanModal(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" /> Create New Plan
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`p-5 rounded-3xl border transition-all ${
                p.isActive
                  ? 'bg-slate-50/70 border-zinc-200 hover:border-emerald-300'
                  : 'bg-slate-100/50 border-zinc-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {p.durationMonths} {p.durationMonths === 1 ? 'Month' : 'Months'} Duration
                  </span>
                  <h4 className="text-lg font-extrabold text-slate-900 mt-1">{p.planName}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{p.description || 'Standard membership package'}</p>
                </div>

                <div className="text-right">
                  <span className="text-xl font-extrabold text-slate-900 block">{formatPKR(p.defaultPrice)}</span>
                  <button
                    onClick={() => handleTogglePlanActive(p)}
                    className={`mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      p.isActive
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-200 text-slate-600 border-slate-300'
                    }`}
                  >
                    {p.isActive ? 'Active' : 'Archived'}
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-200 flex items-center justify-between text-xs">
                <button
                  onClick={() => setDeletingPlanId(p.id)}
                  className="text-rose-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>

                <button
                  onClick={() => {
                    setEditingPlan(p);
                    setPlanName(p.planName);
                    setDurationMonths(p.durationMonths);
                    setDefaultPrice(p.defaultPrice);
                    setDescription(p.description || '');
                    setShowPlanModal(true);
                  }}
                  className="font-bold text-emerald-600 hover:underline"
                >
                  Edit Plan →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: General Gym Settings */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Default Admission Fee Configuration</h3>
          <p className="text-xs text-slate-500">Global admission fee automatically pre-populated during new member signup</p>
        </div>

        <form onSubmit={handleSaveGeneralSettings} className="flex items-center gap-4 max-w-md">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Default Admission Fee (PKR)</label>
            <input
              type="number"
              required
              value={admissionFeeInput}
              onChange={(e) => setAdmissionFeeInput(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-bold border border-zinc-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="mt-5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20"
          >
            {savingSettings ? 'Saving...' : 'Save Default'}
          </button>
        </form>
      </div>

      {/* SECTION 3: Security & Credentials */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Account Security & Credentials</h3>
          <p className="text-xs text-slate-500">Update display name or change login password</p>
        </div>

        {passwordSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateSecurity} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-zinc-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password (Required for Password Change)</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 text-xs border border-zinc-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (Leave blank to keep current)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 text-xs border border-zinc-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {newPassword && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-xs border border-zinc-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={updatingAuth}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20"
          >
            {updatingAuth ? 'Updating Security...' : 'Update Security Credentials'}
          </button>
        </form>
      </div>

      {/* Plan Modal */}
      <AnimatePresence>
        {showPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPlanModal(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md border border-zinc-200 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingPlan ? 'Edit Membership Plan' : 'Create Membership Plan'}
                </h3>
                <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g. 3 Months Advance Deal"
                    className="w-full px-3.5 py-2.5 text-xs border border-zinc-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Months)</label>
                    <select
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-bold border border-zinc-200 rounded-xl bg-slate-50"
                    >
                      <option value={1}>1 Month</option>
                      <option value={3}>3 Months</option>
                      <option value={6}>6 Months</option>
                      <option value={12}>12 Months</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Default Price (PKR)</label>
                    <input
                      type="number"
                      required
                      value={defaultPrice}
                      onChange={(e) => setDefaultPrice(e.target.value)}
                      placeholder="20000"
                      className="w-full px-3.5 py-2.5 text-xs font-bold border border-zinc-200 rounded-xl bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Saves Rs. 4,000"
                    className="w-full px-3.5 py-2.5 text-xs border border-zinc-200 rounded-xl bg-slate-50"
                  />
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPlanModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20"
                  >
                    Save Plan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Plan Owner PIN Modal */}
      <PinConfirmModal
        isOpen={Boolean(deletingPlanId)}
        onClose={() => setDeletingPlanId(null)}
        onConfirm={handleDeletePlanConfirm}
        title="Delete Membership Plan"
        description="Are you sure you want to remove this membership plan from Firestore?"
      />
    </div>
  );
};

export default SettingsView;
