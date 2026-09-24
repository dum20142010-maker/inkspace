import React, { useState, useRef, useEffect } from 'react';
import { User } from '../../types/notebook';
import {
  User as UserIcon,
  LogOut,
  UserPlus,
  Shield,
  KeyRound,
  ChevronDown,
  Sparkles,
  Check
} from 'lucide-react';

interface UserProfileMenuProps {
  currentUser: User | null;
  onOpenAuth: (mode: 'signin' | 'register' | 'recover') => void;
  onSignOut: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  currentUser,
  onOpenAuth,
  onSignOut
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => onOpenAuth('signin')}
          className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700 transition"
        >
          Sign In
        </button>
        <button
          onClick={() => onOpenAuth('register')}
          className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition"
        >
          Sign Up
        </button>
      </div>
    );
  }

  // Get User Initials
  const initials = currentUser.name
    .split(' ')
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/80 p-1.5 pr-3 hover:border-slate-700 hover:bg-slate-800/80 transition"
      >
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow"
          style={{ backgroundColor: currentUser.avatarColor || '#6366f1' }}
        >
          {initials}
        </div>
        <div className="text-left hidden md:block">
          <p className="text-xs font-bold text-white leading-tight truncate max-w-[100px]">{currentUser.name}</p>
          <p className="text-[10px] text-slate-400 leading-none">Local Account</p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-40 w-64 rounded-2xl bg-slate-900 border border-slate-800 p-2 shadow-2xl text-xs text-slate-200 animate-in fade-in zoom-in-95">
          {/* User Profile Card */}
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 mb-2">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold text-white shadow-md shrink-0"
                style={{ backgroundColor: currentUser.avatarColor || '#6366f1' }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-white text-xs truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-400 mt-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                  <Check className="w-2.5 h-2.5" /> Authenticated
                </span>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-0.5">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenAuth('recover');
              }}
              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Change / Reset Password</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                onOpenAuth('signin');
              }}
              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Switch or Add Account</span>
            </button>
          </div>

          <div className="my-1.5 border-t border-slate-800" />

          {/* Sign Out */}
          <button
            onClick={() => {
              setIsOpen(false);
              onSignOut();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out of SEEN</span>
          </button>
        </div>
      )}
    </div>
  );
};
