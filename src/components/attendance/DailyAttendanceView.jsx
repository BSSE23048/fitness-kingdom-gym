import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CalendarCheck, 
  Search, 
  Check, 
  X, 
  Save, 
  Users, 
  CheckCircle2,
  UserCheck
} from 'lucide-react';
import { fetchMembers } from '../../services/memberService';
import { fetchDailyAttendanceSheet, saveDailyAttendanceSheet } from '../../services/attendanceService';
import Avatar from '../common/Avatar';

const DailyAttendanceView = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [members, setMembers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({}); // { memberId: 'Present' | 'Absent' }
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadAttendanceData();
  }, [selectedDate]);

  const loadAttendanceData = async () => {
    setLoading(true);
    try {
      const [membersData, sheetData] = await Promise.all([
        fetchMembers(),
        fetchDailyAttendanceSheet(selectedDate)
      ]);

      const activeOnly = membersData.filter(m => m.status === 'Active' || m.status === 'Expiring Soon');
      setMembers(activeOnly);

      const existingRecords = sheetData.records || {};
      const initialMap = {};
      activeOnly.forEach(m => {
        initialMap[m.id] = existingRecords[m.id] || 'Absent';
      });
      setAttendanceRecords(initialMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle member status
  const handleToggleMember = (memberId) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [memberId]: prev[memberId] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  // Bulk action: Mark All Present
  const handleMarkAllPresent = () => {
    const updated = {};
    members.forEach(m => {
      updated[m.id] = 'Present';
    });
    setAttendanceRecords(updated);
    setToastMessage('All active members marked Present! Click "Save Attendance Sheet" to save.');
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Save Attendance Sheet to Firestore
  const handleSaveSheet = async () => {
    setSaving(true);
    try {
      await saveDailyAttendanceSheet(selectedDate, attendanceRecords, 'Reception Desk');
      setToastMessage(`Daily Attendance Sheet for ${selectedDate} saved to database! ✅`);
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filteredMembers = members.filter(m => 
    m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone.includes(searchTerm) ||
    m.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Counter Bar Math
  const presentCount = Object.values(attendanceRecords).filter(v => v === 'Present').length;
  const absentCount = members.length - presentCount;

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

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
            RECEPTION PAPER-DESK SYNC
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Daily Attendance Sheet</h2>
          <p className="text-xs text-slate-500">Fast sign-in logger for front-desk paper sheet synchronization.</p>
        </div>

        {/* Date Selector & Save Action */}
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-2 text-xs font-bold border border-zinc-200 rounded-xl bg-white text-slate-800"
          />

          <button
            onClick={handleSaveSheet}
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Attendance Sheet'}</span>
          </button>
        </div>
      </div>

      {/* Top Counter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-extrabold">
              {presentCount}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">Present Today</span>
              <span className="text-[10px] text-slate-400">Signed physical paper sheet</span>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-200"></div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-extrabold">
              {absentCount}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">Absent Today</span>
              <span className="text-[10px] text-slate-400">Not checked-in yet</span>
            </div>
          </div>
        </div>

        {/* Search & Bulk Action */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search member by name..."
              className="pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none"
            />
          </div>

          <button
            onClick={handleMarkAllPresent}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-emerald-200"
          >
            <UserCheck className="w-4 h-4" />
            <span>Mark All Present</span>
          </button>
        </div>
      </div>

      {/* Member Attendance Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading active member roster...</div>
      ) : filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMembers.map((m) => {
            const isPresent = attendanceRecords[m.id] === 'Present';
            return (
              <div
                key={m.id}
                onClick={() => handleToggleMember(m.id)}
                className={`p-4 rounded-3xl border transition-all cursor-pointer select-none flex items-center justify-between ${
                  isPresent
                    ? 'bg-emerald-50/60 border-emerald-300 shadow-sm'
                    : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={m.fullName} size="md" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">{m.fullName}</h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{m.id}</p>
                  </div>
                </div>

                <button
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold transition-all ${
                    isPresent
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {isPresent ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No active members found</h3>
          <p className="text-xs text-slate-500 mt-1">Register new members in the CRM module to enable daily attendance tracking.</p>
        </div>
      )}
    </div>
  );
};

export default DailyAttendanceView;
