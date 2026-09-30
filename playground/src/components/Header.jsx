import React from 'react';
import { ExternalLink, Home, PlayCircle, BookOpen } from 'lucide-react';

const GithubIcon = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

// Inline SVG logo component — waveform mark
const NAtlasLogo = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="#008751"/>
    <rect width="40" height="40" rx="10" fill="url(#lg)" opacity="0.55"/>
    <rect x="6"    y="16" width="3.5" height="8"  rx="1.75" fill="white" opacity="0.45"/>
    <rect x="11.5" y="11" width="3.5" height="18" rx="1.75" fill="white" opacity="0.75"/>
    <rect x="17"   y="8"  width="4"   height="24" rx="2"    fill="white"/>
    <rect x="23.5" y="12" width="3.5" height="16" rx="1.75" fill="white" opacity="0.75"/>
    <rect x="29"   y="17" width="3.5" height="6"  rx="1.75" fill="white" opacity="0.45"/>
    <circle cx="32" cy="10" r="2.5" fill="#E5A93C"/>
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#056b43"/>
        <stop offset="100%" stopColor="#022417"/>
      </linearGradient>
    </defs>
  </svg>
);

export const Header = ({ currentRoute, onNavigate }) => {
  const isPlayground = currentRoute === '/playground';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-100">
      {/* Slim institutional strip */}
      <div className="bg-federal-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-federal-300 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="hidden sm:inline">Federal Republic of Nigeria · NCAIR · NITDA · FMCIDE</span>
            <span className="sm:hidden">Nigeria Sovereign AI</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-stone-400">
            <span className="hidden sm:inline">Powered by <strong className="text-white font-semibold">Awarri Technologies</strong></span>
            <span className="text-emerald-400 font-medium">· GPU Live</span>
          </div>
        </div>
      </div>

      {/* Main nav bar */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-8 h-[56px] sm:h-[60px] flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Logo & wordmark */}
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0"
        >
          <NAtlasLogo size={32} />
          <div className="text-left">
            <div className="text-[13.5px] sm:text-[15px] font-bold tracking-tight text-stone-900 leading-none">
              N-ATLaS
            </div>
            <div className="text-[9.5px] sm:text-[10px] text-stone-400 font-medium leading-none mt-0.5 tracking-wide">
              Sovereign AI Toolkit
            </div>
          </div>
        </button>

        {/* Nav actions */}
        <div className="flex items-center shrink-0">
          {/* Route toggle pills */}
          <div className="flex items-center bg-stone-100 rounded-xl p-0.5 sm:p-1 gap-0.5">
            <button
              onClick={() => onNavigate('/')}
              title="Overview"
              className={`flex items-center justify-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !isPlayground && !currentRoute.startsWith('/docs')
                  ? 'bg-white text-stone-900 shadow-card'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Home className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </button>

            <button
              onClick={() => onNavigate('/playground')}
              title="Playground"
              className={`flex items-center justify-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isPlayground
                  ? 'bg-federal-600 text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <PlayCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Playground</span>
            </button>

            <button
              onClick={() => onNavigate('/docs')}
              title="Documentation"
              className={`flex items-center justify-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRoute.startsWith('/docs')
                  ? 'bg-federal-600 text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <BookOpen className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Docs</span>
            </button>

            <a
              href="https://github.com/samolubukun/N-Atlas-Toolkit"
              target="_blank"
              rel="noreferrer"
              title="GitHub Repository"
              className="flex items-center justify-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold text-stone-500 hover:text-stone-900 hover:bg-white/80 transition-all"
            >
              <GithubIcon size={16} className="shrink-0" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
