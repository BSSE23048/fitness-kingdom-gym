import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-lg shadow-rose-600/10">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 mb-2">
        Error 403 • Access Restricted
      </span>

      <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
        Role Authorization Required
      </h1>

      <p className="text-xs md:text-sm text-slate-500 max-w-md mt-2 leading-relaxed">
        Your current role (<span className="font-bold text-slate-700">{userRole || 'Guest'}</span>) does not have permission to view this financial or administrative module.
      </p>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-colors"
        >
          <Home className="w-4 h-4" /> Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
