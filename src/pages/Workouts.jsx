import React from 'react';
import { Dumbbell, Plus, Utensils, Flame } from 'lucide-react';

const Workouts = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
            TRAINER PORTAL
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Personal Workout & Diet Assigner</h2>
          <p className="text-xs text-slate-500">Design custom routine templates and macro nutrition plans.</p>
        </div>
        <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-emerald-600/20">
          <Plus className="w-4 h-4" /> Create New Routine
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-subtle">
          <div className="flex items-center gap-2 mb-3">
            <Dumbbell className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Workout Plan Library</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">Preset exercise splits for hypertrophy, strength, and endurance.</p>
          <div className="space-y-2">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">5-Day Push/Pull/Legs Split</span>
              <span className="text-[10px] font-bold text-indigo-600">Assigned to 8 Clients</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Fat Loss Cardio & Core Circuit</span>
              <span className="text-[10px] font-bold text-indigo-600">Assigned to 5 Clients</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-subtle">
          <div className="flex items-center gap-2 mb-3">
            <Utensils className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Dietary & Macro Blueprints</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">Caloric target guidelines and meal plans.</p>
          <div className="space-y-2">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">High-Protein Lean Bulk (2800 kcal)</span>
              <span className="text-[10px] font-bold text-emerald-600">Active Blueprint</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Ketogenic Cutting Protocol (2000 kcal)</span>
              <span className="text-[10px] font-bold text-emerald-600">Active Blueprint</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workouts;
