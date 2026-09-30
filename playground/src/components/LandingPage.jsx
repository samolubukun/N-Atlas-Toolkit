import React from 'react';
import {
  Bot,
  Radio,
  Languages,
  Workflow,
  ExternalLink,
  ChevronRight,
  Globe2,
  Database,
  Award,
  ArrowRight,
  Mic,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { KenteStripe, NsibidiScatter, AnkaraHex } from './SvgPatterns';

// Reusable section label
const Label = ({ children }) => (
  <p className="text-xs font-semibold tracking-widest uppercase text-federal-600 mb-3">{children}</p>
);

// Animated Stat block with count-up on scroll
const Stat = ({ value, label }) => {
  const [displayVal, setDisplayVal] = React.useState(value);
  const ref = React.useRef(null);
  const animatedRef = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Parse numeric part and suffix: "8.03B" -> num: 8.03, suffix: "B", decimals: 2
    // "120h" -> num: 120, suffix: "h", decimals: 0
    // "5" -> num: 5, suffix: "", decimals: 0
    const match = String(value).match(/^([\d.]+)(.*)$/);
    if (!match) return;

    const targetNum = parseFloat(match[1]);
    const suffix = match[2] || '';
    const decimals = match[1].includes('.') ? match[1].split('.')[1].length : 0;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animatedRef.current) {
            animatedRef.current = true;
            const startTime = performance.now();
            const duration = 1200; // ms

            const tick = (now) => {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              // Ease-out cubic
              const ease = 1 - Math.pow(1 - progress, 3);
              const currentNum = ease * targetNum;
              setDisplayVal(currentNum.toFixed(decimals) + suffix);

              if (progress < 1) {
                requestAnimationFrame(tick);
              } else {
                setDisplayVal(value);
              }
            };

            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref}>
      <div className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">{displayVal}</div>
      <div className="text-sm text-stone-500 mt-0.5">{label}</div>
    </div>
  );
};

