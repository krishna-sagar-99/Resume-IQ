import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import { ShieldCheck, ArrowRight, Lock, Mail, User, Building, RefreshCw, ExternalLink } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, signUp, resetPassword, signInWithGoogle, loginAsDemo } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConsoleNotice, setShowConsoleNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowConsoleNotice(false);
    setLoading(true);

    try {
      if (tab === 'login') {
        if (!email || !password) throw new Error('Please enter both email and password.');
        await login(email, password);
        toast('Welcome back to ResumeIQ', 'success');
      } else if (tab === 'signup') {
        if (!email || !password) throw new Error('Please enter email and password.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        await signUp(email, password, name || 'Recruiter', company || 'Acme Talent');
        toast('Account created successfully!', 'success');
      } else if (tab === 'reset') {
        if (!email) throw new Error('Please enter your email address.');
        await resetPassword(email);
        toast('Password reset link sent to your email.', 'success');
        setTab('login');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed.';
      if (msg.includes('auth/operation-not-allowed')) {
        msg = 'Email/Password authentication provider is not enabled in the Firebase Console yet.';
        setShowConsoleNotice(true);
      } else if (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) {
        msg = 'Invalid email or password.';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'An account with this email already exists.';
      }
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      toast('Signed in with Google', 'success');
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      setError(err.message || 'Google Sign-in cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginAsDemo();
      toast('Signed in as Demo Recruiter', 'success');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 sm:p-8 shadow-xs">
        {/* Logo and Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded bg-blue-700 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
            IQ
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
              ResumeIQ
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase mt-0.5">
              AI Resume Screening for Recruiters
            </p>
          </div>
        </div>

        {/* Auth Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); setShowConsoleNotice(false); }}
            className={`flex-1 pb-2.5 text-sm font-medium border-b-2 text-center transition-colors ${
              tab === 'login'
                ? 'border-blue-700 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setError(null); setShowConsoleNotice(false); }}
            className={`flex-1 pb-2.5 text-sm font-medium border-b-2 text-center transition-colors ${
              tab === 'signup'
                ? 'border-blue-700 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => { setTab('reset'); setError(null); setShowConsoleNotice(false); }}
            className={`flex-1 pb-2.5 text-sm font-medium border-b-2 text-center transition-colors ${
              tab === 'reset'
                ? 'border-blue-700 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Reset
          </button>
        </div>

        {/* Error notice */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Console notice if Email/Password is not enabled yet */}
        {showConsoleNotice && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <p className="font-semibold">Firebase Console Setup Note:</p>
            <p className="text-[11px] leading-relaxed">
              Google Cloud provisioned projects require enabling the Email/Password sign-in provider in the Firebase Console:
              <br />
              <strong>Firebase Console &gt; Authentication &gt; Sign-in method &gt; Email/Password &gt; Enable</strong>
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
              You can instantly use <strong>One-Click Demo Recruiter Login</strong> below to test all features immediately!
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Company / Organization
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    placeholder="e.g. Apex Cloud Solutions"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="recruiter@company.com"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {tab !== 'reset' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors disabled:opacity-60 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>
              {tab === 'login' && 'Sign In with Email'}
              {tab === 'signup' && 'Create Recruiter Account'}
              {tab === 'reset' && 'Send Password Reset Link'}
            </span>
          </button>
        </form>

        {/* Fast Demo Recruiter Login Option */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-center space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Evaluating ResumeIQ? Access the workspace instantly:
          </p>
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={loading}
            className="w-full py-2.5 px-3 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <span>One-Click Demo Recruiter Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Responsible AI compliance footer note */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero demographic bias. Strictly deterministic matching.</span>
        </div>
      </div>
    </div>
  );
};
