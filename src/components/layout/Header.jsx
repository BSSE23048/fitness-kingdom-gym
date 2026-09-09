import React, { useState } from 'react';
import { 
  Search, 
  ChevronDown, 
  LogOut, 
  ShieldCheck, 
  Sliders,
  Menu,
  Flame
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../common/Avatar';
import { getOwnerDisplayName } from '../../utils/auditLogger';

const Header = ({ sidebarWidth, onOpenMobileMenu, onOpenCommandPalette }) => {
  const { userData, userRole, logout, isOwner } = useAuth();
  const navigate = useNavigate();

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const ownerName = getOwnerDisplayName(userData);

  return (
    <header
      className="fixed top-0 right-0 left-0 lg:left-auto z-30 h-16 bg-white/90 backdrop-blur-md border-b border-zinc-200 px-4 md:px-6 flex items-center justify-between transition-all duration-250"
      style={{ left: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${sidebarWidth}px` : '0px' }}
    >
      {/* Mobile Hamburger & Brand Header (< 1024px) */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-6 h-6 text-slate-800" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-xs leading-tight">
              Fitness <span className="text-emerald-600">Kingdom</span>
            </h1>
            <p className="text-[9px] uppercase font-bold text-slate-400">Owner Console</p>
          </div>
        </div>
      </div>

      {/* Desktop Search Bar with Command Palette trigger */}
      <div className="hidden lg:flex items-center gap-3 w-72 md:w-96">
        <button
          onClick={onOpenCommandPalette}
          className="relative w-full flex items-center bg-slate-100/70 hover:bg-slate-100 border border-zinc-200/60 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-400 transition-all text-left cursor-pointer group"
        >
          <Search className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors mr-2.5 shrink-0" />
          <span className="flex-1 truncate">Quick search or command...</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500 bg-white rounded border border-zinc-200 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Tools & Personalized User Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dynamic Dual-Owner Greeting Chip */}
        <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-900 text-xs font-extrabold shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Welcome back, <strong className="text-emerald-700">{ownerName}</strong> 👋</span>
        </div>

        {/* User Profile Pill with Initials Avatar */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors min-h-[44px] cursor-pointer"
          >
            <Avatar name={ownerName} size="sm" />
            <div className="text-left hidden md:block">
              <p className="text-xs font-extrabold text-slate-900 leading-tight">{ownerName}</p>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                {userRole}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-zinc-200 p-2 z-50"
              >
                <div className="p-3 bg-slate-50 rounded-xl mb-1 border border-zinc-100">
                  <div className="flex items-center gap-2.5 mb-2">
                    <Avatar name={ownerName} size="sm" />
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">{ownerName}</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{userData?.email || 'owner@fitnesskingdom.com'}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-200 flex items-center justify-between text-[10px] font-bold text-slate-600">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Role: {userRole}
                    </span>
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Authenticated</span>
                  </div>
                </div>

                {isOwner && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors mb-1 min-h-[44px] cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    <span>Gym Plans & Settings</span>
                  </button>
                )}

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors min-h-[44px] cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
