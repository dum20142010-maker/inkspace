import React, { useState } from 'react';
import { TextObject } from '../../types/notebook';
import { Trash2, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Move } from 'lucide-react';

interface TextBoxOverlayProps {
  text: TextObject;
  zoomScale: number;
  isSelected: boolean;
  onUpdate: (updated: TextObject) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

export const TextBoxOverlay: React.FC<TextBoxOverlayProps> = ({
  text,
  zoomScale,
  isSelected,
  onUpdate,
  onDelete,
  onSelect
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...text, content: e.target.value });
  };

  return (
    <div
      onClick={e => {
        e.stopPropagation();
        onSelect(text.id);
      }}
      className={`absolute group cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-indigo-500 rounded-xl bg-indigo-500/5' : 'hover:ring-1 hover:ring-indigo-400/40'
      }`}
      style={{
        left: text.x * zoomScale,
        top: text.y * zoomScale,
        width: text.width * zoomScale,
        minHeight: text.height * zoomScale
      }}
    >
      {/* Floating Formatting Toolbar when selected */}
      {isSelected && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute -top-12 left-0 z-30 flex items-center gap-1 rounded-xl bg-slate-900 border border-slate-700 p-1 shadow-xl text-xs text-slate-200"
        >
          <button
            onClick={() => onUpdate({ ...text, isBold: !text.isBold })}
            className={`p-1 rounded ${text.isBold ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdate({ ...text, isItalic: !text.isItalic })}
            className={`p-1 rounded ${text.isItalic ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <div className="h-4 w-[1px] bg-slate-800 my-auto" />
          <button
            onClick={() => onUpdate({ ...text, fontSize: Math.max(12, text.fontSize - 2) })}
            className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-[10px]"
          >
            A-
          </button>
          <span className="text-[10px] text-slate-400 font-mono">{text.fontSize}px</span>
          <button
            onClick={() => onUpdate({ ...text, fontSize: text.fontSize + 2 })}
            className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-[10px]"
          >
            A+
          </button>
          <div className="h-4 w-[1px] bg-slate-800 my-auto" />
          <button
            onClick={() => onDelete(text.id)}
            className="p-1 rounded text-rose-400 hover:bg-rose-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editable Area */}
      <textarea
        value={text.content}
        onChange={handleContentChange}
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        className="w-full h-full bg-transparent resize-none border-none outline-none p-1 font-sans"
        style={{
          fontSize: `${text.fontSize * zoomScale}px`,
          fontFamily: text.fontFamily || 'Plus Jakarta Sans',
          color: text.color || '#0f172a',
          fontWeight: text.isBold ? 'bold' : 'normal',
          fontStyle: text.isItalic ? 'italic' : 'normal',
          textAlign: text.align || 'left'
        }}
        placeholder="Type text here..."
      />
    </div>
  );
};
