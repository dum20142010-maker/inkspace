import React, { useState, useRef, useEffect } from 'react';
import { TextObject } from '../../types/notebook';
import {
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Palette,
  Minus,
  Plus
} from 'lucide-react';

interface TextBoxOverlayProps {
  text: TextObject;
  zoomScale: number;
  isSelected: boolean;
  onUpdate: (updated: TextObject) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

const FONT_FAMILIES = [
  { name: 'Sans', value: 'Plus Jakarta Sans' },
  { name: 'Inter', value: 'Inter' },
  { name: 'Serif', value: 'Playfair Display' },
  { name: 'Handwritten', value: 'Caveat' },
  { name: 'Monospace', value: 'Fira Code' },
  { name: 'Georgia', value: 'Georgia' }
];

const FONT_SIZES = [12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 42, 48, 64];

const TEXT_COLORS = [
  '#0f172a',
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#d97706',
  '#9333ea',
  '#ec4899',
  '#ffffff'
];

export const TextBoxOverlay: React.FC<TextBoxOverlayProps> = ({
  text,
  zoomScale,
  isSelected,
  onUpdate,
  onDelete,
  onSelect
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isSelected || text.content === '') {
      textareaRef.current?.focus();
    }
  }, [isSelected]);

  // Auto-resize textarea height as user types or changes font size
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(60, textareaRef.current.scrollHeight)}px`;
    }
  }, [text.content, text.fontSize, zoomScale]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...text, content: e.target.value });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();

    // Keyboard shortcuts for Rich Text Formatting
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        onUpdate({ ...text, isBold: !text.isBold });
      } else if (key === 'i') {
        e.preventDefault();
        onUpdate({ ...text, isItalic: !text.isItalic });
      } else if (key === 'u') {
        e.preventDefault();
        onUpdate({ ...text, isUnderline: !text.isUnderline });
      }
    }
  };

  return (
    <div
      onClick={e => {
        e.stopPropagation();
        onSelect(text.id);
      }}
      className={`absolute group cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-indigo-500 rounded-xl bg-indigo-500/5 z-30 shadow-xl'
          : 'hover:ring-1 hover:ring-indigo-400/40'
      }`}
      style={{
        left: text.x * zoomScale,
        top: text.y * zoomScale,
        width: Math.max(180, text.width * zoomScale),
        minHeight: Math.max(60, text.height * zoomScale)
      }}
    >
      {/* Floating Rich Text Formatting Toolbar when selected */}
      {isSelected && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute -top-16 left-0 z-40 flex items-center gap-1.5 rounded-2xl bg-slate-900/95 border border-slate-700/80 p-2 shadow-2xl backdrop-blur-md text-xs text-slate-200 animate-in fade-in zoom-in-95"
        >
          {/* Bold, Italic, Underline Controls */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/50">
            <button
              onClick={() => onUpdate({ ...text, isBold: !text.isBold })}
              className={`p-1.5 rounded-md transition ${
                text.isBold ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Bold (Ctrl+B / ⌘B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdate({ ...text, isItalic: !text.isItalic })}
              className={`p-1.5 rounded-md transition ${
                text.isItalic ? 'bg-indigo-600 text-white italic' : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Italic (Ctrl+I / ⌘I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdate({ ...text, isUnderline: !text.isUnderline })}
              className={`p-1.5 rounded-md transition ${
                text.isUnderline ? 'bg-indigo-600 text-white underline' : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Underline (Ctrl+U / ⌘U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-700 my-auto" />

          {/* Font Family Selector Dropdown */}
          <select
            value={text.fontFamily || 'Plus Jakarta Sans'}
            onChange={e => onUpdate({ ...text, fontFamily: e.target.value })}
            className="bg-slate-800 text-slate-200 text-[11px] font-medium rounded-lg px-2 py-1 border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            title="Font Family"
          >
            {FONT_FAMILIES.map(font => (
              <option key={font.value} value={font.value}>
                {font.name}
              </option>
            ))}
          </select>

          <div className="h-4 w-[1px] bg-slate-700 my-auto" />

          {/* Font Size Controls & Stepper */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/50">
            <button
              onClick={() => onUpdate({ ...text, fontSize: Math.max(10, text.fontSize - 2) })}
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Decrease Font Size"
            >
              <Minus className="w-3 h-3" />
            </button>

            <select
              value={text.fontSize}
              onChange={e => onUpdate({ ...text, fontSize: Number(e.target.value) })}
              className="bg-transparent text-slate-200 text-[11px] font-mono font-bold px-1 focus:outline-none cursor-pointer"
              title="Select Font Size"
            >
              {FONT_SIZES.map(s => (
                <option key={s} value={s} className="bg-slate-900 text-white">
                  {s}px
                </option>
              ))}
            </select>

            <button
              onClick={() => onUpdate({ ...text, fontSize: Math.min(96, text.fontSize + 2) })}
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Increase Font Size"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-700 my-auto" />

          {/* Alignment Controls */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/50">
            <button
              onClick={() => onUpdate({ ...text, align: 'left' })}
              className={`p-1.5 rounded-md transition ${
                text.align === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Align Left"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdate({ ...text, align: 'center' })}
              className={`p-1.5 rounded-md transition ${
                text.align === 'center' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Align Center"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdate({ ...text, align: 'right' })}
              className={`p-1.5 rounded-md transition ${
                text.align === 'right' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Align Right"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-700 my-auto" />

          {/* Color Swatches & Custom Picker */}
          <div className="flex items-center gap-1">
            {TEXT_COLORS.map(c => (
              <button
                key={c}
                onClick={() => onUpdate({ ...text, color: c })}
                className={`w-3.5 h-3.5 rounded-full border ${
                  text.color === c ? 'ring-2 ring-indigo-400 scale-110 border-white' : 'border-white/20 hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
                title={`Text Color ${c}`}
              />
            ))}
            <label className="w-4 h-4 rounded-full border border-slate-600 cursor-pointer overflow-hidden flex items-center justify-center hover:scale-105 transition" title="Custom Text Color">
              <input
                type="color"
                value={text.color || '#0f172a'}
                onChange={e => onUpdate({ ...text, color: e.target.value })}
                className="w-6 h-6 -m-1 cursor-pointer bg-transparent border-0"
              />
            </label>
          </div>

          <div className="h-4 w-[1px] bg-slate-700 my-auto" />

          {/* Delete Text Box */}
          <button
            onClick={() => onDelete(text.id)}
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
            title="Delete Text Box"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editable Text Area (Clean empty workspace with zero pre-filled wordings) */}
      <textarea
        ref={textareaRef}
        value={text.content}
        onChange={handleContentChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyDown}
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        className="w-full bg-transparent resize-none border-none outline-none p-1.5 cursor-text overflow-hidden"
        style={{
          fontSize: `${text.fontSize * zoomScale}px`,
          fontFamily: text.fontFamily || 'Plus Jakarta Sans',
          color: text.color || '#0f172a',
          fontWeight: text.isBold ? 'bold' : 'normal',
          fontStyle: text.isItalic ? 'italic' : 'normal',
          textDecoration: text.isUnderline ? 'underline' : 'none',
          textAlign: text.align || 'left',
          lineHeight: 1.4
        }}
        placeholder=""
      />
    </div>
  );
};
