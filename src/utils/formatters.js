/**
 * Currency & Formatting Utilities for Fitness Kingdom Gym
 */

/**
 * Formats a numeric value into Pakistani Rupees (PKR / Rs.) with thousands separators.
 * e.g. 20000 -> "Rs. 20,000"
 *
 * @param {number|string} amount
 * @returns {string} Formatted currency string
 */
export const formatPKR = (amount) => {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString('en-PK')}`;
};

/**
 * Capitalizes first letter of string
 */
export const capitalize = (str = '') => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};
