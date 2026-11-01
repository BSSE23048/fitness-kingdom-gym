import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { signInWithEmailAndPassword, signOut, onIdTokenChanged, getIdTokenResult } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext(null);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// Display names are presentation only. Authorization comes from the token claim.
export const resolveOwnerProfile = (user) => ({
  displayName: user?.displayName || user?.email?.split('@')[0] || 'Gym Owner',
  role: null,
});

export const formatAuthError = (err) => {
  switch (err?.code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid owner email or password.';
    case 'auth/owner-required':
      return 'This account has not been granted owner access. Contact the administrator.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'Unable to sign in. Check your connection and try again.';
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);
  const generation = useRef(0);

  useEffect(() => {
    // Old cached profile fields must never restore an authenticated session.
    try {
      for (const key of ['fk_owner_name', 'fk_owner_email', 'fk_owner_role', 'fk_user_uid']) {
        localStorage.removeItem(key);
      }
    } catch { /* Storage restrictions must not prevent token verification. */ }
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      const request = ++generation.current;
      setCurrentUser(null);
      setUserData(null);
      setLoading(true);
      setIsSyncingProfile(false);
      if (!user) { setLoading(false); return; }
      try {
        const token = await getIdTokenResult(user);
        if (request !== generation.current) return;
        if (token.claims.owner !== true) return;
        setCurrentUser(user);
        setUserData({ uid: user.uid, email: user.email, ...resolveOwnerProfile(user), role: 'OWNER' });
        setIsSyncingProfile(true);
        try {
          const snapshot = await getDoc(doc(db, 'users', user.uid));
          if (request === generation.current && snapshot.exists()) {
            const displayName = snapshot.data().displayName;
            if (typeof displayName === 'string' && displayName.trim()) {
              setUserData((current) => current && ({ ...current, displayName }));
            }
          }
        } catch {
          // An optional profile read must not create or escalate a role.
        }
      } catch {
        if (request === generation.current) { setCurrentUser(null); setUserData(null); }
      } finally {
        if (request === generation.current) { setLoading(false); setIsSyncingProfile(false); }
      }
    });
    return () => { generation.current += 1; unsubscribe(); };
  }, []);

  const login = async (email, password) => {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const token = await getIdTokenResult(user);
    if (token.claims.owner !== true) {
      await signOut(auth);
      const error = new Error('Owner access required');
      error.code = 'auth/owner-required';
      throw error;
    }
    return user;
  };

  const logout = async () => {
    generation.current += 1;
    setCurrentUser(null);
    setUserData(null);
    await signOut(auth);
  };
  const userRole = currentUser ? 'OWNER' : null;
  const value = { currentUser, userData, userRole, loading, isSyncingProfile, login, logout, isOwner: userRole === 'OWNER' };
  return (
    <AuthContext.Provider value={value}>
      {loading ? <div role="status" className="min-h-screen flex items-center justify-center">Checking owner access…</div> : children}
    </AuthContext.Provider>
  );
};
