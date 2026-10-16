import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.ts';
import { RecruiterUser } from '../types/index.ts';

interface AuthContextType {
  user: RecruiterUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string, company: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  loginAsDemo: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (name: string, company: string) => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  blindReview: boolean;
  setBlindReview: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<RecruiterUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('resumeiq_theme') as 'light' | 'dark') || 'light';
  });
  const [blindReview, setBlindReviewState] = useState<boolean>(() => {
    return localStorage.getItem('resumeiq_blind_review') === 'true';
  });

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('resumeiq_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const setBlindReview = (val: boolean) => {
    setBlindReviewState(val);
    localStorage.setItem('resumeiq_blind_review', val ? 'true' : 'false');
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    // Check for demo user session in localStorage first
    const savedDemo = localStorage.getItem('resumeiq_demo_session');
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo);
        if (parsed?.uid) {
          setUser(parsed);
          setLoading(false);
          return;
        }
      } catch (e) {}
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: User | null) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: data.displayName || fbUser.displayName || 'Recruiter',
              company: data.company || 'Talent Acquisition',
              theme: data.theme || 'light',
              createdAt: data.createdAt || new Date().toISOString()
            });
          } else {
            const newUser: RecruiterUser = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || 'Recruiter',
              company: 'Acme Corp',
              theme: 'light',
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', fbUser.uid), newUser);
            setUser(newUser);
          }
        } catch (err) {
          console.error('Error fetching user document:', err);
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || 'Recruiter',
            company: 'Talent Acquisition'
          });
        }
      } else {
        if (!localStorage.getItem('resumeiq_demo_session')) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    localStorage.removeItem('resumeiq_demo_session');
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUp = async (email: string, pass: string, name: string, company: string) => {
    localStorage.removeItem('resumeiq_demo_session');
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const newUser: RecruiterUser = {
      uid: cred.user.uid,
      email,
      displayName: name,
      company,
      theme: 'light',
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', cred.user.uid), newUser);
    setUser(newUser);
  };

  const signInWithGoogle = async () => {
    localStorage.removeItem('resumeiq_demo_session');
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginAsDemo = async () => {
    const demoUser: RecruiterUser = {
      uid: 'recruiter_demo_evaluator',
      email: 'recruiter.demo@resumeiq.internal',
      displayName: 'Sarah Jenkins',
      company: 'Talent Stream Inc',
      theme: 'light',
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('resumeiq_demo_session', JSON.stringify(demoUser));
    setUser(demoUser);
  };

  const logout = async () => {
    localStorage.removeItem('resumeiq_demo_session');
    try {
      await firebaseSignOut(auth);
    } catch (e) {}
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateProfile = async (name: string, company: string) => {
    if (!user) return;
    const updated = { ...user, displayName: name, company };
    if (!user.uid.startsWith('recruiter_demo_')) {
      await setDoc(doc(db, 'users', user.uid), updated, { merge: true });
    } else {
      localStorage.setItem('resumeiq_demo_session', JSON.stringify(updated));
    }
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signUp,
        signInWithGoogle,
        loginAsDemo,
        logout,
        resetPassword,
        updateProfile,
        theme,
        setTheme,
        blindReview,
        setBlindReview
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
