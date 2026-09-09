import React from 'react';

/**
 * Curated Tailwind color pairings for dynamic initials avatars
 */
const COLOR_PALETTES = [
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
];

/**
 * Computes a deterministic index from a string
 */
const hashString = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

/**
 * Computes 2-letter uppercase initials from a full name
 */
export const getInitials = (name = '') => {
  if (!name || typeof name !== 'string') return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts[0].length >= 2) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

/**
 * Reusable Initials Avatar Component
 */
const Avatar = ({ name = 'User', size = 'md', className = '' }) => {
  const initials = getInitials(name);
  const colorIndex = hashString(name) % COLOR_PALETTES.length;
  const palette = COLOR_PALETTES[colorIndex];

  // Size mapping
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm font-extrabold',
    xl: 'w-20 h-20 text-xl font-extrabold shadow-md',
  }[size] || 'w-9 h-9 text-xs';

  return (
    <div
      className={`rounded-2xl flex items-center justify-center font-bold border ${palette.bg} ${palette.text} ${palette.border} ${sizeClasses} ${className} shrink-0 select-none`}
      title={name}
    >
      {initials}
    </div>
  );
};

export default Avatar;
