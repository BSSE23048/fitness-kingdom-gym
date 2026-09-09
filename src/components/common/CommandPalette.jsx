import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Users, 
  CreditCard, 
  CalendarCheck, 
  DollarSign, 
  UserCheck, 
  Sliders, 
  LayoutDashboard, 
  Plus, 
  X,
  Command,
  ArrowRight
} from 'lucide-react';
import { fetchMembers } from '../../services/memberService';
import Avatar from './Avatar';

const CommandPalette = ({ isOpen, onClose, onOpenAddMember }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadMembersData();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const loadMembersData = async () => {
    setLoading(true);
    try {
      const data = await fetchMembers();
      setMembers(data);
    } catch (err) {
      console.error('Failed loading members for Command Palette:', err);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard Navigation & Hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Global Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      }

      // Quick Single-Letter Hotkeys when no input query is entered
      if (!query.trim()) {
        if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          navigate('/attendance');
          onClose();
        } else if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          onClose();
          if (onOpenAddMember) onOpenAddMember();
          window.dispatchEvent(new CustomEvent('open-add-member-modal'));
        } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          navigate('/fee-collection');
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, query, navigate, onClose, onOpenAddMember]);

  // Static Navigation Shortcuts
  const navShortcuts = [
    { id: 'nav-dashboard', title: 'Go to Dashboard', icon: LayoutDashboard, action: () => navigate('/dashboard'), badge: 'View' },
    { id: 'nav-members', title: 'Go to Member CRM', icon: Users, action: () => navigate('/members'), badge: 'CRM' },
    { id: 'nav-new-member', title: 'Register New Member', icon: Plus, action: () => { if (onOpenAddMember) onOpenAddMember(); window.dispatchEvent(new CustomEvent('open-add-member-modal')); navigate('/members'); }, badge: 'Press N' },
    { id: 'nav-fee', title: 'Go to Fee Collection & Dues', icon: CreditCard, action: () => navigate('/fee-collection'), badge: 'Press F' },
    { id: 'nav-attendance', title: 'Go to Daily Attendance Check-In', icon: CalendarCheck, action: () => navigate('/attendance'), badge: 'Press A' },
    { id: 'nav-financials', title: 'Go to Financials & Expenses', icon: DollarSign, action: () => navigate('/financials'), badge: 'Ledger' },
    { id: 'nav-staff', title: 'Go to Staff & Trainers', icon: UserCheck, action: () => navigate('/staff'), badge: 'Team' },
    { id: 'nav-settings', title: 'Go to Gym Plans & Settings', icon: Sliders, action: () => navigate('/settings'), badge: 'Admin' }
  ];

  // Member Search Filter
  const filteredMembers = query.trim()
    ? members.filter(m =>
        m.fullName.toLowerCase().includes(query.toLowerCase()) ||
        m.phone.includes(query) ||
        m.id.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  const filteredShortcuts = query.trim()
    ? navShortcuts.filter(s => s.title.toLowerCase().includes(query.toLowerCase()))
    : navShortcuts;

  const handleSelectShortcut = (item) => {
    item.action();
    onClose();
  };

  const handleSelectMember = (member) => {
    navigate('/members');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-3 sm:px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          />

          {/* Command Palette Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden z-10 flex flex-col max-h-[80vh]"
          >
            {/* Input Header */}
            <div className="p-4 border-b border-zinc-100 flex items-center gap-3 bg-slate-50/50">
              <Search className="w-5 h-5 text-emerald-600 shrink-0" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search member by name, phone, FK-ID, or type shortcut..."
                className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-none placeholder:text-slate-400 placeholder:font-medium"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg text-xs"
                >
                  Clear
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1 bg-slate-200 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600">
                <kbd>ESC</kbd>
              </div>
            </div>

            {/* Quick Hotkeys Legend Bar */}
            <div className="px-4 py-2 bg-emerald-900 text-white text-[11px] font-bold flex items-center justify-between overflow-x-auto gap-4 shrink-0">
              <span className="flex items-center gap-1 text-emerald-300">
                <Command className="w-3.5 h-3.5" /> Quick Keybinds:
              </span>
              <div className="flex items-center gap-3 whitespace-nowrap">
                <span><kbd className="bg-emerald-800 px-1.5 py-0.5 rounded text-amber-300">A</kbd> Attendance</span>
                <span><kbd className="bg-emerald-800 px-1.5 py-0.5 rounded text-amber-300">N</kbd> Add Member</span>
                <span><kbd className="bg-emerald-800 px-1.5 py-0.5 rounded text-amber-300">F</kbd> Fee Collection</span>
              </div>
            </div>

            {/* Results Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Member Search Results */}
              {filteredMembers.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block">
                    Matching Members ({filteredMembers.length})
                  </span>
                  {filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectMember(m)}
                      className="w-full p-2.5 rounded-2xl hover:bg-slate-100 flex items-center justify-between text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={m.fullName} size="sm" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                            {m.fullName}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Phone: {m.phone} • Plan: {m.membershipType}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {m.id}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Navigation Shortcuts */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block">
                  Quick Navigation & Actions
                </span>
                {filteredShortcuts.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectShortcut(s)}
                    className="w-full p-2.5 rounded-2xl hover:bg-slate-100 flex items-center justify-between text-left transition-colors cursor-pointer group min-h-[44px]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-600 flex items-center justify-center transition-colors">
                        <s.icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                        {s.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-zinc-200">
                        {s.badge}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-zinc-100 bg-slate-50 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Fitness Kingdom Gym Command Palette</span>
              <span>Use <kbd className="bg-slate-200 px-1 rounded text-slate-600 font-bold">Ctrl+K</kbd> to toggle anytime</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
