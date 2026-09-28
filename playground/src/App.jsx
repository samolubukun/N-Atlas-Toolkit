import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { PlaygroundView } from './components/PlaygroundView';

export function App() {
  const [currentRoute, setCurrentRoute] = useState(() =>
    window.location.pathname.startsWith('/playground') ? '/playground' : '/'
  );
  const [activeStudio, setActiveStudio] = useState('chat');

  useEffect(() => {
    const handlePop = () => {
      setCurrentRoute(window.location.pathname.startsWith('/playground') ? '/playground' : '/');
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
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-stone-400 text-center sm:text-left leading-relaxed max-w-lg">
            N-ATLaS is a sovereign AI initiative of the Federal Ministry of Communications, Innovation and Digital Economy (FMCIDE), maintained by Awarri Technologies in partnership with NCAIR and NITDA.
          </p>
          <div className="flex items-center gap-4 text-xs font-medium text-stone-400 shrink-0">
            <span>
              Engineered by{' '}
              <a
                href="http://samuelolubukun.com/"
                target="_blank"
                rel="noreferrer"
                className="text-federal-600 hover:text-federal-700 transition-colors underline underline-offset-2"
              >
                Samuel Olubukun
              </a>
            </span>
            <span className="text-stone-200">·</span>
            <a
              href="https://github.com/samolubukun/N-Atlas-Toolkit"
              target="_blank"
              rel="noreferrer"
              className="text-federal-600 hover:text-federal-700 transition-colors underline underline-offset-2"
            >
              GitHub
            </a>
            <span className="text-stone-200">·</span>
            <span>Nigeria 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
