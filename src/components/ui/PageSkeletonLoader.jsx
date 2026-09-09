import React from 'react';

const PageSkeletonLoader = () => {
  return (
    <div className="p-4 sm:p-6 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded-full w-32" />
        <div className="h-7 bg-slate-300 rounded-xl w-64" />
        <div className="h-3 bg-slate-200 rounded-full w-80" />
      </div>

      {/* KPI Cards Skeleton Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 bg-white rounded-3xl border border-zinc-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3 bg-slate-200 rounded-full w-24" />
              <div className="w-8 h-8 rounded-2xl bg-slate-100" />
            </div>
            <div className="h-8 bg-slate-300 rounded-xl w-36" />
            <div className="h-3 bg-slate-200 rounded-full w-28" />
          </div>
        ))}
      </div>

      {/* Table / Content Skeleton */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <div className="h-6 bg-slate-200 rounded-xl w-48" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl w-full" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageSkeletonLoader;
