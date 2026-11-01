import { describe, it, expect } from 'vitest';
import { getLocalMonth, createMonthOptions, isBeforeMembershipStart } from './dateUtils';
describe('billing calendar', () => {
  it('uses the current local month rather than a fixed September default', () => {
    expect(getLocalMonth(new Date(2026, 10, 2))).toBe('2026-11');
  });
  it('uses local calendar fields at a month boundary', () => {
    const local = new Date(2027, 0, 1, 0, 1);
    expect(getLocalMonth(local)).toBe('2027-01');
  });
  it('keeps historical months and supports the next year in chronological order', () => {
    const months = createMonthOptions(new Date(2027, 11, 31));
    expect(months[0].value).toBe('2026-01');
    expect(months.at(-1).value).toBe('2028-12');
    expect(months.map(m => m.value)).toEqual(months.map(m => m.value).sort());
    expect(new Set(months.map(m => m.value)).size).toBe(months.length);
  });
  it('excludes months before joining without excluding the join month', () => {
    const member = { startDate: '2026-11-02' };
    expect(isBeforeMembershipStart(member, '2026-09')).toBe(true);
    expect(isBeforeMembershipStart(member, '2026-11')).toBe(false);
    expect(isBeforeMembershipStart(member, '2026-12')).toBe(false);
  });
  it('handles year boundaries', () => {
    expect(isBeforeMembershipStart({ startDate: '2027-01-01' }, '2026-12')).toBe(true);
  });
  it.each([undefined, null, '', 'unknown', '2026-99-01'])('does not infer a start month from %s', startDate => {
    expect(isBeforeMembershipStart({ startDate }, '2026-01')).toBe(false);
  });
});
