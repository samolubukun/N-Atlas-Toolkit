import React from 'react';
import {
  Terminal,
  Code2,
  Server,
  Cloud,
  Container,
  Bot,
  Radio,
  Layers,
  Zap,
} from 'lucide-react';

export const ArchitectureDiagram = () => {
  return (
    <div className="not-prose font-sans whitespace-normal break-words my-6 rounded-2xl border border-stone-200/90 bg-stone-50/80 p-3.5 sm:p-6 shadow-sm text-stone-800">
      {/* Container: 100% width on desktop, horizontal scroll on mobile if needed */}
      <div className="overflow-x-auto sm:overflow-x-visible pb-1 sm:pb-0 custom-scrollbar">
        <div className="min-w-[460px] sm:min-w-0 w-full space-y-3.5 sm:space-y-4">

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              <span className="text-xs font-mono font-bold tracking-wider text-stone-900 uppercase">
                N-ATLaS Unified Architecture
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-stone-500 bg-white px-2.5 py-1 rounded-full border border-stone-200 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Full-Duplex Sovereign AI Pipeline</span>
            </div>
          </div>

          {/* ══════ LAYER 1: CLIENT APPS & SDKS ══════ */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-federal-900">
                <Layers className="w-3.5 h-3.5 text-federal-600 shrink-0" />
                Layer 1: Unified Client Interfaces
              </span>
              <span className="text-[10px] text-stone-400 font-mono">Local Monorepo Packages</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {/* Python SDK */}
              <div className="bg-white border border-stone-200/90 rounded-xl p-3 shadow-xs hover:border-federal-400/80 transition-all flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5 truncate">
                      <Terminal className="w-3.5 h-3.5 text-federal-600 shrink-0" />
                      <span className="truncate">Python SDK</span>
                    </span>
                    <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                      ./python-sdk
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-normal break-words">
                    Sync/Async client, SSE stream, word alignment & CLI.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] font-mono text-stone-500">
                  <span className="truncate">natlas.Client()</span>
                </div>
              </div>

              {/* TypeScript SDK */}
              <div className="bg-white border border-stone-200/90 rounded-xl p-3 shadow-xs hover:border-amber-400/80 transition-all flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5 truncate">
                      <Code2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">TypeScript SDK</span>
                    </span>
                    <span className="text-[9px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                      ./js-sdk
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-normal break-words">
                    Zero-dependency universal client for Node, Bun, & Web.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] font-mono text-stone-500">
                  <span className="truncate">NatlasClient()</span>
                </div>
              </div>

              {/* Playground UI & CLI */}
              <div className="bg-white border border-stone-200/90 rounded-xl p-3 shadow-xs hover:border-federal-400/80 transition-all flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5 truncate">
                      <Zap className="w-3.5 h-3.5 text-federal-600 shrink-0" />
                      <span className="truncate">Playground & CLI</span>
                    </span>
                    <span className="text-[9px] font-mono font-bold text-federal-800 bg-federal-50 border border-federal-200 px-1.5 py-0.5 rounded shrink-0">
                      Browser / Shell
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-normal break-words">
                    Interactive chat, audio file upload, & tone adapters.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] font-mono text-stone-500">
                  <span className="truncate">natlas chat / transcribe</span>
                </div>
              </div>
            </div>
          </div>

          {/* ══════ CONNECTING PIPELINE 1 (Animated SVG bus) ══════ */}
          <div className="relative py-1">
            <div className="flex items-center justify-center">
              <div className="w-full flex flex-col items-center">
                <svg className="w-full h-7 overflow-visible max-w-lg mx-auto" preserveAspectRatio="none" viewBox="0 0 600 28">
                  <defs>
                    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#059669" stopOpacity="0.4" />
                      <stop offset="50%" stopColor="#059669" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                  {/* 3 Input branches from cards above */}
                  <path d="M 100 0 L 100 12 Q 100 14 102 14 L 290 14" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
                  <path d="M 300 0 L 300 14" fill="none" stroke="#10b981" strokeWidth="1.5" />
                  <path d="M 500 0 L 500 12 Q 500 14 498 14 L 310 14" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
                  {/* Stem down to Layer 2 */}
                  <path d="M 300 14 L 300 26" fill="none" stroke="#059669" strokeWidth="2" />
                  <polygon points="300,28 296,22 304,22" fill="#059669" />
                </svg>

                {/* Protocol badge */}
                <div className="-mt-3 z-10 bg-white border border-stone-200 px-3 py-0.5 rounded-full text-[10px] font-mono text-stone-700 shadow-xs flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                  <span className="font-semibold text-emerald-700">HTTPS REST</span>
                  <span className="text-stone-300">|</span>
                  <span className="text-stone-600">SSE Tokens</span>
                  <span className="text-stone-300">|</span>
                  <span className="text-stone-600">Multipart Audio (WAV/MP3/WebM)</span>
                </div>
              </div>
            </div>
          </div>

          {/* ══════ LAYER 2: ENGINE ROUTING GATEWAY ══════ */}
          <div className="bg-white border border-emerald-300/80 rounded-xl p-3.5 sm:p-4 shadow-xs relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Server className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-stone-900">Layer 2: Engine Routing Gateway</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-emerald-600" /> Modal Serverless
                </span>
                <span className="text-[10px] font-mono font-semibold bg-stone-100 text-stone-700 border border-stone-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Container className="w-3 h-3 text-stone-500" /> Docker Compose
                </span>
              </div>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed break-words">
              Dispatches requests, validates authentication (<code className="bg-stone-100 text-stone-800 font-mono text-[10px] px-1 py-0.5 rounded border border-stone-200">Bearer API_KEY</code>), resamples audio buffers, and provisions scale-to-zero serverless GPU workers.
            </p>
          </div>

          {/* ══════ CONNECTING PIPELINE 2 (Unified Request Bus) ══════ */}
          <div className="relative py-1">
            <svg className="w-full h-7 overflow-visible max-w-lg mx-auto" preserveAspectRatio="none" viewBox="0 0 600 28">
              {/* Center stem down and split */}
              <path d="M 300 0 L 300 10" fill="none" stroke="#059669" strokeWidth="2" />
              <path d="M 300 10 L 150 10 Q 148 10 148 12 L 148 26" fill="none" stroke="#059669" strokeWidth="1.5" strokeDasharray="3 3" />
              <path d="M 300 10 L 450 10 Q 452 10 452 12 L 452 26" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
              <polygon points="148,28 144,22 152,22" fill="#059669" />
              <polygon points="452,28 448,22 456,22" fill="#10b981" />
            </svg>
            <div className="grid grid-cols-2 gap-2 sm:gap-4 -mt-3">
              <div className="flex justify-center">
                <span className="bg-white border border-stone-200 text-stone-700 px-2 sm:px-2.5 py-0.5 rounded text-[9px] sm:text-[9.5px] font-mono shadow-xs truncate max-w-full text-center">
                  Prompt & Token Context
                </span>
              </div>
              <div className="flex justify-center">
                <span className="bg-white border border-stone-200 text-stone-700 px-2 sm:px-2.5 py-0.5 rounded text-[9px] sm:text-[9.5px] font-mono shadow-xs truncate max-w-full text-center">
                  Resampled 16kHz PCM Buffer
                </span>
              </div>
            </div>
          </div>

          {/* ══════ LAYER 3: UNIFIED SOVEREIGN ENGINES ══════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Left: Sovereign LLM */}
            <div className="bg-white border border-stone-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between overflow-hidden">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5 truncate">
                    <Bot className="w-3.5 h-3.5 text-federal-600 shrink-0" />
                    <span className="truncate">Sovereign LLM Engine</span>
                  </span>
                  <span className="text-[9px] font-mono font-bold text-federal-800 bg-federal-50 border border-federal-200 px-1.5 py-0.5 rounded shrink-0">
                    NCAIR1/N-ATLaS
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mb-2.5 leading-normal break-words">
                  Fine-tuned Llama-3 8B on 392M+ instruction tokens across Nigeria's 6 geopolitical zones.
                </p>

                <div className="space-y-1.5">
                  <div className="bg-stone-50 border border-stone-200/70 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[10.5px]">
                    <span className="text-stone-800 font-mono font-semibold truncate">/v1/chat/completions</span>
                    <span className="text-stone-400 text-[10px] shrink-0 ml-1">SSE Stream</span>
                  </div>
                  <div className="bg-stone-50 border border-stone-200/70 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[10.5px]">
                    <span className="text-stone-400 text-[10px] shrink-0 ml-1">YO · HA · IG · PCM</span>
                  </div>

                </div>
              </div>
            </div>

            {/* Right: Sovereign ASR Quad */}
            <div className="bg-white border border-stone-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between overflow-hidden">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5 truncate">
                    <Radio className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Sovereign ASR Engine</span>
                  </span>
                  <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                    Whisper Quad
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mb-2.5 leading-normal break-words">
                  Pre-configured Whisper Small checkpoints with silence gating and word timestamps.
                </p>

                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-stone-50 border border-stone-200/70 rounded-lg p-2 text-left overflow-hidden">
                    <div className="text-[10.5px] font-bold text-emerald-800 truncate">Yoruba ASR</div>
                    <div className="text-[9.5px] text-stone-500 truncate">120 hours</div>
                  </div>
                  <div className="bg-stone-50 border border-stone-200/70 rounded-lg p-2 text-left overflow-hidden">
                    <div className="text-[10.5px] font-bold text-amber-800 truncate">Hausa ASR</div>
                    <div className="text-[9.5px] text-stone-500 truncate">120 hours</div>
                  </div>
                  <div className="bg-stone-50 border border-stone-200/70 rounded-lg p-2 text-left overflow-hidden">
                    <div className="text-[10.5px] font-bold text-purple-800 truncate">Igbo ASR</div>
                    <div className="text-[9.5px] text-stone-500 truncate">120 hours</div>
                  </div>
                  <div className="bg-stone-50 border border-stone-200/70 rounded-lg p-2 text-left overflow-hidden">
                    <div className="text-[10.5px] font-bold text-blue-800 truncate">Nig. English</div>
                    <div className="text-[9.5px] text-stone-500 truncate">120 hours</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
