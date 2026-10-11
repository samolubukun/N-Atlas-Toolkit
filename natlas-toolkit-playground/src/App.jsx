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
  const [selectedModelId, setSelectedModelId] = useState(null);

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

  const navigateTo = (path, studio = 'chat', modelId = null) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentRoute(path);
    if (studio) setActiveStudio(studio);
    if (modelId !== undefined) setSelectedModelId(modelId);
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
            onSelectStudio={(studio, modelId) => navigateTo('/playground', studio, modelId)}
          />
        )}
        {currentRoute === '/playground' && (
          <PlaygroundView
            activeStudio={activeStudio}
            selectedModelId={selectedModelId}
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
              <div className="flex items-center gap-2.5">
                <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                  <rect width="40" height="40" rx="10" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" />
                  <rect x="6"    y="16" width="3.5" height="8"  rx="1.75" fill="white" opacity="0.65"/>
                  <rect x="11.5" y="11" width="3.5" height="18" rx="1.75" fill="white" opacity="0.85"/>
                  <rect x="17"   y="8"  width="4"   height="24" rx="2"    fill="white"/>
                  <rect x="23.5" y="12" width="3.5" height="16" rx="1.75" fill="white" opacity="0.85"/>
                  <rect x="29"   y="17" width="3.5" height="6"  rx="1.75" fill="white" opacity="0.65"/>
                  <circle cx="32" cy="10" r="2.5" fill="#E5A93C"/>
                </svg>
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
                  <a href="https://samolubukun.github.io/N-Atlas-Toolkit/" target="_blank" rel="noreferrer" className="hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                    <span>Full MkDocs Documentation</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Live</span>
                  </a>
                </li>
                <li>
                  <a href="https://huggingface.co/spaces/samuelolubukun/NATLaS-Sovereign-Engine" target="_blank" rel="noreferrer" className="hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                    <span>Hugging Face Space</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80">Live</span>
                  </a>
                </li>
                <li>
                  <button onClick={() => navigateTo('/docs')} className="hover:text-emerald-300 transition-colors">
                    Developer Documentation (Interactive)
                  </button>
                </li>
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
                  <button onClick={() => navigateTo('/playground', 'translate')} className="hover:text-emerald-300 transition-colors">
                    Translation Studio
                  </button>
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
                <li>
                  <a href="https://huggingface.co/NCAIR1" target="_blank" rel="noreferrer" className="hover:text-emerald-300 transition-colors">
                    Hugging Face Organisation
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom attribution row */}
          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-white/70">
            <p>© 2026 N-ATLaS Initiative · Open Source & Sovereign AI</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs font-medium text-white">
              <span className="whitespace-nowrap">
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
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-emerald-500 font-bold">·</span>
                <a
                  href="https://github.com/samolubukun/N-Atlas-Toolkit"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-white transition-colors underline underline-offset-2 font-semibold"
                >
                  <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>GitHub</span>
                </a>
                <span className="text-emerald-500 font-bold">·</span>
                <a
                  href="https://samolubukun.github.io/N-Atlas-Toolkit/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-white transition-colors underline underline-offset-2 font-semibold"
                >
                  <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2 shrink-0" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  <span>Docs</span>
                </a>
                <span className="text-emerald-500 font-bold">·</span>
                <a
                  href="https://huggingface.co/spaces/samuelolubukun/NATLaS-Sovereign-Engine"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-white transition-colors underline underline-offset-2 font-semibold"
                >
                  <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12.025 1.13c-5.77 0-10.449 4.647-10.449 10.378 0 1.112.178 2.181.503 3.185.064-.222.203-.444.416-.577a.96.96 0 0 1 .524-.15c.293 0 .584.124.84.284.278.173.48.408.71.694.226.282.458.611.684.951v-.014c.017-.324.106-.622.264-.874s.403-.487.762-.543c.3-.047.596.06.787.203s.31.313.4.467c.15.257.212.468.233.542.01.026.653 1.552 1.657 2.54.616.605 1.01 1.223 1.082 1.912.055.537-.096 1.059-.38 1.572.637.121 1.294.187 1.967.187.657 0 1.298-.063 1.921-.178-.287-.517-.44-1.041-.384-1.581.07-.69.465-1.307 1.081-1.913 1.004-.987 1.647-2.513 1.657-2.539.021-.074.083-.285.233-.542.09-.154.208-.323.4-.467a1.08 1.08 0 0 1 .787-.203c.359.056.604.29.762.543s.247.55.265.874v.015c.225-.34.457-.67.683-.952.23-.286.432-.52.71-.694.257-.16.547-.284.84-.285a.97.97 0 0 1 .524.151c.228.143.373.388.43.625l.006.04a10.3 10.3 0 0 0 .534-3.273c0-5.731-4.678-10.378-10.449-10.378M8.327 6.583a1.5 1.5 0 0 1 .713.174 1.487 1.487 0 0 1 .617 2.013c-.183.343-.762-.214-1.102-.094-.38.134-.532.914-.917.71a1.487 1.487 0 0 1 .69-2.803m7.486 0a1.487 1.487 0 0 1 .689 2.803c-.385.204-.536-.576-.916-.71-.34-.12-.92.437-1.103.094a1.487 1.487 0 0 1 .617-2.013 1.5 1.5 0 0 1 .713-.174m-10.68 1.55a.96.96 0 1 1 0 1.921.96.96 0 0 1 0-1.92m13.838 0a.96.96 0 1 1 0 1.92.96.96 0 0 1 0-1.92M8.489 11.458c.588.01 1.965 1.157 3.572 1.164 1.607-.007 2.984-1.155 3.572-1.164.196-.003.305.12.305.454 0 .886-.424 2.328-1.563 3.202-.22-.756-1.396-1.366-1.63-1.32q-.011.001-.02.006l-.044.026-.01.008-.03.024q-.018.017-.035.036l-.032.04a1 1 0 0 0-.058.09l-.014.025q-.049.088-.11.19a1 1 0 0 1-.083.116 1.2 1.2 0 0 1-.173.18q-.035.029-.075.058a1.3 1.3 0 0 1-.251-.243 1 1 0 0 1-.076-.107c-.124-.193-.177-.363-.337-.444-.034-.016-.104-.008-.2.022q-.094.03-.216.087-.06.028-.125.063l-.13.074q-.067.04-.136.086a3 3 0 0 0-.135.096 3 3 0 0 0-.26.219 2 2 0 0 0-.12.121 2 2 0 0 0-.106.128l-.002.002a2 2 0 0 0-.09.132l-.001.001a1.2 1.2 0 0 0-.105.212q-.013.036-.024.073c-1.139-.875-1.563-2.317-1.563-3.203 0-.334.109-.457.305-.454m.836 10.354c.824-1.19.766-2.082-.365-3.194-1.13-1.112-1.789-2.738-1.789-2.738s-.246-.945-.806-.858-.97 1.499.202 2.362c1.173.864-.233 1.45-.685.64-.45-.812-1.683-2.896-2.322-3.295s-1.089-.175-.938.647 2.822 2.813 2.562 3.244-1.176-.506-1.176-.506-2.866-2.567-3.49-1.898.473 1.23 2.037 2.16c1.564.932 1.686 1.178 1.464 1.53s-3.675-2.511-4-1.297c-.323 1.214 3.524 1.567 3.287 2.405-.238.839-2.71-1.587-3.216-.642-.506.946 3.49 2.056 3.522 2.064 1.29.33 4.568 1.028 5.713-.624m5.349 0c-.824-1.19-.766-2.082.365-3.194 1.13-1.112 1.789-2.738 1.789-2.738s.246-.945.806-.858.97 1.499-.202 2.362c-1.173.864.233 1.45.685.64.451-.812 1.683-2.896 2.322-3.295s1.089-.175.938.647-2.822 2.813-2.562 3.244 1.176-.506 1.176-.506 2.866-2.567 3.49-1.898-.473 1.23-2.037 2.16c-1.564.932-1.686 1.178-1.464 1.53s3.675-2.511 4-1.297c.323 1.214-3.524 1.567-3.287 2.405.238.839 2.71-1.587 3.216-.642.506.946-3.49 2.056-3.522 2.064-1.29.33-4.568 1.028-5.713-.624"/>
                  </svg>
                  <span>HF Space</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
