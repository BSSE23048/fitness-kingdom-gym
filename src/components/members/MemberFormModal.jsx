import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Calendar, DollarSign, Phone, Shield, Dumbbell } from 'lucide-react';
import { calculateEndDate } from '../../services/memberService';

const MemberFormModal = ({ isOpen, onClose, onSubmit, initialData = null }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [cnicOrId, setCnicOrId] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [membershipType, setMembershipType] = useState('Quarterly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [feeAmount, setFeeAmount] = useState(350);
  const [admissionFeePaid, setAdmissionFeePaid] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [assignedTrainerId, setAssignedTrainerId] = useState('demo-trainer-uid-002');
  const [assignedTrainerName, setAssignedTrainerName] = useState('Sarah Miller');
  const [loading, setLoading] = useState(false);

  // Validation Error States
  const [phoneError, setPhoneError] = useState('');
  const [cnicError, setCnicError] = useState('');

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

  // Auto-calculate end date & pricing when start date or plan changes
  useEffect(() => {
    if (startDate && membershipType) {
      const computed = calculateEndDate(startDate, membershipType);
      setEndDate(computed);

      // Default plan pricing suggestions
      if (!initialData) {
        switch (membershipType) {
          case 'Monthly':
            setFeeAmount(120);
            break;
          case 'Quarterly':
            setFeeAmount(320);
            break;
          case 'Half-Yearly':
            setFeeAmount(600);
            break;
          case 'Annual':
            setFeeAmount(1100);
            break;
          default:
            setFeeAmount(120);
        }
      }
    }
  }, [startDate, membershipType, initialData]);

  // Pre-fill fields if editing existing member
  useEffect(() => {
    if (initialData) {
      setFullName(initialData.fullName || '');
      setPhone(initialData.phone || '');
      setEmergencyContact(initialData.emergencyContact || '');
      setCnicOrId(initialData.cnicOrId || '');
      setGender(initialData.gender || 'Male');
      setDob(initialData.dob || '');
      setMembershipType(initialData.membershipType || 'Quarterly');
      setStartDate(initialData.startDate || new Date().toISOString().split('T')[0]);
      setEndDate(initialData.endDate || '');
      setFeeAmount(initialData.feeAmount || 350);
      setAdmissionFeePaid(initialData.admissionFeePaid ?? true);
      setDiscount(initialData.discount || 0);
      setAssignedTrainerId(initialData.assignedTrainerId || 'demo-trainer-uid-002');
      setAssignedTrainerName(initialData.assignedTrainerName || 'Sarah Miller');
    }
  }, [initialData]);

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
      membershipType,
      startDate,
      endDate,
      feeAmount: Number(feeAmount),
      admissionFeePaid,
      discount: Number(discount),
      assignedTrainerId,
      assignedTrainerName
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const trainersList = [
    { id: 'demo-trainer-uid-002', name: 'Sarah Miller (Senior Head Trainer)' },
    { id: 'demo-trainer-uid-003', name: 'David Chen (CrossFit Coach)' },
    { id: 'demo-trainer-uid-004', name: 'Elena Rostova (Strength Coach)' }
  ];

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

          {/* Slide-over Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-xl bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                    {initialData ? 'Edit Member Profile' : 'Add New Gym Member'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enter member credentials & membership plan options.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Personal Information Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Personal Identity Information
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                      className={`w-full px-3.5 py-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 ${
                        phoneError
                          ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-900 bg-rose-50/20'
                          : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
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
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                      className={`w-full px-3.5 py-2.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 ${
                        cnicError
                          ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-900 bg-rose-50/20'
                          : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
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
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Membership & Trainer Assignment */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Plan & Trainer Assignment
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Membership Plan</label>
                    <select
                      value={membershipType}
                      onChange={(e) => setMembershipType(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="Monthly">Monthly Plan (1 Month)</option>
                      <option value="Quarterly">Quarterly Plan (3 Months)</option>
                      <option value="Half-Yearly">Half-Yearly Plan (6 Months)</option>
                      <option value="Annual">Annual Plan (12 Months)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Trainer</label>
                    <select
                      value={assignedTrainerId}
                      onChange={(e) => {
                        setAssignedTrainerId(e.target.value);
                        const selected = trainersList.find(t => t.id === e.target.value);
                        if (selected) setAssignedTrainerName(selected.name.split(' (')[0]);
                      }}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      {trainersList.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Auto End Date</label>
                    <input
                      type="date"
                      disabled
                      value={endDate}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-100 font-bold text-indigo-700 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Financials & Billing */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Billing & Fee Structure
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Amount ($)</label>
                    <input
                      type="number"
                      required
                      value={feeAmount}
                      onChange={(e) => setFeeAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Discount ($)</label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={admissionFeePaid}
                        onChange={(e) => setAdmissionFeePaid(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span>Admission Paid</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all hover:scale-[1.01]"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{initialData ? 'Save Changes' : 'Register Member'}</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MemberFormModal;
