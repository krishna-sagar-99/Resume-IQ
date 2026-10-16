import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  UploadCloud,
  Users,
  History,
  Settings,
  LogOut,
  Sparkles,
  ShieldCheck,
  Building
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export type NavPage =
  | 'dashboard'
  | 'jobs'
  | 'screening'
  | 'rankings'
  | 'candidate-details'
  | 'history'
  | 'settings';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpenMobile,
  onCloseMobile
}) => {
  const { user, logout } = useAuth();

  const navItems: Array<{ id: NavPage; label: string; icon: any }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'jobs', label: 'Job Descriptions', icon: Briefcase },
    { id: 'screening', label: 'Resume Screening', icon: UploadCloud },
    { id: 'rankings', label: 'Candidate Rankings', icon: Users },
    { id: 'history', label: 'Screening History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const handleNav = (id: NavPage) => {
    onNavigate(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* App Branding */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-700 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
              IQ
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 tracking-tight text-base">
                ResumeIQ
              </span>
              <span className="block text-[10px] uppercase font-medium tracking-wider text-slate-400">
                Recruiter Suite
              </span>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded transition-colors text-left focus:ring-2 focus:ring-blue-600 focus:outline-none ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Responsible AI compliance badge */}
        <div className="px-4 py-3 mx-3 mb-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700/60 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>Responsible AI Mode</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            Deterministic scoring. No demographic inference.
          </p>
        </div>

        {/* User profile & Logout */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {user?.displayName || 'Recruiter'}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                <Building className="w-3 h-3 shrink-0" />
                <span className="truncate">{user?.company || 'Talent Acquisition'}</span>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
