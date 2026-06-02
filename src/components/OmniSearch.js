import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Maximize2, CornerDownLeft } from 'lucide-react';

/** Matches CDA welcome options 1, 3, 4 — option 2 (local insights) not shipped */
const STATIC_HINTS = {
  1: [
    'What is the Samaajadata Collective?',
    'How does Samaaj Data help citizens who act on local problems?',
    'Tell me about the Solve Ninja movement and Reap Benefit.',
  ],
  3: [
    'I have an idea and need mentoring',
    'I want to start a campus waste audit — guide me step by step.',
    'Help me shape my civic project before I talk to officials.',
  ],
  4: [
    'I have a problem and need solutions',
    'Show me Cleanliness & Waste solutions for my neighborhood.',
    'Help me with safety and street improvements in my area.',
    'Find missions for Water & Climate action near me.',
  ],
};

const OPTION_META = {
  1: { label: 'About', className: 'text-sky-400/90 bg-sky-500/10 border-sky-500/20' },
  3: { label: 'Mentor', className: 'text-violet-400/90 bg-violet-500/10 border-violet-500/20' },
  4: { label: 'Solve', className: 'text-amber-400/90 bg-amber-500/10 border-amber-500/20' },
};

function buildHints({ cityName, issueCount, viewportCounts }) {
  const hints = [];

  STATIC_HINTS[1].forEach((text) => hints.push({ option: 1, text }));
  STATIC_HINTS[3].forEach((text) => hints.push({ option: 3, text }));
  STATIC_HINTS[4].forEach((text) => hints.push({ option: 4, text }));

  if (issueCount > 0) {
    hints.push({
      option: 4,
      text: `${issueCount.toLocaleString()} civic points in this view — help me prioritize what to fix.`,
    });
  }

  const ranked = Object.entries(viewportCounts || {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (ranked.length > 0) {
    const [category, count] = ranked[0];
    hints.push({
      option: 4,
      text: `${count.toLocaleString()} ${category}-related points visible — what can citizens do here?`,
    });
  }

  if (cityName) {
    hints.push({
      option: 4,
      text: `Problems in ${cityName} — what solutions have worked for other citizens?`,
    });
    hints.push({
      option: 3,
      text: `I have a civic idea for ${cityName} and need mentoring.`,
    });
  }

  return hints;
}

export default function OmniSearch({
  onExpand,
  onSend,
  cityName = '',
  issueCount = 0,
  viewportCounts = {},
}) {
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [query, setQuery] = useState('');

  const hints = useMemo(
    () => buildHints({ cityName, issueCount, viewportCounts }),
    [cityName, issueCount, viewportCounts]
  );

  useEffect(() => {
    setPlaceholderIdx(0);
  }, [hints.length, cityName, issueCount]);

  useEffect(() => {
    if (hints.length === 0) return undefined;
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % hints.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [hints.length]);

  const activeHint = hints[placeholderIdx] || hints[0];
  const meta = activeHint ? OPTION_META[activeHint.option] : null;

  const handleSend = () => {
    if (query.trim()) {
      onSend(query);
      setQuery('');
    } else {
      onExpand();
    }
  };

  return (
    <motion.div
      initial={{ y: 50, x: '-50%', opacity: 0 }}
      animate={{ y: 0, x: '-50%', opacity: 1 }}
      className="absolute bottom-12 left-1/2 w-full max-w-2xl z-[300]"
    >
      <div className="relative group flex items-center bg-[#121212]/90 backdrop-blur-3xl border border-zinc-700/60 hover:border-zinc-500/80 rounded-[32px] p-3 pl-8 shadow-[0_20px_40px_rgba(0,0,0,0.6)] transition-all duration-300">
        <Sparkles className="w-6 h-6 text-emerald-400 shrink-0" />

        <div className="relative flex-1 h-12 ml-4 flex items-center overflow-hidden min-w-0">
          <AnimatePresence mode="wait">
            {!query && activeHint && (
              <motion.div
                key={`${placeholderIdx}-${activeHint.text}`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center gap-2 pointer-events-none min-w-0 pr-2"
              >
                {meta && (
                  <span
                    className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                )}
                <span className="text-base font-medium text-zinc-400 truncate">
                  {activeHint.text}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="w-full h-full bg-transparent text-base font-medium text-white placeholder-transparent focus:outline-none z-10"
            placeholder="Ask anything..."
          />
        </div>

        <div className="flex items-center gap-2 pr-2 shrink-0">
          <button
            type="button"
            onClick={onExpand}
            className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors mr-2"
            title="Open assistant menu"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="h-10 px-4 rounded-full flex items-center justify-center bg-white text-black hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all gap-1.5"
          >
            <span className="text-sm font-bold">Enter</span>
            <CornerDownLeft className="w-4 h-4" strokeWidth={3} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
