import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  Layers,
  CheckSquare,
  Bookmark,
  Headphones,
  FileText,
  User,
  LogOut,
  LogIn,
  Menu,
  X,
  Award,
} from 'lucide-react';
import { useAuthStore } from '../features/auth/store/useAuthStore';

export const AppNav: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [savedCount, setSavedCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const location = useLocation();

  // Read saved bookmarks count from localStorage & listen for changes
  useEffect(() => {
    const updateCount = () => {
      try {
        const saved = localStorage.getItem('toeic_bookmarks');
        setSavedCount(saved ? JSON.parse(saved).length : 0);
      } catch {
        setSavedCount(0);
      }
    };

    updateCount();
    window.addEventListener('storage', updateCount);
    const interval = setInterval(updateCount, 1000);
    return () => {
      window.removeEventListener('storage', updateCount);
      clearInterval(interval);
    };
  }, []);

  const [prevPath, setPrevPath] = useState(location.pathname);
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname);
    setMobileMenuOpen(false);
  }

  const navTabs = [
    { to: '/tests', label: 'Test', icon: FileText, exact: false },
    { to: '/results', label: 'Kết quả', icon: Award, exact: false },
    { to: '/speaking', label: 'Speaking', icon: Headphones, exact: false },
    { to: '/', label: 'Từ vựng', icon: BookOpen, exact: true },
    { to: '/flashcards', label: 'Flashcards', icon: Layers, exact: false },
    { to: '/quiz', label: 'Trắc nghiệm', icon: CheckSquare, exact: false },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand Logo & Name (Left) */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  Prac4TOEIC
                </span>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200/50 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800/60">
                  Platform
                </span>
              </div>
            </div>
          </Link>

          {/* Navigation Tabs (Middle - Desktop) */}
          <nav className="hidden md:flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/50 dark:border-slate-800">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.exact}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-800 dark:text-blue-400'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Actions Section (Right) */}
          <div className="hidden md:flex items-center gap-3">
            {/* Nút "Đã lưu" */}
            <NavLink
              to="/saved"
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                  isActive
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800'
                    : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-850'
                }`
              }
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-500" />
              <span>Đã lưu ({savedCount})</span>
            </NavLink>

            {/* Auth State Button / Profile */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-xs">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span className="max-w-[120px] truncate">{user?.fullName || user?.email}</span>
                </div>
                <button
                  onClick={() => logout()}
                  className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-all shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              title="Menu điều hướng"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/80 dark:border-slate-800 py-3 space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    end={tab.exact}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </NavLink>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
              <NavLink
                to="/saved"
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${
                    isActive
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`
                }
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                <span>Đã lưu ({savedCount})</span>
              </NavLink>

              {isAuthenticated ? (
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
