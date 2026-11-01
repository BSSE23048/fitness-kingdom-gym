/** Local calendar months shared by billing and reporting screens. */
export function getLocalMonth(date = new Date()) {
  return String(date.getFullYear()) + '-' + String(date.getMonth() + 1).padStart(2, '0');
}
export function createMonthOptions(date = new Date()) {
  const options = [];
  const firstYear = Math.min(2026, date.getFullYear());
  for (let year = firstYear; year <= date.getFullYear() + 1; year++) {
    for (let month = 0; month < 12; month++) {
      options.push({
        value: String(year) + '-' + String(month + 1).padStart(2, '0'),
        label: new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      });
    }
  }
  return options;
}
export const MONTH_OPTIONS = createMonthOptions();
export const DEFAULT_MONTH = getLocalMonth();
export const getMonthLabel = monthValue =>
  MONTH_OPTIONS.find(month => month.value === monthValue)?.label || monthValue;

/** A billing month cannot precede a known membership start month. */
export function isBeforeMembershipStart(member, month) {
  const start = member.startDate;
  return typeof start === 'string' && /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(start) &&
    month < start.slice(0, 7);
}
