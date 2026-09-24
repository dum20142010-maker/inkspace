import React from 'react';
import { Mic, MicOff, Square, Volume2, Sparkles, Check } from 'lucide-react';

interface VoiceDictationBarProps {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  errorMessage?: string | null;
  onStop: () => void;
  onClear: () => void;
}

export const VoiceDictationBar: React.FC<VoiceDictationBarProps> = ({
  isListening,
  transcript,
  interimTranscript,
  errorMessage,
  onStop,
  onClear
}) => {
  if (!isListening && !transcript && !errorMessage) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="rounded-3xl bg-[#0c1017]/95 border border-rose-500/40 p-4 shadow-2xl backdrop-blur-md text-slate-100 flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-rose-400 opacity-75" />
              <div className="w-3 h-3 rounded-full bg-rose-500" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Voice Dictation</span>
              <span className="text-[10px] font-mono text-rose-300 bg-rose-500/20 px-1.5 py-0.2 rounded border border-rose-500/30">
                English (en-US)
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {transcript && (
              <button
                onClick={onClear}
                className="px-2.5 py-1 rounded-xl bg-slate-800/80 text-[11px] font-bold text-slate-300 hover:text-white transition"
              >
                Clear
              </button>
            )}
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition shadow-md shadow-rose-500/20"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Finish Dictation</span>
            </button>
          </div>
        </div>

        {/* Live Transcript Display Box */}
        <div className="p-3 rounded-2xl bg-[#111622] border border-slate-800 text-xs font-sans leading-relaxed min-h-[50px] max-h-32 overflow-y-auto custom-scrollbar">
          {errorMessage ? (
            <p className="text-rose-400 font-semibold">{errorMessage}</p>
          ) : transcript || interimTranscript ? (
            <p className="text-white font-medium">
              <span>{transcript}</span>
              <span className="text-amber-300 italic opacity-80 pl-1">{interimTranscript}</span>
            </p>
          ) : (
            <p className="text-slate-500 italic flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 animate-pulse text-slate-400" />
              <span>Speak clearly into your microphone... Live English transcript will appear here on your page.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
