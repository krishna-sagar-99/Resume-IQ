import React from 'react';
import { Menu, Sun, Moon, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenMobileSidebar: () => void;
  onLoadDemoData?: () => void;
  demoLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenMobileSidebar,
  onLoadDemoData,
  demoLoading
}) => {
  const { theme, setTheme, blindReview, setBlindReview } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 lg:hidden rounded hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Blind review toggle */}
        <button
          onClick={() => setBlindReview(!blindReview)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 ${
            blindReview
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
          title={blindReview ? 'Blind Review is Active (PII Masked)' : 'Enable Blind Review'}
          aria-pressed={blindReview}
        >
          {blindReview ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Blind Review: On</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Blind Review</span>
            </>
          )}
        </button>

        {/* Demo Sample Data Button */}
        {onLoadDemoData && (
          <button
            onClick={onLoadDemoData}
            disabled={demoLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
            title="Load sample jobs and resumes into your recruiter account"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span className="hidden md:inline">{demoLoading ? 'Loading Sample...' : 'Load Sample Data'}</span>
            <span className="md:hidden">Demo</span>
          </button>
        )}

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600"
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
