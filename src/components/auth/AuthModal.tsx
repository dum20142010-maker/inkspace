import React, { useState } from 'react';
import { db } from '../../db/database';
import { User, AuthSession } from '../../types/notebook';
import { generateSalt, hashStringWithSalt, verifyPassword, verifySecurityAnswer } from '../../utils/crypto';
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
  RefreshCw
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
  const [mode, setMode] = useState<'signin' | 'register' | 'recover'>(initialMode);

  // Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regSecurityQuestion, setRegSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [regSecurityAnswer, setRegSecurityAnswer] = useState('');
  const [regAvatarColor, setRegAvatarColor] = useState(AVATAR_COLORS[0]);
  const [showRegPassword, setShowRegPassword] = useState(false);

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

  if (!isOpen) return null;

  const resetErrors = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();
    setIsLoading(true);

    try {
      const email = signInEmail.trim().toLowerCase();
      const user = await db.users.where('email').equalsIgnoreCase(email).first();

      if (!user) {
        setErrorMessage('No user account found with this email address.');
        setIsLoading(false);
        return;
      }

      const isValid = await verifyPassword(signInPassword, user.salt, user.passwordHash);
      if (!isValid) {
        setErrorMessage('Incorrect password. Please verify and try again.');
        setIsLoading(false);
        return;
      }

      onSuccess(user, rememberMe);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Account Login
  const handleDemoSignIn = async () => {
    resetErrors();
    setIsLoading(true);
    try {
      let demoUser = await db.users.where('email').equalsIgnoreCase('demo@seen.app').first();
      if (!demoUser) {
        const salt = generateSalt();
        const passwordHash = await hashStringWithSalt('Password123!', salt);
        const securityAnswerHash = await hashStringWithSalt('luna', salt);
        demoUser = {
          id: 'user_default_demo',
          name: 'Alex Morgan',
          username: 'alex_ink',
          email: 'demo@seen.app',
          passwordHash,
          salt,
          securityQuestion: "What was your first pet's name?",
          securityAnswerHash,
          avatarColor: '#6366f1',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await db.users.add(demoUser);
      }
      if (demoUser) {
        onSuccess(demoUser, true);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage('Could not log in to demo account.');
    } finally {
      setIsLoading(false);
    }
  };

  // Register Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    if (!regName.trim()) {
      setErrorMessage('Please enter your full name.');
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
      const existing = await db.users.where('email').equalsIgnoreCase(email).first();
      if (existing) {
        setErrorMessage('An account with this email address already exists.');
        setIsLoading(false);
        return;
      }

      const salt = generateSalt();
      const passwordHash = await hashStringWithSalt(regPassword, salt);
      const securityAnswerHash = await hashStringWithSalt(regSecurityAnswer.trim().toLowerCase(), salt);

      const newUser: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: regName.trim(),
        username: email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, ''),
        email,
        passwordHash,
        salt,
        securityQuestion: regSecurityQuestion,
        securityAnswerHash,
        avatarColor: regAvatarColor,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await db.users.add(newUser);
      onSuccess(newUser, true);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create user account.');
    } finally {
      setIsLoading(false);
    }
  };

  // Password Recovery - Step 1: Find User by Email
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
      // Generate a simulated 6-digit recovery code as fallback
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setRecVerificationCode(code);
      setRecStep('answer_question');
    } catch (err: any) {
      setErrorMessage('Error finding account.');
    } finally {
      setIsLoading(false);
    }
  };

  // Password Recovery - Step 2: Verify Answer / Code and Reset Password
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

      // Update password with new salt and hash
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

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: '', percent: 0, color: 'bg-slate-700' };
    if (pwd.length < 6) return { label: 'Weak', percent: 30, color: 'bg-rose-500' };
    const hasNumber = /\d/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    const score = (hasNumber ? 1 : 0) + (hasUpper ? 1 : 0) + (hasSymbol ? 1 : 0);
    if (score >= 2 && pwd.length >= 8) return { label: 'Strong', percent: 100, color: 'bg-emerald-500' };
    return { label: 'Good', percent: 65, color: 'bg-amber-500' };
  };

  const strength = getPasswordStrength(regPassword);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {mode === 'signin' && 'Sign In to SEEN'}
                {mode === 'register' && 'Create Your Account'}
                {mode === 'recover' && 'Password Recovery'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'signin' && 'Access all your notebooks & offline synced notes'}
                {mode === 'register' && 'Join SEEN with encrypted offline-first storage'}
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
        {mode !== 'recover' && (
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
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {/* ================= SIGN IN TAB ================= */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4 pt-1">
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

              {/* Demo Account Helper */}
              <div className="pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleDemoSignIn}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800/70 border border-slate-700/80 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Try Demo Account (Alex Morgan)</span>
                </button>
              </div>
            </form>
          )}

          {/* ================= REGISTER TAB ================= */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="e.g. Maya Lin"
                    className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

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
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
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

              {/* Password Strength Bar */}
              {regPassword && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Password Strength</span>
                    <span className="font-semibold text-slate-300">{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: `${strength.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Security Question for Password Recovery */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Security Question <span className="text-[10px] text-indigo-400 font-normal">(Used for Recovery)</span>
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
                  placeholder="Your private secret answer"
                  className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Avatar Color */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Avatar Color</label>
                <div className="flex items-center gap-2">
                  {AVATAR_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setRegAvatarColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        regAvatarColor === c ? 'border-white scale-110 shadow-md' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-98 transition disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Create Account & Sign In</span>
              </button>
            </form>
          )}

          {/* ================= PASSWORD RECOVERY TAB ================= */}
          {mode === 'recover' && (
            <div className="space-y-4 pt-1">
              {recStep === 'find_email' && (
                <form onSubmit={handleRecoveryLookup} className="space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Enter the email address associated with your SEEN account to verify your identity and reset your password.
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
                        <p className="text-[11px] text-slate-400">Simulation code generated for your session:</p>
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
