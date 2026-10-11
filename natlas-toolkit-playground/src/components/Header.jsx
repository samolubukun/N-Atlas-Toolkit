import React from 'react';
import { ExternalLink, Home, PlayCircle, BookOpen } from 'lucide-react';

const GithubIcon = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const HuggingFaceIcon = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12.025 1.13c-5.77 0-10.449 4.647-10.449 10.378 0 1.112.178 2.181.503 3.185.064-.222.203-.444.416-.577a.96.96 0 0 1 .524-.15c.293 0 .584.124.84.284.278.173.48.408.71.694.226.282.458.611.684.951v-.014c.017-.324.106-.622.264-.874s.403-.487.762-.543c.3-.047.596.06.787.203s.31.313.4.467c.15.257.212.468.233.542.01.026.653 1.552 1.657 2.54.616.605 1.01 1.223 1.082 1.912.055.537-.096 1.059-.38 1.572.637.121 1.294.187 1.967.187.657 0 1.298-.063 1.921-.178-.287-.517-.44-1.041-.384-1.581.07-.69.465-1.307 1.081-1.913 1.004-.987 1.647-2.513 1.657-2.539.021-.074.083-.285.233-.542.09-.154.208-.323.4-.467a1.08 1.08 0 0 1 .787-.203c.359.056.604.29.762.543s.247.55.265.874v.015c.225-.34.457-.67.683-.952.23-.286.432-.52.71-.694.257-.16.547-.284.84-.285a.97.97 0 0 1 .524.151c.228.143.373.388.43.625l.006.04a10.3 10.3 0 0 0 .534-3.273c0-5.731-4.678-10.378-10.449-10.378M8.327 6.583a1.5 1.5 0 0 1 .713.174 1.487 1.487 0 0 1 .617 2.013c-.183.343-.762-.214-1.102-.094-.38.134-.532.914-.917.71a1.487 1.487 0 0 1 .69-2.803m7.486 0a1.487 1.487 0 0 1 .689 2.803c-.385.204-.536-.576-.916-.71-.34-.12-.92.437-1.103.094a1.487 1.487 0 0 1 .617-2.013 1.5 1.5 0 0 1 .713-.174m-10.68 1.55a.96.96 0 1 1 0 1.921.96.96 0 0 1 0-1.92m13.838 0a.96.96 0 1 1 0 1.92.96.96 0 0 1 0-1.92M8.489 11.458c.588.01 1.965 1.157 3.572 1.164 1.607-.007 2.984-1.155 3.572-1.164.196-.003.305.12.305.454 0 .886-.424 2.328-1.563 3.202-.22-.756-1.396-1.366-1.63-1.32q-.011.001-.02.006l-.044.026-.01.008-.03.024q-.018.017-.035.036l-.032.04a1 1 0 0 0-.058.09l-.014.025q-.049.088-.11.19a1 1 0 0 1-.083.116 1.2 1.2 0 0 1-.173.18q-.035.029-.075.058a1.3 1.3 0 0 1-.251-.243 1 1 0 0 1-.076-.107c-.124-.193-.177-.363-.337-.444-.034-.016-.104-.008-.2.022q-.094.03-.216.087-.06.028-.125.063l-.13.074q-.067.04-.136.086a3 3 0 0 0-.135.096 3 3 0 0 0-.26.219 2 2 0 0 0-.12.121 2 2 0 0 0-.106.128l-.002.002a2 2 0 0 0-.09.132l-.001.001a1.2 1.2 0 0 0-.105.212q-.013.036-.024.073c-1.139-.875-1.563-2.317-1.563-3.203 0-.334.109-.457.305-.454m.836 10.354c.824-1.19.766-2.082-.365-3.194-1.13-1.112-1.789-2.738-1.789-2.738s-.246-.945-.806-.858-.97 1.499.202 2.362c1.173.864-.233 1.45-.685.64-.45-.812-1.683-2.896-2.322-3.295s-1.089-.175-.938.647 2.822 2.813 2.562 3.244-1.176-.506-1.176-.506-2.866-2.567-3.49-1.898.473 1.23 2.037 2.16c1.564.932 1.686 1.178 1.464 1.53s-3.675-2.511-4-1.297c-.323 1.214 3.524 1.567 3.287 2.405-.238.839-2.71-1.587-3.216-.642-.506.946 3.49 2.056 3.522 2.064 1.29.33 4.568 1.028 5.713-.624m5.349 0c-.824-1.19-.766-2.082.365-3.194 1.13-1.112 1.789-2.738 1.789-2.738s.246-.945.806-.858.97 1.499-.202 2.362c-1.173.864.233 1.45.685.64.451-.812 1.683-2.896 2.322-3.295s1.089-.175.938.647-2.822 2.813-2.562 3.244 1.176-.506 1.176-.506 2.866-2.567 3.49-1.898-.473 1.23-2.037 2.16c-1.564.932-1.686 1.178-1.464 1.53s3.675-2.511 4-1.297c.323 1.214-3.524 1.567-3.287 2.405.238.839 2.71-1.587 3.216-.642.506.946-3.49 2.056-3.522 2.064-1.29.33-4.568 1.028-5.713-.624"/>
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

            <a
              href="https://huggingface.co/spaces/samuelolubukun/NATLaS-Sovereign-Engine"
              target="_blank"
              rel="noreferrer"
              title="Hugging Face Space Live Demo"
              className="flex items-center justify-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold text-stone-500 hover:text-stone-900 hover:bg-white/80 transition-all"
            >
              <HuggingFaceIcon size={15} className="shrink-0" />
              <span className="hidden sm:inline">HF Space</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
