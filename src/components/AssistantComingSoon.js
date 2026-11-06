import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Copy, Check } from 'lucide-react';
import { MCP_URL } from '../config';

const EXAMPLE_QUESTIONS = [
  'What datasets are available on SamaajData?',
  'Which datasets have information on water and sanitation?',
  'Summarise one of these datasets by district.',
];

// navigator.clipboard is unavailable on non-HTTPS pages and in some browsers.
function copyWithTextarea(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  return ok;
}

function CopyButton({ text, label }) {
  const [status, setStatus] = useState('idle');

  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (err) {
      ok = copyWithTextarea(text);
      if (!ok) console.error('[SamaajData] Copy failed:', err);
    }
    setStatus(ok ? 'copied' : 'failed');
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <button
      onClick={copy}
      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
      aria-label={label}
    >
      {status === 'copied' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {status === 'copied' ? 'Copied' : status === 'failed' ? 'Select & copy' : 'Copy'}
    </button>
  );
}

export default function AssistantComingSoon({ initialQuery }) {
  const query = initialQuery && initialQuery.trim();

  return (
    <motion.div
      key="tab-assistant"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="p-8 flex flex-col gap-6 h-full overflow-y-auto absolute inset-0"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-emerald-400" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
          Coming soon
        </span>
      </div>

      <div>
        <h2 className="text-lg font-medium text-zinc-100 mb-2">AI Data Assistant</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          We're building an assistant right here in SamaajData that answers questions about your area from our data.
          In the meantime, you can explore SamaajData's datasets with Claude by connecting the SamaajData MCP server.
        </p>
      </div>

      {query && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Your question</p>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-zinc-200 leading-relaxed">"{query}"</p>
            <CopyButton text={query} label="Copy your question" />
          </div>
          <p className="text-xs text-zinc-500 mt-2">Once connected, ask this in Claude.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Connect SamaajData to Claude</p>

        <div className="flex gap-3">
          <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center shrink-0">1</span>
          <p className="text-sm text-zinc-300 leading-relaxed">
            In Claude, open <span className="text-zinc-100 font-medium">Settings → Connectors</span> and choose{' '}
            <span className="text-zinc-100 font-medium">Add custom connector</span>.
          </p>
        </div>

        <div className="flex gap-3">
          <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center shrink-0">2</span>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <p className="text-sm text-zinc-300 leading-relaxed">
              Name it <span className="text-zinc-100 font-medium">SamaajData</span> and paste this URL:
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-black/40 pl-3 pr-1.5 py-1.5">
              <code className="flex-1 min-w-0 break-all select-all text-xs text-emerald-300">{MCP_URL}</code>
              <CopyButton text={MCP_URL} label="Copy MCP server URL" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center shrink-0">3</span>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Start a new chat, make sure the SamaajData connector is turned on, and ask away.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Try asking</p>
        {EXAMPLE_QUESTIONS.map(q => (
          <p key={q} className="text-sm text-zinc-400 rounded-lg border border-zinc-800/80 px-3 py-2">{q}</p>
        ))}
      </div>
    </motion.div>
  );
}