export const LandingPage = ({ onSelectStudio }) => {

  const hfModels = [
    {
      id: "NCAIR1/N-ATLaS",
      name: "N-ATLaS LLM",
      subtitle: "Llama 3 · 8B parameters",
      description: "Fine-tuned on 392 million tokens of instruction data across Nigeria's six geopolitical zones. Speaks Hausa, Yoruba, Igbo, Pidgin, and English fluently.",
      hfUrl: "https://huggingface.co/NCAIR1/N-ATLaS",
      action: "chat",
      accentColor: "#008751",
      tags: ["8.03B Params", "8,092 Context", "~918K Instruction Pairs"],
    },
    {
      id: "NCAIR1/Yoruba-ASR",
      name: "Yoruba Speech",
      subtitle: "Whisper Small · 244M params",
      description: "Trained on 120 hours of Yorùbá speech, preserving acute and grave tone diacritics that completely change word meaning when dropped.",
      hfUrl: "https://huggingface.co/NCAIR1/Yoruba-ASR",
      action: "asr",
      accentColor: "#00897B",
      tags: ["120h Training Data", "244M Params", "Tone-Preserving"],
    },
    {
      id: "NCAIR1/Hausa-ASR",
      name: "Hausa Speech",
      subtitle: "Whisper Small · 244M params",
      description: "120 hours of Hausa recordings from speakers across northern and southern Nigeria. Handles regional dialect variation standard models miss entirely.",
      hfUrl: "https://huggingface.co/NCAIR1/Hausa-ASR",
      action: "asr",
      accentColor: "#1B4F8A",
      tags: ["120h Training Data", "244M Params", "All 6 Zones"],
    },
    {
      id: "NCAIR1/Igbo-ASR",
      name: "Igbo Speech",
      subtitle: "Whisper Small · 244M params",
      description: "Built to capture authentic Igbo phonetics, including the sub-dot characters and tonal patterns that off-the-shelf models have historically failed.",
      hfUrl: "https://huggingface.co/NCAIR1/Igbo-ASR",
      action: "asr",
      accentColor: "#C0452A",
      tags: ["120h Training Data", "244M Params", "Diacritics Intact"],
    },
    {
      id: "NCAIR1/NigerianAccentedEnglish",
      name: "Nigerian English",
      subtitle: "Whisper Small · 244M params",
      description: "Because your accent is not a bug. Built specifically for Nigerian-accented English so speakers aren't penalised by systems designed for other parts of the world.",
      hfUrl: "https://huggingface.co/NCAIR1/NigerianAccentedEnglish",
      action: "asr",
      accentColor: "#E5A93C",
      tags: ["120h Training Data", "244M Params", "en-NG Native"],
    },
  ];

  const capabilities = [
    {
      icon: Bot,
      title: "Talks your language, naturally",
      body: "Switch between Hausa, Yoruba, Igbo, Pidgin, and English mid-conversation. The model follows you, not the other way around.",
    },
    {
      icon: Mic,
      title: "Speech that actually hears you",
      body: "Four dedicated ASR models built on Whisper, trained on hundreds of hours of real Nigerian voices from every corner of the country.",
    },
    {
      icon: Globe2,
      title: "Cultural tone, not just translation",
      body: "The Africanize engine rewrites corporate-stiff English into the warm, respectful register Nigerians actually use with each other.",
    },
    {
      icon: Zap,
      title: "Streaming, not waiting",
      body: "Words appear on screen as you speak. The live WebSocket stream delivers transcriptions in real time, word by word, with timestamps.",
    },
    {
      icon: Database,
      title: "Sourced from all six zones",
      body: "Training data collected via Langeasy with speakers from every Nigerian geopolitical zone. The models don't just know one accent.",
    },
    {
      icon: ShieldCheck,
      title: "Sovereign infrastructure",
      body: "All model weights are licensed for Nigerian government, education, healthcare, and enterprise use. No data leaves under foreign jurisdiction.",
    },
  ];

  return (
    <div className="animate-fade-up">

      {/* ─── HERO ─── */}
      <section className="pt-10 pb-20 sm:pt-16 sm:pb-28 text-center relative overflow-hidden">

      {/* ══ KENTE-STRIPE full-bleed overlay ══ */}
      <KenteStripe />

      {/* ══ NSIBIDI-SCATTER corner marks ══ */}
      {/* Top-left nsibidi — 240px corner box */}
      <div className="absolute top-0 left-0 w-48 h-48 sm:w-72 sm:h-72 pointer-events-none overflow-hidden">
        <NsibidiScatter style={{ opacity: 0.65 }} />
      </div>
      {/* Bottom-right nsibidi */}
      <div className="absolute bottom-0 right-0 w-48 h-48 sm:w-72 sm:h-72 pointer-events-none overflow-hidden">
        <NsibidiScatter style={{ opacity: 0.65 }} />
      </div>

      {/* ══ TOP-RIGHT: Realistic tropical leaf cluster ══ */}
      <div className="absolute top-0 right-0 w-56 sm:w-80 md:w-96 h-56 sm:h-80 md:h-96 pointer-events-none select-none overflow-hidden">
        <svg viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Primary large frond — dark navy from image */}
          <g opacity="0.28">
            <path d="M290 0 C260 20, 200 55, 160 100 C130 138, 115 185, 120 240 C140 200, 170 155, 210 118 C245 85, 280 48, 290 0Z"
              fill="#162d3a"/>
            {/* Midrib */}
            <path d="M290 0 C265 35, 235 80, 195 120 C165 152, 135 195, 120 240"
              stroke="#1e3d4a" strokeWidth="2.5" fill="none"/>
            {/* Lateral veins */}
            <path d="M268 28 C252 45, 238 60, 225 75" stroke="#1e3d4a" strokeWidth="1" fill="none" opacity="0.7"/>
            <path d="M245 58 C226 72, 212 88, 200 105" stroke="#1e3d4a" strokeWidth="1" fill="none" opacity="0.7"/>
            <path d="M222 90 C206 103, 194 118, 185 136" stroke="#1e3d4a" strokeWidth="1" fill="none" opacity="0.7"/>
            <path d="M200 118 C186 130, 175 145, 168 162" stroke="#1e3d4a" strokeWidth="0.8" fill="none" opacity="0.6"/>
          </g>

          {/* Secondary frond — slightly smaller, forest green */}
          <g opacity="0.22">
            <path d="M320 55 C300 70, 268 95, 248 130 C230 162, 225 200, 232 245 C248 210, 268 172, 292 142 C312 115, 325 82, 320 55Z"
              fill="#1a3828"/>
            <path d="M320 55 C304 82, 282 115, 260 145 C242 170, 235 205, 232 245"
              stroke="#224a34" strokeWidth="2" fill="none"/>
            <path d="M312 72 C298 87, 285 102, 272 120" stroke="#224a34" strokeWidth="0.8" fill="none" opacity="0.6"/>
            <path d="M296 98 C280 112, 268 130, 260 148" stroke="#224a34" strokeWidth="0.8" fill="none" opacity="0.6"/>
          </g>

          {/* Third small accent frond — ochre tint */}
          <g opacity="0.12">
            <path d="M280 120 C265 130, 250 148, 242 172 C235 192, 236 215, 242 238 C252 215, 264 192, 276 172 C287 154, 290 135, 280 120Z"
              fill="#c49020"/>
            <path d="M280 120 C268 142, 258 168, 250 195 C244 215, 242 230, 242 238"
              stroke="#c49020" strokeWidth="1.5" fill="none"/>
          </g>
        </svg>
      </div>

      {/* ══ BOTTOM-LEFT: Mirrored leaf cluster ══ */}
      <div className="absolute bottom-0 left-0 w-40 sm:w-64 md:w-80 h-40 sm:h-64 md:h-80 pointer-events-none select-none overflow-hidden">
        <svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" style={{transform:'scaleX(-1)'}}>
          <g opacity="0.22">
            <path d="M260 280 C240 250, 200 210, 165 175 C135 145, 115 105, 115 60 C140 100, 170 145, 205 175 C238 204, 262 240, 260 280Z"
              fill="#162d3a"/>
            <path d="M260 280 C242 252, 210 215, 178 182 C150 153, 125 112, 115 60"
              stroke="#1e3d4a" strokeWidth="2.5" fill="none"/>
            <path d="M245 262 C228 242, 215 225, 200 208" stroke="#1e3d4a" strokeWidth="1" fill="none" opacity="0.7"/>
            <path d="M222 240 C207 220, 194 202, 182 185" stroke="#1e3d4a" strokeWidth="0.8" fill="none" opacity="0.6"/>
          </g>
          <g opacity="0.16">
            <path d="M290 240 C268 218, 240 188, 215 162 C194 140, 180 105, 182 68 C202 105, 226 140, 252 162 C275 182, 295 210, 290 240Z"
              fill="#1a3828"/>
            <path d="M290 240 C270 215, 244 185, 218 160 C196 140, 182 108, 182 68"
              stroke="#224a34" strokeWidth="2" fill="none"/>
          </g>
        </svg>
      </div>

      {/* ══ Watermark concentric circles — phonetic motif ══ */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {/* Top-left stacked circles */}
        <svg className="absolute -top-6 left-8 sm:left-20 w-32 h-32 opacity-[0.07]" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="46" stroke="#008751" strokeWidth="2"/>
          <circle cx="50" cy="50" r="34" stroke="#008751" strokeWidth="1.5"/>
          <circle cx="50" cy="50" r="22" stroke="#008751" strokeWidth="1"/>
          <circle cx="50" cy="50" r="10" stroke="#008751" strokeWidth="1"/>
        </svg>
        {/* Mid-right ochre circle */}
        <svg className="absolute top-1/3 right-4 sm:right-24 w-20 h-20 opacity-[0.08]" viewBox="0 0 70 70" fill="none">
          <circle cx="35" cy="35" r="32" stroke="#e5a93c" strokeWidth="2"/>
          <circle cx="35" cy="35" r="20" stroke="#e5a93c" strokeWidth="1.5"/>
        </svg>
        {/* Bottom-center green ring */}
        <svg className="absolute bottom-16 left-1/2 -translate-x-1/2 w-14 h-14 opacity-[0.05]" viewBox="0 0 50 50" fill="none">
          <circle cx="25" cy="25" r="22" stroke="#008751" strokeWidth="1.5"/>
        </svg>
      </div>

        <div className="relative max-w-4xl mx-auto px-4">
          <h1 className="text-4xl sm:text-7xl lg:text-8xl font-extrabold text-stone-900 leading-[1.02] tracking-tight mb-6">
            AI that understands{' '}
            <span className="text-gradient-nigeria">Nigerian</span>{' '}
            the way Nigerians do.
          </h1>

          <p className="text-base sm:text-xl text-stone-500 max-w-xl mx-auto leading-relaxed mb-8">
            One language model and four speech-to-text engines, built in Nigeria for Nigerians. Open on Hugging Face, live in this playground.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onSelectStudio('chat')}
              className="btn-shimmer w-full sm:w-auto px-7 py-3.5 rounded-xl bg-federal-600 hover:bg-federal-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-glow-green"
            >
              <Bot className="w-4 h-4" />
              Open the Chat
            </button>
            <button
              onClick={() => onSelectStudio('asr')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-card"
            >
              <Radio className="w-4 h-4 text-federal-600" />
              Try Speech Recognition
            </button>
            <a
              href="https://huggingface.co/NCAIR1"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              NCAIR on Hugging Face
            </a>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative mt-14 sm:mt-16 max-w-2xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-6 border-t border-stone-200 pt-10">
            <Stat value="8.03B" label="LLM parameters" />
            <Stat value="120h"  label="Yoruba audio" />
            <Stat value="5"     label="Open models" />
          </div>
        </div>

        {/* Banner image */}
        <div className="relative mt-14 max-w-5xl mx-auto px-4">
          <div className="rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200 shadow-card-md bg-white p-1.5">
            <img
              src="https://cdn-uploads.huggingface.co/production/uploads/68cc35805d39c965b21628cc/29iPDMBiRZ6qMAU4_IeqM.jpeg"
              alt="Introducing N-ATLaS — Nigeria's Sovereign Multilingual AI"
              className="w-full h-auto rounded-xl sm:rounded-2xl block"
              loading="eager"
            />
          </div>
        </div>
      </section>


      {/* ─── CONSORTIUM STRIP ─── */}
      <div className="border-y border-stone-200 bg-white py-6">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-stone-300 mb-4">Built by</p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-stone-400 text-xs font-semibold">
            {[
              { label: 'FMCIDE', url: 'https://fmcide.gov.ng' },
              { label: 'Awarri Technologies', url: 'https://awarri.com' },
              { label: 'NCAIR', url: 'https://ncair.nitda.gov.ng' },
              { label: 'NITDA', url: 'https://nitda.gov.ng' },
              { label: 'Langeasy', url: 'https://langeasy.ai' },
            ].map(p => (
              <a key={p.label} href={p.url} target="_blank" rel="noreferrer"
                className="hover:text-stone-700 transition-colors">
                {p.label}
              </a>
            ))}
          </div>
        </div>
      </div>


      {/* ─── MODELS ─── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="max-w-xl mb-12">
            <Label>The models</Label>
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
              Five models, one platform.
            </h2>
            <p className="text-stone-500 mt-3 text-base leading-relaxed">
              Every model is published open-weight on Hugging Face under the NCAIR1 organisation and available to test here instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {hfModels.map((m) => (
              <div
                key={m.id}
                className="group bg-white rounded-2xl border border-stone-200 p-6 shadow-card hover:shadow-card-md hover:border-stone-300 transition-all flex flex-col justify-between relative overflow-hidden"
              >
                {/* Ankara-hex honeycomb watermark */}
                <AnkaraHex style={{ opacity: 0.6 }} />

                {/* Model identity top accent bar */}
                <div
                  style={{ backgroundColor: m.accentColor }}
                  className="h-[3px] w-full rounded-full mb-4 relative z-10 opacity-80 group-hover:opacity-100 transition-opacity"
                />

                <div className="space-y-3 relative z-10">
                  {/* Model name & subtitle */}
                  <div>
                    <h3 className="text-[17px] font-bold text-stone-900 group-hover:text-federal-700 transition-colors">
                      {m.name}
                    </h3>
                    <p className="text-xs text-stone-400 font-mono mt-0.5">{m.subtitle}</p>
                  </div>

                  <p className="text-sm text-stone-500 leading-relaxed">{m.description}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {m.tags.map(t => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-500 font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-2">
                  <button
                    onClick={() => onSelectStudio(m.action)}
                    className="flex-1 py-2 rounded-lg bg-federal-600 hover:bg-federal-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    Try it <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={m.hfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors"
                    title="View on Hugging Face"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}

            {/* CTA card */}
            <div className="bg-federal-950 rounded-2xl border border-federal-900 p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-federal-800 flex items-center justify-center">
                  <Globe2 className="w-5 h-5 text-federal-300" />
                </div>
                <h3 className="text-lg font-bold text-white">NCAIR1 on Hugging Face</h3>
                <p className="text-sm text-federal-300 leading-relaxed">
                  All five models are open-weight and downloadable. Explore the full repository, model cards, and evaluation benchmarks.
                </p>
              </div>
              <a
                href="https://huggingface.co/NCAIR1"
                target="_blank"
                rel="noreferrer"
                className="mt-6 flex items-center gap-2 text-sm font-semibold text-ochre-400 hover:text-ochre-300 transition-colors"
              >
                Browse all models <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>


      {/* ─── N-ATLaS IN PRACTICE (EDITORIAL SHOWCASE) ─── */}
      <section className="py-20 sm:py-24 bg-stone-900 text-white relative overflow-hidden">
        {/* Kente chevron-stripe diagonal background texture */}
        <KenteStripe style={{ opacity: 0.18 }} />
        {/* Bottom-right corner Nsibidi pictographic scatter watermark */}
        <div className="absolute -bottom-8 -right-8 w-80 h-80 pointer-events-none select-none opacity-20">
          <NsibidiScatter />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 space-y-14">
          <div className="max-w-2xl">
            <p className="text-xs font-mono font-bold tracking-widest uppercase text-emerald-400 mb-3">Core Technology</p>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white">
              Built for real Nigerian words, voices, and workflows.
            </h2>
            <p className="mt-4 text-stone-300 text-sm sm:text-base leading-relaxed">
              From audio transcriptions across regional dialects to indigenous multilingual text generation and universal developer SDKs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Card 1: Indigenous Acoustic Models */}
            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl sm:rounded-3xl overflow-hidden hover:border-emerald-500/60 transition-all group flex flex-col justify-between shadow-2xl">
              <div>
                <div className="relative overflow-hidden aspect-[16/10] bg-stone-900 border-b border-stone-800/80">
                  <img
                    src="/assets/audio_speech.jpg"
                    alt="Indigenous Acoustic Models - Studio Recording"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-700/60">
                    Speech Recognition (Whisper Small)
                  </span>
                </div>
                <div className="p-6 space-y-2.5">
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                    Indigenous Acoustic Models
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                    Dedicated models for Yoruba, Hausa, Igbo, and Nigerian Accented English. Preserving tonal diacritics and hooked consonants that generic speech recognizers erase.
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={() => onSelectStudio('asr')}
                  className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Radio className="w-3.5 h-3.5" /> Test Speech Recognizer
                </button>
              </div>
            </div>

            {/* Card 2: Multilingual Language Model */}
            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl sm:rounded-3xl overflow-hidden hover:border-amber-500/60 transition-all group flex flex-col justify-between shadow-2xl">
              <div>
                <div className="relative overflow-hidden aspect-[16/10] bg-stone-900 border-b border-stone-800/80">
                  <img
                    src="/assets/sovereign_voice.jpg"
                    alt="N-ATLaS Sovereign Intelligence Topology"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-700/60">
                    N-ATLaS 8B LLM
                  </span>
                </div>
                <div className="p-6 space-y-2.5">
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                    Multilingual Language Model
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                    Trained across Nigeria's six geopolitical zones. Understands context, local idioms, news, and informal conversations in Hausa, Yoruba, Igbo, Pidgin, and English.
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={() => onSelectStudio('chat')}
                  className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-amber-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Bot className="w-3.5 h-3.5" /> Open Chat Studio
                </button>
              </div>
            </div>

            {/* Card 3: Developer & SDK */}
            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl sm:rounded-3xl overflow-hidden hover:border-federal-400 transition-all group flex flex-col justify-between shadow-2xl">
              <div>
                <div className="relative overflow-hidden aspect-[16/10] bg-stone-900 border-b border-stone-800/80">
                  <img
                    src="/assets/developer_coding.jpg"
                    alt="Developer coding with N-ATLaS SDK"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-federal-950/90 text-federal-300 border border-federal-700/60">
                    Python & TypeScript SDKs
                  </span>
                </div>
                <div className="p-6 space-y-2.5">
                  <h3 className="text-lg font-bold text-white group-hover:text-federal-400 transition-colors">
                    Developer SDKs & Tooling
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                    Lightweight client libraries, streaming endpoints, and fine-tuning scripts ready to integrate into mobile apps, WhatsApp bots, and web portals.
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-2">
                <a
                  href="/docs"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/docs');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-federal-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Workflow className="w-3.5 h-3.5" /> View SDK Documentation
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CAPABILITIES (UPGRADED SLEEK CARDS) ─── */}
      <section className="py-20 sm:py-24 bg-white border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="max-w-2xl mb-12">
            <Label>Capabilities</Label>
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
              Built for how Nigerians actually communicate.
            </h2>
            <p className="mt-3 text-stone-500 text-sm sm:text-base leading-relaxed">
              Designed from ground-up for multilingual code-switching, tonal accuracy, and sovereign privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={i}
                  className="group bg-stone-50/70 hover:bg-white border border-stone-200/90 hover:border-federal-300 rounded-2xl p-6 transition-all duration-300 hover:shadow-card-md flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-xl bg-white group-hover:bg-federal-50 border border-stone-200/80 group-hover:border-federal-200 flex items-center justify-center transition-colors shadow-xs">
                        <Icon className="w-5 h-5 text-federal-700 group-hover:text-federal-800 transition-colors" />
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200 group-hover:bg-federal-50 group-hover:text-federal-700 group-hover:border-federal-200 transition-colors">
                        0{i + 1}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-stone-900 group-hover:text-federal-900 transition-colors">
                        {c.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-500 mt-2 leading-relaxed">
                        {c.body}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>


      {/* ─── CTA STRIP ─── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="bg-federal-950 rounded-3xl p-8 sm:p-14 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-lg">
              <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                Trained on Nigerian voices. Built for Nigerian words.
              </h2>
              <p className="text-federal-300 mt-3 text-base leading-relaxed">
                Jump into the playground and interact with all five models live. No setup, no API key required to explore.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <button
                onClick={() => onSelectStudio('chat')}
                className="px-6 py-3 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Bot className="w-4 h-4 text-federal-600" />
                Open Chat
              </button>
              <button
                onClick={() => onSelectStudio('asr')}
                className="px-6 py-3 rounded-xl bg-federal-700 hover:bg-federal-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Radio className="w-4 h-4" />
                Try Speech
              </button>
            </div>
          </div>
        </div>
      </section>


      {/* ─── ABOUT / INSTITUTION ─── */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <Label>About</Label>
              <h2 className="text-3xl font-bold text-stone-900 leading-tight mb-4">
                National Centre for Artificial Intelligence & Robotics
              </h2>
              <p className="text-stone-500 text-sm leading-relaxed mb-3">
                NCAIR is a special purpose vehicle of NITDA, under Nigeria's Federal Ministry of Communications, Innovation, and Digital Economy (FMCIDE). Its mandate is to build the research and engineering capacity for AI in Nigeria.
              </p>
              <p className="text-stone-500 text-sm leading-relaxed">
                N-ATLaS was developed in collaboration with Awarri Technologies under the Nigerian Languages AI Initiative, a programme to build AI infrastructure that serves Nigerian citizens in their own languages.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Technical Maintainer', name: 'Awarri Technologies', sub: 'Model training & deployment' },
                { label: 'Research & Governance', name: 'NCAIR / NITDA', sub: 'National AI policy & research' },
                { label: 'Federal Ministry', name: 'FMCIDE', sub: 'Digital Economy of Nigeria' },
              ].map(card => (
                <div key={card.name} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-card">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-stone-400 mb-2">{card.label}</p>
                  <p className="text-sm font-bold text-stone-900">{card.name}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{card.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
