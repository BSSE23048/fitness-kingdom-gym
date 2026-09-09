import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Calendar, Tag, ShieldCheck, DollarSign } from 'lucide-react';
import { fetchActivePlans, fetchGeneralSettings } from '../../services/planService';
import { calculateEndDateByDuration } from '../../services/memberService';
import { formatPKR } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { getOwnerStamp } from '../../utils/auditLogger';

const MemberModal = ({ isOpen, onClose, onSubmit, initialData = null }) => {
  const { userData } = useAuth();

  const [activePlans, setActivePlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [cnicOrId, setCnicOrId] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');

  // Membership & Billing fields (in PKR)
  const [membershipType, setMembershipType] = useState('1 Month Standard');
  const [durationMonths, setDurationMonths] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');

  const [baseFee, setBaseFee] = useState(8000);
  const [discount, setDiscount] = useState(0);
  
  const [admissionFeeAmount, setAdmissionFeeAmount] = useState(2000);
  const [admissionFeeWaived, setAdmissionFeeWaived] = useState(false);
  
  const [loading, setLoading] = useState(false);

  // Validation Error States
  const [phoneError, setPhoneError] = useState('');
  const [cnicError, setCnicError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadInitialModalData();
    }
  }, [isOpen]);

  const sanitizePhone = (val) => {
    if (!val) return '';
    let cleaned = val.replace(/[\s\-\+]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '92' + cleaned.slice(1);
    }
    return cleaned;
  };

  const validatePhone = (val) => {
    const cleaned = sanitizePhone(val);
    if (!/^92\d{10}$/.test(cleaned)) {
      return "Phone number must start with 92 followed by 10 digits (e.g. 923001234567)";
    }
    return "";
  };

  const sanitizeCnic = (val) => {
    if (!val) return '';
    return val.replace(/[\s\-]/g, '');
  };

  const validateCnic = (val) => {
    const cleaned = sanitizeCnic(val);
    if (!/^\d{13}$/.test(cleaned)) {
      return "CNIC must be exactly 13 numeric digits without hyphens";
    }
    return "";
  };

  const loadInitialModalData = async () => {
    if (!initialData) {
      resetFormState();
    }

    try {
      const [plansData, settingsData] = await Promise.all([
        fetchActivePlans(),
        fetchGeneralSettings()
      ]);
      setActivePlans(plansData);

      const defaultFee = settingsData?.defaultAdmissionFee || 2000;
      setAdmissionFeeAmount(defaultFee);

      if (plansData.length > 0 && !initialData) {
        const firstPlan = plansData[0];
        setSelectedPlanId(firstPlan.id);
        setMembershipType(firstPlan.planName);
        setDurationMonths(firstPlan.durationMonths);
        setBaseFee(firstPlan.defaultPrice);
      }
    } catch (err) {
      console.error('Failed loading modal initial data:', err);
    }
  };

  const resetFormState = () => {
    setFullName('');
    setPhone('');
    setEmergencyContact('');
    setCnicOrId('');
    setGender('Male');
    setDob('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setDiscount(0);
    setAdmissionFeeWaived(false);
    setPhoneError('');
    setCnicError('');
  };

  const handlePlanChange = (planId) => {
    setSelectedPlanId(planId);
    const plan = activePlans.find(p => p.id === planId);
    if (plan) {
      setMembershipType(plan.planName);
      setDurationMonths(plan.durationMonths);
      setBaseFee(plan.defaultPrice);
    }
  };

  useEffect(() => {
    if (startDate && durationMonths) {
      const computed = calculateEndDateByDuration(startDate, durationMonths);
      setEndDate(computed);
    }
  }, [startDate, durationMonths]);

  // Financial Math in PKR
  const netMembershipFee = Math.max(0, Number(baseFee) - Number(discount));
  const effectiveAdmissionFee = admissionFeeWaived ? 0 : Number(admissionFeeAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const pErr = validatePhone(phone);
    const cErr = validateCnic(cnicOrId);

    setPhoneError(pErr);
    setCnicError(cErr);

    if (pErr || cErr) {
      return; // Strictly block submission until both validations pass!
    }

    setLoading(true);

    const cleanedPhone = sanitizePhone(phone);
    const cleanedCnic = sanitizeCnic(cnicOrId);

    const payload = {
      fullName,
      phone: cleanedPhone,
      emergencyContact,
      cnicOrId: cleanedCnic,
      gender,
      dob,
      planId: selectedPlanId,
      membershipType,
      durationMonths: Number(durationMonths),
      startDate,
      endDate,
      baseFee: Number(baseFee),
      discount: Number(discount),
      netMembershipFee,
      admissionFeeAmount: Number(admissionFeeAmount),
      admissionFeeWaived,
      recordedBy: getOwnerStamp(userData)
    };

    try {
      await onSubmit(payload);
      resetFormState();
      onClose();
    } catch (err) {
      console.error('Registration submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    resetFormState();
    onClose();
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
            onClick={handleCloseModal}
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

            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-zinc-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                    {initialData ? 'Edit Member Profile' : 'Register New Member'}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500">
                    Fitness Kingdom Gym • Member Profile Setup
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Personal Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Personal & Contact Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Hamza Ali"
                      className="w-full px-3.5 py-2.5 text-base sm:text-xs border border-zinc-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (phoneError) setPhoneError(validatePhone(e.target.value));
                      }}
                      onBlur={(e) => setPhoneError(validatePhone(e.target.value))}
                      placeholder="923001234567"
                      className={`w-full px-3.5 py-2.5 text-base sm:text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 ${
                        phoneError
                          ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-900 bg-rose-50/20'
                          : 'border-zinc-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                      }`}
                    />
                    {phoneError && (
                      <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                        <span>⚠️</span> {phoneError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="0321-9876543"
                      className="w-full px-3.5 py-2.5 text-base sm:text-xs border border-zinc-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">CNIC / Govt ID *</label>
                    <input
                      type="text"
                      required
                      value={cnicOrId}
                      onChange={(e) => {
                        setCnicOrId(e.target.value);
                        if (cnicError) setCnicError(validateCnic(e.target.value));
                      }}
                      onBlur={(e) => setCnicError(validateCnic(e.target.value))}
                      placeholder="3520112345671"
                      className={`w-full px-3.5 py-2.5 text-base sm:text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 ${
                        cnicError
                          ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-900 bg-rose-50/20'
                          : 'border-zinc-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                      }`}
                    />
                    {cnicError && (
                      <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                        <span>⚠️</span> {cnicError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base sm:text-xs border border-zinc-200 rounded-xl bg-slate-50 focus:bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic Plan Selection */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Plan & Duration Selection
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Gym Plan *</label>
                    <select
                      value={selectedPlanId}
                      onChange={(e) => handlePlanChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base sm:text-xs font-bold border border-zinc-200 rounded-xl bg-emerald-50/50 text-emerald-900 focus:bg-white"
                    >
                      {activePlans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.planName} ({p.durationMonths} {p.durationMonths === 1 ? 'Month' : 'Months'}) — Agreed Fee: {formatPKR(p.defaultPrice)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base sm:text-xs border border-zinc-200 rounded-xl bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Calculated Expiry Date</label>
                    <input
                      type="text"
                      disabled
                      value={endDate}
                      className="w-full px-3.5 py-2.5 text-xs font-bold border border-zinc-200 rounded-xl bg-slate-100 text-emerald-700"
                    />
                  </div>
                </div>
              </div>

              {/* Agreed Monthly Rate & Custom Discount */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Agreed Monthly Rate & Admission Charge
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Agreed Monthly Fee (PKR)</label>
                    <input
                      type="number"
                      required
                      value={baseFee}
                      onChange={(e) => setBaseFee(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-bold border border-zinc-200 rounded-xl bg-slate-50 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Discount (PKR)</label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 text-xs border border-zinc-200 rounded-xl bg-slate-50 text-rose-600 font-bold"
                    />
                  </div>
                </div>

                {/* Admission Fee & Waive Off Toggle */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-zinc-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800">One-Time Admission Charge</span>
                      <p className="text-[10px] text-slate-500">Standard fee: {formatPKR(admissionFeeAmount)}</p>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={admissionFeeWaived}
                        onChange={(e) => setAdmissionFeeWaived(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                      />
                      <span className="text-xs font-bold text-emerald-700">Waive Off Admission Fee</span>
                    </label>
                  </div>
                </div>

                {/* Registration Fee Summary Card */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Admission Charge Due Now:</span>
                    <span className={`font-bold ${admissionFeeWaived ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {admissionFeeWaived ? 'Rs. 0 (Waived Off)' : formatPKR(effectiveAdmissionFee)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Agreed Net Monthly Fee:</span>
                    <span className="font-bold text-amber-400">{formatPKR(netMembershipFee)}</span>
                  </div>

                  <p className="text-[10px] text-slate-300 pt-2 border-t border-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Monthly recurring fee starts as <strong className="text-rose-400">UNPAID (Defaulter)</strong> and must be collected in Fee Collection.</span>
                  </p>
                </div>
              </div>

              {/* Submit Actions */}
              <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20"
                >
                  {loading ? 'Creating Profile...' : 'Register Member Profile'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MemberModal;
