import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Maps Firebase Auth emails to dynamic Dual-Owner Display Names
 * (e.g., ahmad@fitnesskingdom.com -> "Ahmad", mohsin@fitnesskingdom.com -> "Mohsin")
 */
export const resolveOwnerProfile = (user) => {
  if (!user || !user.email) {
    return { displayName: 'Gym Owner', role: 'OWNER' };
  }

  const emailLower = user.email.toLowerCase();
  let displayName = user.displayName;

  if (emailLower.includes('ahmad') || emailLower.includes('ahmed')) {
    displayName = 'Ahmad';
  } else if (emailLower.includes('mohsin')) {
    displayName = 'Mohsin';
  } else if (!displayName || displayName === 'Gym Owner') {
    const prefix = emailLower.split('@')[0];
    displayName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  return {
    displayName,
    role: 'OWNER'
  };
};

/**
 * Format Firebase Auth Error Codes into Clean User-Friendly Banners
 */
export const formatAuthError = (err) => {
  console.error('Firebase Auth Error:', err.code, err.message, err);

  switch (err.code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid owner email or password. Please verify your credentials.';
    case 'auth/invalid-email':
      return 'Please enter a valid owner email address.';
    case 'auth/user-disabled':
      return 'This owner account has been disabled. Please contact system administration.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in Firebase Console.';
    case 'auth/api-key-not-valid':
    case 'auth/invalid-api-key':
      return 'Invalid Firebase API Key. Please verify VITE_FIREBASE_API_KEY configuration.';
    default:
      return err.message || 'Authentication failed. Please check your credentials and network connection.';
  }
};

export const AuthProvider = ({ children }) => {
  // Synchronous client-side role & profile caching for INSTANT hydration without spinners
  const [userRole, setUserRole] = useState(() => localStorage.getItem('fk_owner_role') || 'OWNER');

  const [userData, setUserData] = useState(() => {
    const cachedName = localStorage.getItem('fk_owner_name');
    const cachedEmail = localStorage.getItem('fk_owner_email');
    const cachedRole = localStorage.getItem('fk_owner_role') || 'OWNER';
    const cachedUid = localStorage.getItem('fk_user_uid');

    if (cachedName && cachedEmail) {
      return {
        uid: cachedUid || 'owner-uid',
        email: cachedEmail,
        displayName: cachedName,
        role: cachedRole
      };
    }
    return null;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (auth.currentUser) return auth.currentUser;
    const cachedUid = localStorage.getItem('fk_user_uid');
    const cachedEmail = localStorage.getItem('fk_owner_email');
    if (cachedUid && cachedEmail) {
      return { uid: cachedUid, email: cachedEmail };
    }
    return null;
  });

  // Fast loading resolution: if cached session exists, unblock loading state synchronously
  const [loading, setLoading] = useState(() => {
    const cachedUid = localStorage.getItem('fk_user_uid');
    return !cachedUid && !auth.currentUser;
  });

  const [isSyncingProfile, setIsSyncingProfile] = useState(false);

  // Background non-blocking profile sync with Firestore
  const syncProfileInBackground = async (user) => {
    if (!user) return;
    setIsSyncingProfile(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);
      const resolved = resolveOwnerProfile(user);

      let profileData;
      if (userSnap.exists()) {
        const existingData = userSnap.data();
        const finalName = existingData.displayName && existingData.displayName !== 'Gym Owner' 
          ? existingData.displayName 
          : resolved.displayName;

        profileData = {
          uid: user.uid,
          email: user.email,
          displayName: finalName,
          role: existingData.role || 'OWNER',
          ...existingData
        };

        if (existingData.displayName !== finalName) {
          profileData.displayName = finalName;
          await setDoc(userDocRef, { displayName: finalName, role: 'OWNER' }, { merge: true });
        }
      } else {
        profileData = {
          uid: user.uid,
          email: user.email,
          displayName: resolved.displayName,
          role: 'OWNER',
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, profileData, { merge: true });
      }

      setUserData(profileData);
      setUserRole(profileData.role || 'OWNER');

      // Update local storage for instant hydration on subsequent refreshes
      localStorage.setItem('fk_owner_name', profileData.displayName);
      localStorage.setItem('fk_owner_email', profileData.email);
      localStorage.setItem('fk_owner_role', profileData.role || 'OWNER');
      localStorage.setItem('fk_user_uid', profileData.uid);
    } catch (err) {
      console.warn('Background profile sync notice (using resolved auth profile):', err);
      const resolved = resolveOwnerProfile(user);
      const fallbackData = {
        uid: user.uid,
        email: user.email,
        displayName: resolved.displayName,
        role: 'OWNER'
      };
      setUserData(fallbackData);
      setUserRole('OWNER');
    } finally {
      setIsSyncingProfile(false);
    }
  };

  // Monitor Firebase Auth state in background
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setLoading(false);
        syncProfileInBackground(user);
      } else {
        localStorage.removeItem('fk_owner_name');
        localStorage.removeItem('fk_owner_email');
        localStorage.removeItem('fk_owner_role');
        localStorage.removeItem('fk_user_uid');
        setCurrentUser(null);
        setUserData(null);
        setUserRole('OWNER');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Standard Production Email/Password Login via Firebase Auth
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      const user = res.user;

      const resolved = resolveOwnerProfile(user);
      localStorage.setItem('fk_owner_name', resolved.displayName);
      localStorage.setItem('fk_owner_email', user.email);
      localStorage.setItem('fk_owner_role', 'OWNER');
      localStorage.setItem('fk_user_uid', user.uid);

      setCurrentUser(user);
      setUserData({
        uid: user.uid,
        email: user.email,
        displayName: resolved.displayName,
        role: 'OWNER'
      });
      setUserRole('OWNER');
      setLoading(false);

      syncProfileInBackground(user);
      return user;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    setLoading(true);
    localStorage.removeItem('fk_owner_name');
    localStorage.removeItem('fk_owner_email');
    localStorage.removeItem('fk_owner_role');
    localStorage.removeItem('fk_user_uid');
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut error:', e);
    }
    setCurrentUser(null);
    setUserData(null);
    setUserRole('OWNER');
    setLoading(false);
  };

  const value = {
    currentUser,
    userRole: userRole || 'OWNER',
    userData,
    loading,
    isSyncingProfile,
    login,
    logout,
    isOwner: (userRole || 'OWNER') === 'OWNER'
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Non-blocking background sync indicator */}
      {isSyncingProfile && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-emerald-100/60 overflow-hidden pointer-events-none">
          <div className="h-full bg-emerald-600 animate-pulse w-full origin-left transition-all duration-300"></div>
        </div>
      )}

      {loading ? (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center transition-opacity duration-200">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs font-semibold text-slate-500">Loading Owner Portal...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
