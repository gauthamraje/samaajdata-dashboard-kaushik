import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';
import {
  Sparkles,
  ArrowUp,
  Home,
  Info,
  BarChart3,
  Users,
  AlertTriangle,
  FileText,
  X,
} from 'lucide-react';
import {
  createThread,
  getStoredThreadId,
  clearStoredThreadId,
  sendAndAwaitReply,
  checkHealth,
} from '../services/cdaClient';
import { CDA_API_BASE } from '../config';

marked.setOptions({ breaks: true });

const THREAD_OPTIONS = [
  {
    id: 1,
    title: 'Know about Samaajadata Collective',
    phrase: 'Know about Samaajadata Collective',
    icon: Info,
  },
  {
    id: 2,
    title: 'Get Insights from Local Data',
    phrase: 'Get Insights from Local Data',
    icon: BarChart3,
  },
  {
    id: 3,
    title: 'I have an idea and need mentoring',
    phrase: 'I have an idea and need mentoring',
    icon: Users,
  },
  {
    id: 4,
    title: 'I have a problem need solutions',
    phrase: 'I have a problem need solutions',
    icon: AlertTriangle,
  },
];

const THEME_CHIPS = [
  { label: '🌍 Cleanliness & Waste', value: 'Show me Cleanliness & Waste solutions' },
  { label: '💡 Safety & Streets', value: 'Help me with Safety & Street improvements' },
  { label: '🏫 Eco-Campus', value: 'How can I make my School/College greener?' },
  { label: '💧 Water & Climate', value: 'Find missions for Water & Climate action' },
];

const OPTION_2_STUB =
  "We are currently working on this section—**stay tuned!** 🚀\n\nIn the meantime, feel free to click the **Home button** (top-right) to explore other options.";

const OPTION_4_INTRO =
  "I'm ready to help you solve a local problem! \n\nWhat kind of issue are you facing? You can pick a category below or tell me in your own words.";

function stripCitations(text) {
  return text.replace(/【\d+:\d+†source】/g, '');
}

function parseAssistantContent(raw) {
  const cleaned = stripCitations(raw);
  const parts = cleaned.split('---');
  return {
    main: parts[0],
    blueprint: parts.length > 1 ? parts.slice(1).join('---') : null,
  };
}

