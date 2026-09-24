import React, { useState, useRef } from 'react';
import { User } from '../../types/notebook';
import {
  X,
  User as UserIcon,
  Mail,
  Lock,
  Sparkles,
  Save,
  CheckCircle2,
  Shield,
  Palette,
  Briefcase,
  FileText,
  Upload,
  Trash2,
  Camera
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  currentUser: User | null;
  onClose: () => void;
  onUpdateUser: (updatedUser: User) => void;
}

const AVATAR_COLORS = [
  '#f59e0b', // Amber
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#a855f7', // Violet
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316'  // Orange
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onUpdateUser
}) => {
  if (!isOpen || !currentUser) return null;

  const [name, setName] = useState(currentUser.name || '');
  const [username, setUsername] = useState(currentUser.username || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [workplace, setWorkplace] = useState(currentUser.workplace || '');
  const [avatarColor, setAvatarColor] = useState(currentUser.avatarColor || '#f59e0b');
  const [avatarImage, setAvatarImage] = useState(currentUser.avatarImage || '');
  const [emailVisibility, setEmailVisibility] = useState<'public' | 'connections' | 'private'>(
    currentUser.emailVisibility || 'public'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setAvatarImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaving(true);

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          name: name.trim(),
          username: username.replace(/^@/, '').trim(),
          bio,
          workplace,
          avatarColor,
          avatarImage,
          emailVisibility
        })
      }).then(r => r.json());

      if (res.success && res.user) {
        onUpdateUser(res.user);
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setErrorMsg('Failed to reach server to save profile changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-[#0c1017] border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-slate-950 text-base shadow-md overflow-hidden relative"
              style={{ backgroundColor: avatarImage ? 'transparent' : avatarColor }}
            >
              {avatarImage ? (
                <img src={avatarImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{name[0]?.toUpperCase() || 'U'}</span>
              )}
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-white">Edit User Profile</h2>
              <p className="text-xs text-slate-400">Upload profile photo, customize name & bio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {saveSuccess && (
          <div className="my-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Profile saved successfully!</span>
          </div>
        )}

        {errorMsg && (
          <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4 my-4">
          {/* Custom Profile Photo Upload */}
          <div className="p-4 rounded-2xl bg-[#111622] border border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-white flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-amber-400" />
              <span>Custom Profile Photo</span>
            </label>

            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl border-2 border-slate-700 flex items-center justify-center overflow-hidden bg-slate-900 shadow-inner shrink-0"
                style={{ backgroundColor: avatarImage ? 'transparent' : avatarColor }}
              >
                {avatarImage ? (
                  <img src={avatarImage} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-slate-950">{name[0]?.toUpperCase() || 'U'}</span>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>

                  {avatarImage && (
                    <button
                      type="button"
                      onClick={() => setAvatarImage('')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 font-semibold text-xs transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Upload any JPG, PNG or WebP photo to use as your profile picture.
                </p>
              </div>
            </div>
          </div>

          {/* Avatar Color Selection (Fallback) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Badge Color (When no photo is used)</span>
            </label>
            <div className="flex items-center gap-2.5">
              {AVATAR_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    avatarColor === color ? 'border-white scale-110 shadow-md' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Display Name & Handle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-xl bg-[#111622] border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Username Handle</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">@</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full rounded-xl bg-[#111622] border border-slate-800 pl-7 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Bio & Workplace */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Short Bio</label>
            <textarea
              rows={2}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell collaborators about your focus or discipline..."
              className="w-full rounded-xl bg-[#111622] border border-slate-800 p-3 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Workplace / Institution</label>
            <input
              type="text"
              value={workplace}
              onChange={e => setWorkplace(e.target.value)}
              placeholder="e.g. Atelier Codex, Research Lab"
              className="w-full rounded-xl bg-[#111622] border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Email Privacy */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Email Privacy Setting</span>
            </label>
            <select
              value={emailVisibility}
              onChange={e => setEmailVisibility(e.target.value as any)}
              className="w-full rounded-xl bg-[#111622] border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="public">Public (Visible to everyone)</option>
              <option value="connections">Connections Only (Friends only)</option>
              <option value="private">Private (Hidden)</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-400 text-slate-950 py-3 text-xs font-bold hover:bg-amber-300 transition shadow-lg shadow-amber-400/10 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
