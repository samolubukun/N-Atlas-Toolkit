import React from 'react';
import { 
  Sparkles, 
  Radio, 
  Languages, 
  Workflow, 
  Home, 
  X, 
  ShieldCheck, 
  ChevronRight,
  ExternalLink,
  Layers,
  Terminal
} from 'lucide-react';
import { AsoOkeWeave } from './SvgPatterns';

export const Sidebar = ({ isOpen, onClose, currentRoute, activeStudio, onNavigate }) => {
  const isPlayground = currentRoute === '/playground';

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 md:hidden transition-opacity"
        />
      )}

      {/* Drawer Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-federal-100 flex flex-col justify-between shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Sidebar Header */}
          <div className="p-4 sm:p-5 border-b border-federal-100 flex items-center justify-between">
            <div 
              onClick={() => { onNavigate('/'); onClose(); }}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-federal-700 via-federal-600 to-ochre-500 flex items-center justify-center text-white font-extrabold text-lg shadow-glow-green">
                N
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">N-ATLaS</h2>
                <span className="text-[10px] font-mono text-federal-600 font-semibold block">Sovereign AI Suite</span>
              </div>
            </div>

            {/* Mobile close button */}
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-cream-100 md:hidden transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Institutional Mini Bar */}
          <div className="relative px-4 py-2.5 bg-cream-100/70 border-b border-federal-100/60 text-[11px] font-mono text-slate-600 flex items-center gap-2 overflow-hidden">
            <AsoOkeWeave />
            <ShieldCheck className="w-3.5 h-3.5 text-federal-600 shrink-0 relative z-10" />
            <span className="truncate relative z-10">FMCIDE • Awarri • NCAIR</span>
          </div>

          {/* Primary Main Pages */}
          <div className="p-3 space-y-1">
            <span className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2 mt-2">
              Navigation
            </span>

            <button
              onClick={() => { onNavigate('/'); onClose(); }}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                !isPlayground
                  ? 'bg-federal-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-cream-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Home className={`w-4 h-4 ${!isPlayground ? 'text-white' : 'text-slate-500'}`} />
                <span>Overview & Features</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                !isPlayground ? 'bg-federal-800 text-federal-100' : 'bg-cream-200 text-slate-500'
              }`}>
                Landing
              </span>
            </button>

            <button
              onClick={() => { onNavigate('/playground', 'asr'); onClose(); }}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                isPlayground
                  ? 'bg-federal-50 border border-federal-300 text-federal-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-cream-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-federal-700" />
                <span className="font-bold">Interactive Playground</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-ochre-100 text-ochre-800 font-bold">
                /playground
              </span>
            </button>
          </div>

          {/* Playground Sub-sections */}
          <div className="p-3 pt-0 space-y-1">
            <span className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2 mt-3">
              Playground Engines
            </span>

            <button
              onClick={() => { onNavigate('/playground', 'asr'); onClose(); }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${
                isPlayground && activeStudio === 'asr'
                  ? 'bg-federal-700 text-white font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-cream-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5" />
                <span>Sovereign ASR (4 Checkpoints)</span>
              </div>
            </button>

            <button
              onClick={() => { onNavigate('/playground', 'chat'); onClose(); }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${
                isPlayground && activeStudio === 'chat'
                  ? 'bg-federal-700 text-white font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-cream-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Llama 8B Multilingual Chat</span>
              </div>
            </button>


          </div>
        </div>

        {/* Sidebar Footer Info */}
        <div className="relative p-4 border-t border-federal-100 bg-cream-50/50 space-y-3 overflow-hidden">
          <AsoOkeWeave />
          <div className="bg-white p-3 rounded-xl border border-federal-100/80 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Backend Status</span>
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live GPU
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              Modal A100 / T4 cluster
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>Documentation</span>
            <a 
              href="https://github.com/samolubukun/N-Atlas-Toolkit" 
              target="_blank" 
              rel="noreferrer"
              className="text-federal-700 hover:text-federal-900 font-semibold flex items-center gap-1"
            >
              GitHub <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};