function ChatMarkdown({ content, className = '' }) {
  return (
    <div
      className={`cda-markdown text-[15px] leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: marked.parse(content) }}
    />
  );
}

export default function CivicAssistant({ initialQuery = '', onQueryConsumed }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [chips, setChips] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContent, setDrawerContent] = useState('');
  const [initError, setInitError] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  const scrollRef = useRef(null);
  const threadIdRef = useRef(null);
  const skipWelcomeRef = useRef(Boolean(initialQuery?.trim()));
  const initialQueryRef = useRef(initialQuery);
  const onQueryConsumedRef = useRef(onQueryConsumed);
  onQueryConsumedRef.current = onQueryConsumed;

  threadIdRef.current = threadId;

  const appendMessage = useCallback((role, content, blueprint = null) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        role,
        content,
        blueprint,
      },
    ]);
  }, []);

  const maybeShowThemeChips = useCallback((text) => {
    const lower = text.toLowerCase();
    if (
      lower.includes('passionate about') ||
      lower.includes('theme') ||
      lower.includes('area')
    ) {
      setChips(THEME_CHIPS);
    }
  }, []);

  const sendToApi = useCallback(
    async (text, tid = threadIdRef.current) => {
      if (!tid || !text?.trim()) return;
      setIsTyping(true);
      setChips([]);
      try {
        const reply = await sendAndAwaitReply(tid, text.trim());
        const { main, blueprint } = parseAssistantContent(reply);
        appendMessage('assistant', main, blueprint);
        maybeShowThemeChips(reply);
      } catch (err) {
        appendMessage(
          'assistant',
          err.message ||
            "I'm sorry, I'm having trouble connecting. Please try resetting the conversation."
        );
      } finally {
        setIsTyping(false);
      }
    },
    [appendMessage, maybeShowThemeChips]
  );

  const handleUserSend = useCallback(
    async (text) => {
      const query = (typeof text === 'string' ? text : inputValue).trim();
      if (!query || isTyping) return;
      appendMessage('user', query);
      setInputValue('');
      await sendToApi(query);
    },
    [appendMessage, inputValue, isTyping, sendToApi]
  );

  useEffect(() => {
    let cancelled = false;

    async function initSession() {
      setInitError(null);
      const health = await checkHealth();
      if (!health || health.status !== 'ok') {
        if (!cancelled) {
          setInitError(
            `Cannot reach Citizen Data Assistant at ${CDA_API_BASE}. Start the API locally (uvicorn main:app) or set REACT_APP_CDA_API_URL.`
          );
        }
        return;
      }

      try {
        let tid = getStoredThreadId();
        const isNew = !tid;
        if (!tid) {
          tid = await createThread();
        }
        if (cancelled) return;

        setThreadId(tid);
        setSessionReady(true);

        if (skipWelcomeRef.current && initialQueryRef.current?.trim()) {
          setShowWelcome(false);
          appendMessage('user', initialQueryRef.current.trim());
          await sendToApi(initialQueryRef.current.trim(), tid);
          onQueryConsumedRef.current?.();
        } else if (isNew) {
          setShowWelcome(true);
        } else {
          appendMessage(
            'assistant',
            'Welcome back! Ready to continue your change-maker journey?'
          );
        }
      } catch (err) {
        if (!cancelled) {
          setInitError(err.message || 'Failed to start assistant session.');
        }
      }
    }

    initSession();
    return () => {
      cancelled = true;
    };
  }, [appendMessage, sendToApi]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, chips, showWelcome]);

  const handleSelectOption = async (option) => {
    setShowWelcome(false);

    if (option.id === 2) {
      appendMessage('assistant', OPTION_2_STUB);
      return;
    }

    if (option.id === 4) {
      appendMessage('assistant', OPTION_4_INTRO);
      setChips(THEME_CHIPS);
      return;
    }

    await handleUserSend(option.phrase);
  };

  const resetSession = async () => {
    clearStoredThreadId();
    setMessages([]);
    setChips([]);
    setDrawerOpen(false);
    setInputValue('');
    setIsTyping(false);
    setSessionReady(false);
    setShowWelcome(false);

    try {
      const tid = await createThread();
      setThreadId(tid);
      setSessionReady(true);
      setShowWelcome(true);
    } catch (err) {
      setInitError(err.message || 'Failed to reset session.');
    }
  };

  return (
    <motion.div
      key="tab-assistant"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full absolute inset-0 bg-[#121212] overflow-hidden"
    >
      <div className="p-4 pb-3 shrink-0 border-b border-zinc-800/50 bg-[#121212] z-20 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white tracking-tight truncate">
              Citizen Data Assistant
            </h2>
            <p className="text-[11px] text-emerald-400/80 uppercase tracking-wider font-medium">
              Samaajadata Knowledge Shield
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={resetSession}
          title="Back to main menu"
          className="w-9 h-9 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center shrink-0 transition-colors"
        >
          <Home className="w-4 h-4" />
        </button>
      </div>

      {initError && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          {initError}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar scroll-smooth relative">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
            )}
            <div
              className={`max-w-[88%] ${
                msg.role === 'user'
                  ? 'bg-[#1E1F20] text-white rounded-3xl px-4 py-3'
                  : 'text-zinc-200'
              }`}
            >
              <ChatMarkdown content={msg.content} />
              {msg.blueprint && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerContent(msg.blueprint);
                    setDrawerOpen(true);
                  }}
                  className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg hover:bg-emerald-500/20 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View My Action Blueprint
                </button>
              )}
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <div className="flex justify-start items-center gap-2 pl-10 text-zinc-400 text-sm">
            <span className="w-1.5 h-1.5 bg-emerald-500/60 rounded-full animate-bounce" />
            <span
              className="w-1.5 h-1.5 bg-emerald-500/60 rounded-full animate-bounce"
              style={{ animationDelay: '0.2s' }}
            />
            <span
              className="w-1.5 h-1.5 bg-emerald-500/60 rounded-full animate-bounce"
              style={{ animationDelay: '0.4s' }}
            />
            <span className="ml-1">Mentor is reflecting...</span>
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <div className="shrink-0 px-4 pb-2 border-t border-zinc-800/40 pt-3">
          <p className="text-[11px] text-zinc-500 font-medium mb-2 px-1">
            Explore Solution Categories:
          </p>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                disabled={isTyping}
                onClick={() => handleUserSend(chip.value)}
                className="text-xs px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 hover:bg-emerald-500/15 hover:text-emerald-300 border border-transparent hover:border-emerald-500/30 transition-colors disabled:opacity-40"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="shrink-0 p-4 pt-2 bg-gradient-to-t from-[#121212] via-[#121212] to-transparent relative z-10">
        <div className="relative flex items-end bg-[#1E1F20] border border-zinc-700/30 rounded-3xl p-2 shadow-xl focus-within:bg-[#2A2B2D] transition-colors">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleUserSend();
              }
            }}
            disabled={!sessionReady || isTyping || !!initError}
            placeholder="Tell me what problem you found..."
            className="w-full bg-transparent text-[15px] text-white placeholder-zinc-500 focus:outline-none resize-none py-3 px-4 max-h-32 custom-scrollbar disabled:opacity-50"
            rows={1}
            style={{ minHeight: '44px' }}
          />
          <button
            type="button"
            onClick={() => handleUserSend()}
            disabled={!inputValue.trim() || isTyping || !sessionReady || !!initError}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mb-1 mr-1 transition-all disabled:opacity-30 disabled:hover:scale-100 disabled:bg-zinc-800 disabled:text-zinc-500 bg-white text-black hover:bg-zinc-200 hover:scale-105 active:scale-95"
          >
            <ArrowUp className="w-5 h-5" strokeWidth={3} />
          </button>
        </div>
        <button
          type="button"
          onClick={resetSession}
          className="w-full mt-2 text-[11px] text-zinc-500 hover:text-zinc-400 underline"
        >
          Reset conversation
        </button>
      </div>

      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-[#121212] flex flex-col p-5 overflow-y-auto custom-scrollbar"
          >
            <div className="mt-2 mb-4">
              <h1 className="text-2xl font-bold text-white leading-tight">
                Citizen Data
                <br />
                Assistant
              </h1>
              <p className="text-zinc-400 mt-2 text-sm">
                Unlock local insights with Samaajadata Collective. How can I help you today?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1 content-start">
              {THREAD_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className="text-left bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-zinc-100 leading-snug">
                      {opt.title}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-center text-[11px] text-zinc-500 mt-6 pb-2">
              Empowering Citizens with Data
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col justify-end"
            onClick={() => setDrawerOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="bg-[#1a1a1a] border-t border-zinc-700 rounded-t-3xl max-h-[85vh] overflow-y-auto p-6 custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-zinc-600 rounded-full mx-auto mb-5" />
              <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-widest font-semibold mb-4">
                <FileText className="w-3.5 h-3.5" />
                Action Blueprint &amp; Checklist
              </div>
              <div className="bg-emerald-500/5 border-b-2 border-emerald-500/30 rounded-lg px-4 py-3 text-sm text-zinc-400 mb-5">
                <strong className="text-emerald-400">PRO TIP:</strong> These details are your{' '}
                <strong>Secret Codes</strong>—use the specific names and law codes below when
                speaking with officials.
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <ChatMarkdown content={drawerContent} className="text-zinc-300" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
