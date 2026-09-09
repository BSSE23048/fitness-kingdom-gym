import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  UserCheck,
  CalendarCheck,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Flame,
  Sliders,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';

const Sidebar = ({ isCollapsed, toggleSidebar, isMobileOpen, onCloseMobile }) => {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (onCloseMobile) onCloseMobile();
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Member CRM', path: '/members', icon: Users },
    { name: 'Fee Collection', path: '/fee-collection', icon: CreditCard, badge: 'Dues' },
    { name: 'Financials & Expenses', path: '/financials', icon: DollarSign },
    { name: 'Daily Attendance', path: '/attendance', icon: CalendarCheck, badge: 'Sync' },
    { name: 'Staff & Trainers', path: '/staff', icon: UserCheck },
    { name: 'Gym Plans & Settings', path: '/settings', icon: Sliders },
  ];

  return (
    <>
      {/* 1. DESKTOP SIDEBAR (>= 1024px) */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 260 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden lg:flex fixed top-0 left-0 bottom-0 z-40 bg-white border-r border-zinc-200 flex-col justify-between shadow-sm select-none"
      >
        <div>
          <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-100">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
                <Flame className="w-5 h-5 fill-white/20" />
              </div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="whitespace-nowrap"
                  >
                    <h1 className="font-extrabold text-slate-900 text-base leading-tight tracking-tight">
                      Fitness <span className="text-emerald-600">Kingdom</span>
                    </h1>
                    <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      Owner Console
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <div className="px-3 pt-4">
            <div className="p-2.5 rounded-xl border bg-slate-900 text-white border-slate-800 flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full animate-pulse shrink-0 bg-emerald-400" />
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <span className="text-[11px] font-bold uppercase tracking-wider block leading-none">
                    Owner Portal
                  </span>
                  <span className="text-[10px] text-slate-300 truncate block mt-0.5">
                    Executive Admin
                  </span>
                </div>
              )}
            </div>
          </div>

          <nav className="mt-4 px-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    {!isCollapsed && (
                      <div className="flex items-center justify-between w-full overflow-hidden">
                        <span className="truncate">{item.name}</span>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="p-3 border-t border-zinc-100">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-zinc-200">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <Avatar name={userData?.displayName || 'Owner'} size="sm" />
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {userData?.displayName || 'Owner'}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{userData?.email || 'owner@fitnesskingdom.com'}</p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* 2. MOBILE DRAWER (< 1024px) */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Dark Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Slide-out Drawer from Left */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 overflow-y-auto"
            >
              <div>
                <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <h1 className="font-extrabold text-slate-900 text-sm leading-tight">
                        Fitness <span className="text-emerald-600">Kingdom</span>
                      </h1>
                      <p className="text-[10px] uppercase font-semibold text-slate-400">
                        Owner Console
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onCloseMobile}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3">
                  <nav className="space-y-1">
                    {navItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onCloseMobile}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`
                        }
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="w-5 h-5" />
                          <span>{item.name}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </nav>
                </div>
              </div>

              <div className="p-4 border-t border-zinc-100 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={userData?.displayName || 'Owner'} size="sm" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">{userData?.displayName || 'Owner'}</p>
                      <p className="text-[10px] text-slate-500">{userData?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
