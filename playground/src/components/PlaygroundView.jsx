import React, { useState } from 'react';
import {
  Radio,
  Bot,
  Workflow,
  Languages,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
  Menu,
  X,
  Circle,
  BookOpen,
} from 'lucide-react';
import { ASRStudio } from './ASRStudio';
import { ChatStream } from './ChatStream';
import { Africanize } from './Africanize';
import { Translate } from './Translate';
import { isConfigured } from '../constants';

const studios = [
  {
    id: 'chat',
    name: 'Chat',
    full: 'N-ATLaS LLM',
    sub: 'Multilingual streaming',
    icon: Bot,
  },
  {
    id: 'asr',
    name: 'Speech',
    full: 'Sovereign ASR',
    sub: 'Batch audio transcription',
    icon: Radio,
  },
  {
    id: 'africanize',
    name: 'Tone',
    full: 'Africanize',
    sub: 'Cultural phrasing adapter',
    icon: Workflow,
  },
  {
    id: 'translate',
    name: 'Translate',
    full: 'Translation',
    sub: 'Dialect-aware NMT',
    icon: Languages,
  },
];

export const PlaygroundView = ({ activeStudio = 'chat', onStudioChange, onBackToLanding, onSelectDocs }) => {
  const [transferredPrompt, setTransferredPrompt] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSendToLLM = (text) => {
    setTransferredPrompt(text);
    onStudioChange('chat');
  };

  const current = studios.find(s => s.id === activeStudio) || studios[0];
  const Icon = current.icon;

  return (
    <div className="flex flex-col gap-4 md:gap-5">

      {/* Config warning banner — shown when env vars are unset */}
      {!isConfigured() && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-xl text-sm">
          <span className="text-lg leading-none mt-0.5">⚠️</span>
          <div>
            <p className="font-semibold">API endpoints not configured</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Copy <code className="font-mono bg-amber-100 px-1 rounded">playground/.env.example</code> to{' '}
              <code className="font-mono bg-amber-100 px-1 rounded">playground/.env</code> and set{' '}
              <code className="font-mono bg-amber-100 px-1 rounded">VITE_NATLAS_API_URL</code>,{' '}
              <code className="font-mono bg-amber-100 px-1 rounded">VITE_NATLAS_ASR_URL</code>, and{' '}
              <code className="font-mono bg-amber-100 px-1 rounded">VITE_NATLAS_API_KEY</code>.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-5 min-h-[calc(100vh-120px)]">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-stone-900/50 z-50 md:hidden backdrop-blur-sm"
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed md:static top-0 bottom-0 left-0 z-50 md:z-auto
        flex flex-col bg-white border-r md:border border-stone-200
        md:rounded-2xl shadow-card-md md:shadow-card
        transition-all duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-[72px]' : 'md:w-64'}
      `}>

        {/* Sidebar header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {(!isCollapsed || mobileOpen) && <span>Back to overview</span>}
          </button>
          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
          {/* Desktop collapse */}
          <button
            onClick={() => setIsCollapsed(p => !p)}
            className="hidden md:flex p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* GPU status */}
        {(!isCollapsed || mobileOpen) && (
          <div className="px-4 py-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono text-stone-400">Modal GPU · Live</span>
            </div>
          </div>
        )}

        {/* Studio nav */}
        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
          {studios.map(s => {
            const SIcon = s.icon;
            const active = activeStudio === s.id;
            return (
              <button
                key={s.id}
                onClick={() => { onStudioChange(s.id); setMobileOpen(false); }}
                title={isCollapsed ? s.full : ''}
                className={`
                  w-full rounded-xl transition-all text-left
                  flex items-center gap-3
                  ${isCollapsed && !mobileOpen ? 'p-2.5 justify-center' : 'px-3 py-2.5'}
                  ${active
                    ? 'bg-federal-600 text-white'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }
                `}
              >
                <SIcon className={`shrink-0 ${isCollapsed && !mobileOpen ? 'w-5 h-5' : 'w-4 h-4'}`} />
                {(!isCollapsed || mobileOpen) && (
                  <div className="min-w-0">
                    <div className="text-xs font-semibold leading-tight truncate">{s.full}</div>
                    <div className={`text-[10px] leading-tight truncate mt-0.5 ${active ? 'text-federal-200' : 'text-stone-400'}`}>
                      {s.sub}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        {(!isCollapsed || mobileOpen) && (
          <div className="p-3 border-t border-stone-100 flex flex-col gap-2">
            <button
              onClick={() => onSelectDocs ? onSelectDocs() : window.history.pushState({}, '', '/docs')}
              className="w-full py-2 px-3 rounded-xl bg-federal-50 hover:bg-federal-100 text-xs text-federal-700 hover:text-federal-900 flex items-center justify-between transition-colors border border-federal-200 font-semibold"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-federal-600" />
                <span>API & SDK Docs</span>
              </div>
              <span className="text-[10px] bg-federal-200 text-federal-800 px-1.5 py-0.5 rounded font-mono">/docs</span>
            </button>
            <a
              href="https://github.com/samolubukun/N-Atlas-Toolkit"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 px-3 rounded-xl bg-stone-50 hover:bg-stone-100 text-xs text-stone-500 hover:text-stone-700 flex items-center justify-between transition-colors border border-stone-200 font-medium"
            >
              <span>GitHub Repo</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <section className="flex-1 min-w-0 space-y-4">

        {/* Mobile topbar */}
        <div className="md:hidden bg-white rounded-xl border border-stone-200 shadow-card px-3 py-2.5 flex items-center justify-between gap-2">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center gap-2 text-xs font-semibold text-stone-700 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 transition-colors truncate"
          >
            <Menu className="w-4 h-4 shrink-0 text-federal-600" />
            <span className="truncate">{current.full}</span>
          </button>

          <button
            onClick={onBackToLanding}
            className="shrink-0 text-xs font-medium text-stone-500 hover:text-stone-900 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Overview
          </button>
        </div>

        {/* Studio content */}
        <div className="animate-fade-up">
          {activeStudio === 'chat'       && <ChatStream initialPrompt={transferredPrompt} />}
          {activeStudio === 'asr'        && <ASRStudio onSendToLLM={handleSendToLLM} />}
          {activeStudio === 'africanize' && <Africanize />}
          {activeStudio === 'translate'  && <Translate />}
        </div>
      </section>
    </div>
    </div>
  );
};
