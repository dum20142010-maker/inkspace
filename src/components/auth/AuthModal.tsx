import React, { useState, useEffect } from 'react';
import { db } from '../../db/database';
import { User } from '../../types/notebook';
import { generateSalt, hashStringWithSalt, verifyPassword, verifySecurityAnswer } from '../../utils/crypto';
import { auth, googleProvider, signInWithPopup } from '../../utils/firebase';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  HelpCircle,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AtSign,
  Copy,
  Check
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'register' | 'recover';
  onClose: () => void;
  onSuccess: (user: User, rememberMe: boolean) => void;
}

const SECURITY_QUESTIONS = [
  "What was your first pet's name?",
  "What city were you born in?",
  "What was the name of your first school?",
  "What is your favorite book of all time?",
  "What was the model of your first car?",
  "What is your mother's maiden name?"
];

const AVATAR_COLORS = [
  '#6366f1', // Indigo
  '#0d9488', // Teal
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#ef4444'  // Rose
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signin',
  onClose,
  onSuccess
}) => {
  const [mode, setMode] = useState<'signin' | 'register' | 'recover' | 'onboarding'>(initialMode);

  // Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Register State
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regSecurityQuestion, setRegSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [regSecurityAnswer, setRegSecurityAnswer] = useState('');
  const [regAvatarColor, setRegAvatarColor] = useState(AVATAR_COLORS[0]);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Username Availability State
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string | null;
  }>({ checking: false, available: null, message: null });

  // Onboarding / Google Customization State
  const [onboardingUser, setOnboardingUser] = useState<User | null>(null);
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingUsername, setOnboardingUsername] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Recovery State
  const [recEmail, setRecEmail] = useState('');
  const [recFoundUser, setRecFoundUser] = useState<User | null>(null);
  const [recSecurityAnswer, setRecSecurityAnswer] = useState('');
  const [recNewPassword, setRecNewPassword] = useState('');
  const [recConfirmNewPassword, setRecConfirmNewPassword] = useState('');
  const [recStep, setRecStep] = useState<'find_email' | 'answer_question' | 'success'>('find_email');
  const [recVerificationCode, setRecVerificationCode] = useState<string | null>(null);
  const [recEnteredCode, setRecEnteredCode] = useState('');
  const [recUseCodeMode, setRecUseCodeMode] = useState(false);

  // Status & Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check Username Availability with debounce
  useEffect(() => {
    const targetUsername = mode === 'onboarding' ? onboardingUsername : regUsername;
    const clean = targetUsername.replace(/^@/, '').trim().toLowerCase();

    if (!clean) {
      setUsernameStatus({ checking: false, available: null, message: null });
      return;
    }

    setUsernameStatus({ checking: true, available: null, message: 'Checking handle...' });

    const timer = setTimeout(async () => {
      try {
        const excludeId = onboardingUser?.id || '';
        const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(clean)}&excludeUserId=${excludeId}`).then(r => r.json());
        if (res.available) {
          setUsernameStatus({ checking: false, available: true, message: `✓ @${clean} is available!` });
        } else {
          setUsernameStatus({ checking: false, available: false, message: `❌ @${clean} is taken by another person.` });
        }
      } catch (err) {
        setUsernameStatus({ checking: false, available: null, message: null });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [regUsername, onboardingUsername, mode, onboardingUser]);

  if (!isOpen) return null;

  const resetErrors = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Google Sign In Handler
  const handleGoogleSignIn = async () => {
    resetErrors();
    setIsLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const gUser = result.user;

      if (!gUser.email) {
        setErrorMessage('Google account did not return a valid email address.');
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: gUser.email,
          name: gUser.displayName || '',
          avatarImage: gUser.photoURL || '',
          googleUid: gUser.uid
        })
      }).then(r => r.json());

      if (res.success && res.user) {
        await db.users.put(res.user);
        if (res.isNew) {
          setOnboardingUser(res.user);
          setOnboardingName(res.user.name || '');
          setOnboardingUsername(res.user.username || '');
          setMode('onboarding');
        } else {
          onSuccess(res.user, true);
          onClose();
        }
      } else {
        setErrorMessage(res.error || 'Google authentication failed.');
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setErrorMessage(err.message || 'Google sign-in popup was closed or cancelled.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign In Handler (Standard Email/Password)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();
    setIsLoading(true);

    try {
      const email = signInEmail.trim().toLowerCase();
      let user = await db.users.where('email').equalsIgnoreCase(email).first();

      if (!user) {
        // Try fetching from server
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login: email, password: signInPassword })
        }).then(r => r.json());

        if (res.success && res.user) {
          user = res.user as User;
          await db.users.put(user);
        } else {
          setErrorMessage(res.error || 'No user account found with this email address.');
          setIsLoading(false);
          return;
        }
      } else {
        const isValid = await verifyPassword(signInPassword, user.salt, user.passwordHash);
        if (!isValid) {
          setErrorMessage('Incorrect password. Please check and try again.');
          setIsLoading(false);
          return;
        }
      }

      if (user) {
        onSuccess(user, rememberMe);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  // Register Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    if (!regName.trim()) {
      setErrorMessage('Please enter your display name.');
      return;
    }

    const cleanUsername = regUsername.replace(/^@/, '').trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMessage('Username handle must be at least 3 characters long.');
      return;
    }

    if (usernameStatus.available === false) {
      setErrorMessage('Username is already taken by another person. Please choose a different handle.');
      return;
    }

    const email = regEmail.trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!regSecurityAnswer.trim()) {
      setErrorMessage('Please provide an answer to the security recovery question.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          username: cleanUsername,
          email,
          password: regPassword,
          securityQuestion: regSecurityQuestion,
          securityAnswer: regSecurityAnswer.trim().toLowerCase()
        })
      }).then(r => r.json());

      if (res.success && res.user) {
        await db.users.put(res.user);
        onSuccess(res.user, true);
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to create user account.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create user account.');
    } finally {
      setIsLoading(false);
    }
  };

  // Finish Onboarding
  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    if (!onboardingUser) return;

    const cleanUsername = onboardingUsername.replace(/^@/, '').trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMessage('Please enter a valid username handle (at least 3 characters).');
      return;
    }

    if (usernameStatus.available === false) {
      setErrorMessage(`Username handle @${cleanUsername} is taken by another person.`);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: onboardingUser.id,
          name: onboardingName.trim(),
          username: cleanUsername
        })
      }).then(r => r.json());

      if (res.success && res.user) {
        await db.users.put(res.user);
        onSuccess(res.user, true);
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to update username.');
      }
    } catch (err: any) {
      setErrorMessage('Failed to save profile changes.');
    } finally {
      setIsLoading(false);
    }
  };

  // Password Recovery - Step 1
  const handleRecoveryLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();
    setIsLoading(true);

    try {
      const email = recEmail.trim().toLowerCase();
      const user = await db.users.where('email').equalsIgnoreCase(email).first();

      if (!user) {
        setErrorMessage('No registered account was found with that email.');
        setIsLoading(false);
        return;
      }

      setRecFoundUser(user);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setRecVerificationCode(code);
      setRecStep('answer_question');
    } catch (err: any) {
      setErrorMessage('Error finding account.');
    } finally {
      setIsLoading(false);
    }
  };

  // Password Recovery - Step 2
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    if (!recFoundUser) return;

    if (recNewPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (recNewPassword !== recConfirmNewPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      if (recUseCodeMode) {
        if (recEnteredCode.trim() !== recVerificationCode) {
          setErrorMessage('Invalid 6-digit recovery code.');
          setIsLoading(false);
          return;
        }
      } else {
        const isAnswerValid = await verifySecurityAnswer(
          recSecurityAnswer,
          recFoundUser.salt,
          recFoundUser.securityAnswerHash
        );
        if (!isAnswerValid) {
          setErrorMessage('Security answer does not match our records.');
          setIsLoading(false);
          return;
        }
      }

      const newSalt = generateSalt();
      const newPasswordHash = await hashStringWithSalt(recNewPassword, newSalt);

      await db.users.update(recFoundUser.id, {
        passwordHash: newPasswordHash,
        salt: newSalt,
        updatedAt: Date.now()
      });

      const updatedUser: User = {
        ...recFoundUser,
        passwordHash: newPasswordHash,
        salt: newSalt,
        updatedAt: Date.now()
      };

      setRecFoundUser(updatedUser);
      setRecStep('success');
      setSuccessMessage('Password reset successfully!');
    } catch (err: any) {
      setErrorMessage('Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {mode === 'signin' && 'Sign In to InkSpace'}
                {mode === 'register' && 'Create Your Unique Account'}
                {mode === 'onboarding' && 'Personalize Profile'}
                {mode === 'recover' && 'Password Recovery'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'signin' && 'Access all notebooks & collaborative canvases'}
                {mode === 'register' && 'Choose your unique username & 6-digit friend code'}
                {mode === 'onboarding' && 'Finalize your handle & collaboration code'}
                {mode === 'recover' && 'Reset your password securely'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Sign In vs Register) */}
        {mode !== 'recover' && mode !== 'onboarding' && (
          <div className="flex rounded-xl bg-slate-950/80 p-1 border border-slate-800 my-4">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                resetErrors();
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                mode === 'signin'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                resetErrors();
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error / Success Feedback Banner */}
        {errorMessage && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {/* ================= SIGN IN TAB ================= */}
          {mode === 'signin' && (
            <div className="space-y-4 pt-1">
              {/* Google Sign-In Primary Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white text-slate-900 py-3 px-4 text-xs font-bold shadow-lg hover:bg-slate-100 active:scale-98 transition disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.1 0-5.74-2.09-6.68-4.91H1.36v3.13C3.34 21.32 7.42 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.6H1.36C.49 8.33 0 10.1 0 12s.49 3.67 1.36 5.4l3.96-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.42 0 3.34 2.68 1.36 6.6l3.96 3.13c.94-2.82 3.58-4.98 6.68-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center text-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-500 absolute">or sign in with email</span>
              </div>

              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={signInEmail}
                      onChange={e => setSignInEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('recover');
                        setRecEmail(signInEmail);
                        setRecStep('find_email');
                        resetErrors();
                      }}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showSignInPassword ? 'text' : 'password'}
                      required
                      value={signInPassword}
                      onChange={e => setSignInPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                    />
                    <span>Stay signed in</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-98 transition disabled:opacity-50"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Sign In</span>
                </button>
              </form>
            </div>
          )}

          {/* ================= REGISTER TAB ================= */}
          {mode === 'register' && (
            <div className="space-y-3.5 pt-1">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white text-slate-900 py-3 px-4 text-xs font-bold shadow-lg hover:bg-slate-100 active:scale-98 transition disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.1 0-5.74-2.09-6.68-4.91H1.36v3.13C3.34 21.32 7.42 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.6H1.36C.49 8.33 0 10.1 0 12s.49 3.67 1.36 5.4l3.96-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.42 0 3.34 2.68 1.36 6.6l3.96 3.13c.94-2.82 3.58-4.98 6.68-4.98z"
                  />
                </svg>
                <span>Sign up with Google</span>
              </button>

              <div className="relative flex items-center justify-center text-center my-2">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-500 absolute">or custom registration</span>
              </div>

              <form onSubmit={handleRegister} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      placeholder="e.g. Maya Lin"
                      className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Unique Handle <span className="text-[10px] text-amber-400 font-normal">*No duplicates</span>
                    </label>
                    <div className="relative">
                      <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={regUsername}
                        onChange={e => setRegUsername(e.target.value)}
                        placeholder="maya_sketch"
                        className={`w-full rounded-xl bg-slate-800/80 border pl-8 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none ${
                          usernameStatus.available === true
                            ? 'border-emerald-500'
                            : usernameStatus.available === false
                            ? 'border-rose-500'
                            : 'border-slate-700/80 focus:border-indigo-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Real-time Username Status Feedback */}
                {usernameStatus.message && (
                  <p
                    className={`text-[11px] font-medium px-1 ${
                      usernameStatus.available === true
                        ? 'text-emerald-400'
                        : usernameStatus.available === false
                        ? 'text-rose-400 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {usernameStatus.message}
                  </p>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="maya@domain.com"
                      className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm</label>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={e => setRegConfirmPassword(e.target.value)}
                      placeholder="Repeat"
                      className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Security Question for Password Recovery */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Security Recovery Question
                  </label>
                  <select
                    value={regSecurityQuestion}
                    onChange={e => setRegSecurityQuestion(e.target.value)}
                    className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {SECURITY_QUESTIONS.map(q => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Answer to Security Question</label>
                  <input
                    type="text"
                    required
                    value={regSecurityAnswer}
                    onChange={e => setRegSecurityAnswer(e.target.value)}
                    placeholder="Your secret answer"
                    className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || usernameStatus.available === false}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-98 transition disabled:opacity-50"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Create Account & Generate Friend Code</span>
                </button>
              </form>
            </div>
          )}

          {/* ================= ONBOARDING TAB ================= */}
          {mode === 'onboarding' && onboardingUser && (
            <form onSubmit={handleSaveOnboarding} className="space-y-4 pt-1">
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/50 space-y-2 text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl overflow-hidden bg-indigo-600 border-2 border-amber-400 flex items-center justify-center shadow-lg">
                  {onboardingUser.avatarImage ? (
                    <img src={onboardingUser.avatarImage} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-white">{onboardingName[0]?.toUpperCase()}</span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white">Google Sign-In Successful!</h3>
                <p className="text-xs text-indigo-300">
                  Welcome, <strong className="text-white">{onboardingUser.email}</strong>
                </p>
              </div>

              {/* Display 6-Digit Collab Code Badge */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Your Creative 6-Digit Collab Code</p>
                  <p className="font-mono text-lg font-extrabold tracking-widest text-amber-300 mt-0.5">
                    {onboardingUser.collabCode || '849201'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(onboardingUser.collabCode || '849201');
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 font-semibold text-xs flex items-center gap-1.5 transition"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={onboardingName}
                  onChange={e => setOnboardingName(e.target.value)}
                  className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Unique Handle</span>
                  <span className="text-[10px] text-amber-400 font-normal">Must be unique</span>
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={onboardingUsername}
                    onChange={e => setOnboardingUsername(e.target.value)}
                    className={`w-full rounded-xl bg-slate-800/80 border pl-9 pr-4 py-2.5 text-xs font-mono text-white focus:outline-none ${
                      usernameStatus.available === true
                        ? 'border-emerald-500'
                        : usernameStatus.available === false
                        ? 'border-rose-500'
                        : 'border-slate-700/80 focus:border-indigo-500'
                    }`}
                  />
                </div>
                {usernameStatus.message && (
                  <p
                    className={`text-[11px] font-medium mt-1 ${
                      usernameStatus.available === true
                        ? 'text-emerald-400'
                        : usernameStatus.available === false
                        ? 'text-rose-400 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {usernameStatus.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || usernameStatus.available === false}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg hover:bg-indigo-500 transition disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Confirm & Start Note-Taking</span>
              </button>
            </form>
          )}

          {/* ================= PASSWORD RECOVERY TAB ================= */}
          {mode === 'recover' && (
            <div className="space-y-4 pt-1">
              {recStep === 'find_email' && (
                <form onSubmit={handleRecoveryLookup} className="space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Enter your email address to look up your account and reset your password.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={recEmail}
                        onChange={e => setRecEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg hover:bg-indigo-500 transition disabled:opacity-50"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    <span>Continue to Recovery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      resetErrors();
                    }}
                    className="w-full text-center text-xs text-slate-400 hover:text-white"
                  >
                    Back to Sign In
                  </button>
                </form>
              )}

              {recStep === 'answer_question' && recFoundUser && (
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40">
                    <p className="text-[11px] font-semibold text-indigo-300">Account Found: {recFoundUser.name}</p>
                    <p className="text-[10px] text-slate-400">{recFoundUser.email}</p>
                  </div>

                  {!recUseCodeMode ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300">Security Question</label>
                        <button
                          type="button"
                          onClick={() => setRecUseCodeMode(true)}
                          className="text-[10px] text-indigo-400 hover:underline"
                        >
                          Use Recovery Code
                        </button>
                      </div>
                      <p className="text-xs text-indigo-300 font-medium p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 mb-2">
                        {recFoundUser.securityQuestion || "What was your first pet's name?"}
                      </p>
                      <input
                        type="text"
                        required
                        value={recSecurityAnswer}
                        onChange={e => setRecSecurityAnswer(e.target.value)}
                        placeholder="Enter your security answer"
                        className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300">One-Time Recovery Code</label>
                        <button
                          type="button"
                          onClick={() => setRecUseCodeMode(false)}
                          className="text-[10px] text-indigo-400 hover:underline"
                        >
                          Use Security Question
                        </button>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 mb-2">
                        <p className="text-[11px] text-slate-400">Recovery code for your session:</p>
                        <p className="text-base font-mono font-bold tracking-widest text-emerald-400 mt-0.5">
                          {recVerificationCode}
                        </p>
                      </div>
                      <input
                        type="text"
                        required
                        value={recEnteredCode}
                        onChange={e => setRecEnteredCode(e.target.value)}
                        placeholder="Enter the 6-digit code above"
                        className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                      <input
                        type="password"
                        required
                        value={recNewPassword}
                        onChange={e => setRecNewPassword(e.target.value)}
                        placeholder="Min 6 chars"
                        className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New</label>
                      <input
                        type="password"
                        required
                        value={recConfirmNewPassword}
                        onChange={e => setRecConfirmNewPassword(e.target.value)}
                        placeholder="Repeat new"
                        className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 transition disabled:opacity-50"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Reset & Update Password</span>
                  </button>
                </form>
              )}

              {recStep === 'success' && recFoundUser && (
                <div className="text-center py-4 space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Password Updated Successfully</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      You can now log in immediately with your new credentials.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSuccess(recFoundUser, true);
                      onClose();
                    }}
                    className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg hover:bg-indigo-500 transition"
                  >
                    Sign In Now
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
