import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Copy,
  Check,
  Plus,
  Volume2,
  VolumeX,
  Send,
  Loader2,
  FileText,
  RefreshCw,
  HelpCircle,
  Bot,
  User as UserIcon,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface AIReaderPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pageImage: string | null;
  pageIndex: number;
  onInsertTextToPage?: (text: string) => void;
}

export const AIReaderPanel: React.FC<AIReaderPanelProps> = ({
  isOpen,
  onClose,
  pageImage,
  pageIndex,
  onInsertTextToPage
}) => {
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [inserted, setInserted] = useState<boolean>(false);

  // Q&A Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userQuery, setUserQuery] = useState<string>('');
  const [isAnswering, setIsAnswering] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-transcribe when panel opens with a page image
  useEffect(() => {
    if (isOpen && pageImage) {
      handleTranscribePage(pageImage);
    }
  }, [isOpen, pageImage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAnswering]);

  const handleTranscribePage = async (image: string) => {
    setIsLoading(true);
    setError(null);
    setTranscription(null);

    try {
      const response = await fetch('/api/ai/transcribe-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze handwriting.');
      }

      setTranscription(data.transcription);
    } catch (err: any) {
      console.error('Transcription error:', err);
      setError(err.message || 'Error processing page image with AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendQuestion = async (questionText?: string) => {
    const q = questionText || userQuery;
    if (!q.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: q.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!questionText) setUserQuery('');
    setIsAnswering(true);

    try {
      const response = await fetch('/api/ai/ask-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: pageImage,
          transcription: transcription || '',
          question: q.trim()
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process question');
      }

      const aiMsg: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        text: data.reply,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Q&A error:', err);
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'ai',
        text: `⚠️ Sorry, couldn't process your query: ${err.message}`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleCopy = () => {
    if (!transcription) return;
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!transcription) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(transcription.replace(/[#*`_]/g, ''));
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleInsert = () => {
    if (!transcription || !onInsertTextToPage) return;
    onInsertTextToPage(transcription);
    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-16 bottom-0 w-96 max-w-full bg-slate-900 border-l border-slate-800 z-40 flex flex-col shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-indigo-500 to-purple-500 p-0.5 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[6px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              AI Reader
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                Pakka Clear
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Page {pageIndex + 1} Handwriting Decoder</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          title="Close AI Reader"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {/* Page Thumbnail Preview & Rescan */}
        {pageImage && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-3 relative group">
            <div className="w-16 h-20 bg-slate-900 rounded border border-slate-800 overflow-hidden flex-shrink-0 relative">
              <img src={pageImage} alt="Page snapshot" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Page {pageIndex + 1} Snapshot
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Long-press stylus anywhere on canvas to re-scan.
              </p>
              <button
                onClick={() => handleTranscribePage(pageImage)}
                disabled={isLoading}
                className="mt-2 text-[11px] font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                Re-scan Page Handwriting
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-5 flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/30">
                <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
              </div>
              <div className="absolute -inset-1 rounded-full bg-amber-500/20 blur animate-pulse -z-10" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-amber-300">Deciphering Handwriting...</h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Reading cursive notes, formulas, and doctor's scribbles with Gemini 3.8 AI
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-red-300">Scan Failed</h4>
              <p className="text-[11px] text-red-200/80 mt-1">{error}</p>
              <button
                onClick={() => pageImage && handleTranscribePage(pageImage)}
                className="mt-2 px-2.5 py-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded text-[11px] font-medium transition"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Transcribed "Pakka Clear" Output */}
        {transcription && !isLoading && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Crystal-Clear Version
              </span>
              <span className="text-[10px] text-slate-400">100% Readable</span>
            </div>

            {/* Markdown Styled Text Output */}
            <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto custom-scrollbar font-sans bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
              {transcription}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={handleCopy}
                className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition"
                title="Copy clean text"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    Copy
                  </>
                )}
              </button>

              <button
                onClick={handleInsert}
                disabled={!onInsertTextToPage}
                className="flex-1 py-1.5 px-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition"
                title="Insert text box on canvas"
              >
                {inserted ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Inserted!
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Add to Page
                  </>
                )}
              </button>

              <button
                onClick={handleSpeak}
                className={`py-1.5 px-2.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition ${
                  isSpeaking
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title="Read clear text aloud"
              >
                {isSpeaking ? (
                  <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Interactive Q&A Assistant */}
        <div className="border-t border-slate-800/80 pt-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            Ask AI Help About This Page
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap gap-1.5">
            {[
              '💡 Explain step-by-step',
              '📝 Summarize page',
              '🧮 Solve equations',
              '🌐 Translate to Spanish',
              '💊 Explain medical terms'
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendQuestion(chip)}
                disabled={isAnswering}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-[10.5px] font-medium text-slate-300 hover:text-white rounded-full border border-slate-700/60 transition"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          {chatMessages.length > 0 && (
            <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-2 text-xs ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.sender === 'ai' && (
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-none whitespace-pre-wrap'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 flex-shrink-0 mt-0.5">
                      <UserIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {isAnswering && (
                <div className="flex gap-2 text-xs items-center text-slate-400">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <span>Gemini AI thinking...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendQuestion();
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              value={userQuery}
              onChange={e => setUserQuery(e.target.value)}
              placeholder="Ask anything about this page..."
              disabled={isAnswering}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition"
            />
            <button
              type="submit"
              disabled={isAnswering || !userQuery.trim()}
              className="p-2 bg-gradient-to-tr from-amber-500 to-indigo-600 text-white rounded-lg hover:opacity-90 disabled:opacity-40 transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
