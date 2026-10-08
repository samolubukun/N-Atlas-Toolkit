import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { PlaygroundView } from './components/PlaygroundView';
import { DocsView } from './components/DocsView';
import { AsoOkeWeave } from './components/SvgPatterns';

export function App() {
  const [currentRoute, setCurrentRoute] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/playground')) return '/playground';
    if (path.startsWith('/docs')) return '/docs';
    return '/';
  });
  const [activeStudio, setActiveStudio] = useState('chat');

  useEffect(() => {
    const handlePop = () => {
      const path = window.location.pathname;
      if (path.startsWith('/playground')) setCurrentRoute('/playground');
      else if (path.startsWith('/docs')) setCurrentRoute('/docs');
      else setCurrentRoute('/');
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const navigateTo = (path, studio = 'chat') => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentRoute(path);
    if (studio) setActiveStudio(studio);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-federal-100">

      <Header
        currentRoute={currentRoute}
        activeStudio={activeStudio}
        onNavigate={navigateTo}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {currentRoute === '/' && (
          <LandingPage
            onSelectStudio={(studio) => navigateTo('/playground', studio)}
          />
        )}
        {currentRoute === '/playground' && (
          <PlaygroundView
            activeStudio={activeStudio}
            onStudioChange={setActiveStudio}
            onBackToLanding={() => navigateTo('/')}
            onSelectDocs={() => navigateTo('/docs')}
          />
        )}
        {currentRoute === '/docs' && (
          <DocsView
            onSelectStudio={(studio) => navigateTo('/playground', studio)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-federal-800 bg-federal-950 mt-auto relative overflow-hidden text-white">
        {/* Aso-oke-weave texture on footer */}
        <AsoOkeWeave className="opacity-15" />
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-federal-800/80">
            {/* Col 1 & 2: Brand & Description */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg text-white tracking-wide">N-ATLaS</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
                  Sovereign AI
                </span>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed max-w-md">
                Led by FMCIDE in partnership with NCAIR, NITDA, and Awarri Technologies.
              </p>
            </div>

            {/* Col 3: Resources */}
            <div className="space-y-2.5">
              <p className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">Resources</p>
              <ul className="space-y-1.5 text-xs text-white/80">
                <li>
                  <button onClick={() => navigateTo('/playground', 'chat')} className="hover:text-emerald-300 transition-colors">
                    Chat Studio
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('/playground', 'asr')} className="hover:text-emerald-300 transition-colors">
                    Speech Studio (ASR)
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('/docs')} className="hover:text-emerald-300 transition-colors">
                    Developer Documentation
                  </button>
                </li>
                <li>
                  <a href="https://huggingface.co/NCAIR1" target="_blank" rel="noreferrer" className="hover:text-emerald-300 transition-colors">
                    Hugging Face Organisation
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Consortium & Code */}
            <div className="space-y-2.5">
              <p className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">Consortium</p>
              <ul className="space-y-1.5 text-xs text-white/80">
                <li>
                  <a href="https://fmcide.gov.ng" target="_blank" rel="noreferrer" className="hover:text-emerald-300 transition-colors">
                    FMCIDE
                  </a>
                </li>
                <li>
                  <a href="https://ncair.nitda.gov.ng" target="_blank" rel="noreferrer" className="hover:text-emerald-300 transition-colors">
                    NCAIR
                  </a>
                </li>
                <li>
                  <a href="https://nitda.gov.ng" target="_blank" rel="noreferrer" className="hover:text-emerald-300 transition-colors">
                    NITDA
                  </a>
                </li>
                <li>
                  <a href="https://awarri.com" target="_blank" rel="noreferrer" className="hover:text-emerald-300 transition-colors">
                    Awarri Technologies
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom attribution row */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/70">
            <p>© 2026 N-ATLaS Initiative · Open Source & Sovereign AI</p>
            <div className="flex items-center gap-4 text-xs font-medium text-white shrink-0">
              <span>
                Engineered by{' '}
                <a
                  href="http://samuelolubukun.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-300 hover:text-white transition-colors underline underline-offset-2 font-semibold"
                >
                  Samuel Olubukun
                </a>
              </span>
              <span className="text-emerald-500 font-bold">·</span>
              <a
                href="https://github.com/samolubukun/N-Atlas-Toolkit"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-300 hover:text-white transition-colors underline underline-offset-2 font-semibold"
              >
                GitHub
              </a>
              <span className="text-emerald-500 font-bold">·</span>
              <span className="text-white/80">Nigeria</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
