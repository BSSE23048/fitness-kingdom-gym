import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const firestore = vi.hoisted(() => ({
  collection: vi.fn(), doc: vi.fn(), getDocs: vi.fn(), getDoc: vi.fn(),
  setDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), addDoc: vi.fn(),
  query: vi.fn(), orderBy: vi.fn(), runTransaction: vi.fn(), getCountFromServer: vi.fn(),
}));
vi.mock('firebase/firestore', () => firestore);
vi.mock('../config/firebase', () => ({ db: {} }));

let service;
const failure = new Error('Synthetic database failure');
const payload = { fullName: 'Synthetic Member', phone: '923000000000', startDate: '2026-11-01' };

beforeEach(async () => {
  vi.resetModules();
  Object.values(firestore).forEach(mock => mock.mockReset());
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  firestore.collection.mockReturnValue({});
  firestore.doc.mockReturnValue({});
  firestore.getDocs.mockResolvedValue({ empty: true, docs: [] });
  firestore.runTransaction.mockResolvedValue(2);
  service = await import('./memberService');
});
afterEach(() => vi.restoreAllMocks());

async function seedMember() {
  firestore.getDocs.mockResolvedValueOnce({ empty: false, docs: [{
    id: 'FK-001', data: () => ({ fullName: 'Synthetic Member', phone: 'old', endDate: '2030-12-31', isFrozen: false }),
  }] });
  return (await service.fetchMembers())[0];
}
async function cachedMembers() {
  firestore.getDocs.mockRejectedValueOnce(failure);
  return service.fetchMembers();
}

describe('database failures must not become successful local changes', () => {
  it('does not generate a duplicate-prone fallback ID when the counter fails', async () => {
    firestore.runTransaction.mockRejectedValueOnce(failure);
    await expect(service.addMember(payload)).rejects.toBe(failure);
    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  it('does not add a member to the cache when persistence fails', async () => {
    firestore.setDoc.mockRejectedValueOnce(failure);
    await expect(service.addMember(payload)).rejects.toBe(failure);
    expect(await cachedMembers()).toEqual([]);
  });

  it('retains the cached member when deletion fails', async () => {
    const before = await seedMember();
    firestore.deleteDoc.mockRejectedValueOnce(failure);
    await expect(service.deleteMember('FK-001')).rejects.toBe(failure);
    expect(await cachedMembers()).toEqual([before]);
  });

  it.each([
    ['freeze', () => service.freezeMembership('FK-001', 'Synthetic reason')],
    ['unfreeze', () => service.unfreezeMembership('FK-001')],
    ['renew', () => service.renewMembership('FK-001', 'Standard', 1, 100)],
    ['edit', () => service.updateMemberDetails('FK-001', { phone: 'new' })],
  ])('keeps cached data unchanged after a failed %s', async (_name, update) => {
    const before = await seedMember();
    firestore.updateDoc.mockRejectedValueOnce(failure);
    await expect(update()).rejects.toBe(failure);
    expect(await cachedMembers()).toEqual([before]);
  });

  it('does not invent a successful attendance entry after a failed write', async () => {
    firestore.addDoc.mockRejectedValueOnce(failure);
    await expect(service.markMemberAttendance('FK-001', 'Synthetic Member')).rejects.toBe(failure);
    firestore.getDocs.mockRejectedValueOnce(failure);
    expect(await service.fetchMemberAttendance('FK-001')).toEqual([]);
  });
});

describe('confirmed writes remain available in the local cache', () => {
  it('returns and caches a member after the counter and member writes succeed', async () => {
    firestore.setDoc.mockResolvedValueOnce();
    const member = await service.addMember(payload);
    expect(member.id).toBe('FK-002');
    expect(await cachedMembers()).toEqual([member]);
  });

  it('removes a member only after a successful delete', async () => {
    await seedMember();
    firestore.deleteDoc.mockResolvedValueOnce();
    await service.deleteMember('FK-001');
    expect(await cachedMembers()).toEqual([]);
  });
});
