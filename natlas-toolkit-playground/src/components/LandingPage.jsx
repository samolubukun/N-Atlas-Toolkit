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
  CheckCircle2,
  Terminal,
  Code2,
  Layers,
  Server,
} from 'lucide-react';
import { KenteStripe, NsibidiScatter, AnkaraHex, AdireDots, AsoOkeWeave } from './SvgPatterns';

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
      subtitle: "Llama 3 Instruct Architecture",
      description: "Fine-tuned on 392 million tokens of instruction data across Nigeria's six geopolitical zones. Speaks Hausa, Yoruba, Igbo, and English fluently.",
      hfUrl: "https://huggingface.co/NCAIR1/N-ATLaS",
      action: "chat",
      accentColor: "#008751",
      cardBg: "bg-white",
      borderClass: "border-stone-200 hover:border-federal-400",
      accentStripe: "bg-federal-600",
      pillBadge: "bg-federal-50 text-federal-700 border-federal-200",
      buttonClass: "bg-federal-600 hover:bg-federal-700 text-white",
      tags: ["Multilingual Sovereign LLM", "8K Context", "~918K Instruction Pairs"],
    },
    {
      id: "NCAIR1/Yoruba-ASR",
      name: "Yoruba Speech",
      subtitle: "Sovereign Whisper Small",
      description: "Trained on 120 hours of Yorùbá speech, preserving acute and grave tone diacritics that completely change word meaning when dropped.",
      hfUrl: "https://huggingface.co/NCAIR1/Yoruba-ASR",
      action: "asr",
      accentColor: "#1E3A5F",
      cardBg: "bg-indigo-50/40 hover:bg-indigo-50/70",
      borderClass: "border-indigo-200/80 hover:border-indigo-400",
      accentStripe: "bg-[#1E3A5F]",
      pillBadge: "bg-indigo-100/70 text-indigo-950 border-indigo-200",
      buttonClass: "bg-[#1E3A5F] hover:bg-[#152a45] text-white",
      tags: ["120h Training Data", "Word Timestamps", "Tone-Preserving"],
    },
    {
      id: "NCAIR1/Hausa-ASR",
      name: "Hausa Speech",
      subtitle: "Sovereign Whisper Small",
      description: "120 hours of Hausa recordings from speakers across northern and southern Nigeria. Handles regional dialect variation standard models miss entirely.",
      hfUrl: "https://huggingface.co/NCAIR1/Hausa-ASR",
      action: "asr",
      accentColor: "#D97706",
      cardBg: "bg-yellow-50/60 hover:bg-yellow-50/90",
      borderClass: "border-yellow-200/90 hover:border-amber-400",
      accentStripe: "bg-[#D97706]",
      pillBadge: "bg-yellow-100/90 text-yellow-950 border-yellow-300/80",
      buttonClass: "bg-[#D97706] hover:bg-[#b45309] text-white",
      tags: ["120h Training Data", "Hooked Consonants", "All 6 Zones"],
    },
    {
      id: "NCAIR1/Igbo-ASR",
      name: "Igbo Speech",
      subtitle: "Sovereign Whisper Small",
      description: "Built to capture authentic Igbo phonetics, including the sub-dot characters and tonal patterns that off-the-shelf models have historically failed.",
      hfUrl: "https://huggingface.co/NCAIR1/Igbo-ASR",
      action: "asr",
      accentColor: "#DC2626",
      cardBg: "bg-red-50/70 hover:bg-red-50/95",
      borderClass: "border-red-200/90 hover:border-red-400",
      accentStripe: "bg-[#DC2626]",
      pillBadge: "bg-red-100/90 text-red-950 border-red-300/80",
      buttonClass: "bg-[#DC2626] hover:bg-[#b91c1c] text-white",
      tags: ["120h Training Data", "Vowel Harmony", "Diacritics Intact"],
    },
    {
      id: "NCAIR1/NigerianAccentedEnglish",
      name: "Nigerian English",
      subtitle: "Sovereign Whisper Small",
      description: "Because your accent is not a bug. Built specifically for Nigerian-accented English so speakers aren't penalised by systems designed for other parts of the world.",
      hfUrl: "https://huggingface.co/NCAIR1/NigerianAccentedEnglish",
      action: "asr",
      accentColor: "#7E22CE",
      cardBg: "bg-purple-50/50 hover:bg-purple-50/80",
      borderClass: "border-purple-200/80 hover:border-purple-400",
      accentStripe: "bg-purple-600",
      pillBadge: "bg-purple-100/70 text-purple-950 border-purple-200",
      buttonClass: "bg-purple-700 hover:bg-purple-800 text-white",
      tags: ["120h Training Data", "Nigerian Accented English", "en-NG Native"],
    },
  ];

  const toolkitFeatures = [
    {
      icon: Server,
      title: "Modal & Docker GPU Infra",
      body: "Instant serverless GPU hosting on Modal or turnkey Docker compose stacks running the NCAIR1/N-ATLaS 8B LLM (vLLM) and sovereign ASR speech engines offline.",
      color: "bg-federal-50 text-federal-600 border-federal-100",
      accentColor: "#008751",
      pattern: "aso-oke",
      tags: ["NCAIR1/N-ATLaS 8B", "Modal Serverless", "Docker vLLM", "CUDA Ready"],
      bgClass: "hover:border-federal-400 hover:shadow-card-md"
    },
    {
      icon: Terminal,
      title: "Python & TypeScript SDKs",
      body: "Client libraries with CLI pipelines, streaming async iterators, OpenAI drop-in compatibility, and typed browser/Node bindings ready to install directly from the monorepo.",
      color: "bg-ochre-50 text-ochre-600 border-ochre-100",
      accentColor: "#D97706",
      pattern: "adire",
      tags: ["pip install natlas-sdk", "npm i natlas-sdk", "Interactive CLI", "Full Types"],
      bgClass: "hover:border-ochre-400 hover:shadow-card-md"
    },
    {
      icon: Layers,
      title: "Model Fine-Tuning Kit",
      body: "Unsloth and PEFT/LoRA recipes optimized for consumer GPUs, enabling teams to adapt N-ATLaS to specific custom domains and local datasets.",
      color: "bg-purple-50 text-purple-600 border-purple-100",
      accentColor: "#9333EA",
      pattern: "ankara",
      tags: ["LoRA / QLoRA", "Unsloth Scripts", "Domain Adaptation", "Hugging Face"],
      bgClass: "hover:border-purple-400 hover:shadow-card-md"
    }
  ];

  const capabilities = [
    {
      icon: Bot,
      title: "Talks your language, naturally",
      body: "Switch between Hausa, Yoruba, Igbo, and English mid-conversation. The model follows you, not the other way around.",
    },
    {
      icon: Mic,
      title: "Speech that actually hears you",
      body: "Four dedicated ASR models built on Whisper, trained on hundreds of hours of real Nigerian voices from every corner of the country.",
    },
    {
      icon: Workflow,
      title: "Full-Stack Developer SDKs",
      body: "Official Python and TypeScript SDKs with interactive CLI tools, streaming async iterators, exponential backoff retries, and full type safety.",
    },
    {
      icon: ShieldCheck,
      title: "Sovereign infrastructure",
      body: "All model weights are open for public, educational, healthcare, and research use. No data leaves under foreign jurisdiction.",
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

        <div className="relative max-w-6xl mx-auto px-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[76px] font-display font-extrabold text-stone-900 leading-[1.08] tracking-tight mb-6">
            {/* Line 1: AI that understands */}
            <span className="block">AI that understands</span>

            {/* Line 2: Nigerian the way (desktop) / Nigerian + the way (mobile) */}
            <span className="block">
              <span className="text-federal-600 block sm:inline">Nigerian</span>{' '}
              <span className="block sm:inline">the way</span>
            </span>

            {/* Line 3: Nigerians do. */}
            <span className="block">Nigerians do.</span>
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
            <button
              onClick={() => onSelectStudio('translate')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-card"
            >
              <Languages className="w-4 h-4 text-federal-600" />
              Try Translator
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
            <Stat value="4"      label="Languages covered" />
            <Stat value="480h+"  label="Acoustic speech training" />
            <Stat value="5"      label="Open models" />
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
      <div className="border-y border-stone-200 bg-white/90 backdrop-blur-sm py-8">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-stone-500 mb-6">
            Built by
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {/* FMCIDE */}
            <a
              href="https://fmcide.gov.ng"
              target="_blank"
              rel="noreferrer"
              title="Federal Ministry of Communications, Innovation & Digital Economy"
              className="group flex items-center gap-2.5 px-4 py-2 rounded-xl border border-stone-200 bg-white hover:border-emerald-500 hover:shadow-md transition-all duration-200 hover:-rotate-1 hover:scale-105"
            >
              <img
                src="https://fmcide.gov.ng/wp-content/uploads/2023/11/logo.png"
                alt="FMCIDE Logo"
                className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
                onError={(e) => {
                  const fallback = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4HXpW6rodb7gm5YiPtyksOqGkFtKSOWWkUDyC0Ae2XQ&s=10";
                  if (e.target.src !== fallback) {
                    e.target.src = fallback;
                  } else {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }
                }}
              />
              <div className="hidden items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300">
                NG
              </div>
              <span className="text-xs font-bold text-stone-800 group-hover:text-emerald-700 transition-colors">
                FMCIDE
              </span>
            </a>

            {/* Awarri Technologies */}
            <a
              href="https://awarri.com"
              target="_blank"
              rel="noreferrer"
              title="Awarri Technologies — Africa's AI & Robotics Enabler"
              className="group flex items-center gap-2.5 px-4 py-2 rounded-xl border border-stone-200 bg-white hover:border-red-500 hover:shadow-md transition-all duration-200 hover:rotate-1 hover:scale-105"
            >
              <img
                src="https://framerusercontent.com/images/ICkV3wlOQSxCtBRm6EXFzEne5RE.png"
                alt="Awarri Logo"
                className="h-7 w-auto object-contain transition-transform group-hover:scale-105"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden items-center justify-center w-7 h-7 rounded-lg bg-red-100 text-red-600 font-bold text-xs border border-red-300">
                A
              </div>
              <span className="text-xs font-bold text-stone-800 group-hover:text-red-600 transition-colors">
                Awarri
              </span>
            </a>

            {/* NCAIR */}
            <a
              href="https://ncair.nitda.gov.ng"
              target="_blank"
              rel="noreferrer"
              title="National Centre for Artificial Intelligence and Robotics"
              className="group flex items-center gap-2.5 px-4 py-2 rounded-xl border border-stone-200 bg-white hover:border-emerald-600 hover:shadow-md transition-all duration-200 hover:-rotate-1 hover:scale-105"
            >
              <img
                src="https://lms.ncair.nitda.gov.ng/ncairlogo.jpg"
                alt="NCAIR Logo"
                className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden items-center justify-center px-2 py-1 rounded-md bg-emerald-700 text-white font-bold text-[11px] tracking-wider">
                NCAIR
              </div>
              <span className="text-xs font-bold text-stone-800 group-hover:text-emerald-700 transition-colors">
                NCAIR
              </span>
            </a>

            {/* NITDA */}
            <a
              href="https://nitda.gov.ng"
              target="_blank"
              rel="noreferrer"
              title="National Information Technology Development Agency"
              className="group flex items-center gap-2.5 px-4 py-2 rounded-xl border border-stone-200 bg-white hover:border-emerald-600 hover:shadow-md transition-all duration-200 hover:rotate-1 hover:scale-105"
            >
              <img
                src="https://nitda.gov.ng/wp-content/uploads/2024/01/NITDA-Logo-770x400.png"
                alt="NITDA Logo"
                className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300">
                NITDA
              </div>
              <span className="text-xs font-bold text-stone-800 group-hover:text-emerald-800 transition-colors">
                NITDA
              </span>
            </a>

            {/* Langeasy */}
            <a
              href="https://langeasy.ai"
              target="_blank"
              rel="noreferrer"
              title="Langeasy — Multilingual AI Translation & Voice"
              className="group flex items-center gap-2.5 px-4 py-2 rounded-xl border border-stone-200 bg-white hover:border-blue-500 hover:shadow-md transition-all duration-200 hover:-rotate-1 hover:scale-105"
            >
              <img
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAZCAMAAAAVHr4VAAABIFBMVEVHcExIMuxXUfVvYvd2WfdKWPRhR/dpUPaDWviMY/mPZfiMa/iCbvZyUPVnMvpuTvd2Vfh2XPhwZvZNX/OVdPiRcfhdT/ZoXfdDYfWKePd5e/VuXfc/Z/NccfSRfPeMhvd8gfQ0Z/ONh/ZJivFLV/NkY/YWqutfXvVGc/OBhfSNjvVvoPJ/i/KHoPU1sOxSZ/SEnfR4pPVWavM2cfB4lfFPcvN2mPAWrO1cpe9+qvNFe/E3cvB2sfMyp+pjru9ruPIaie1Fh/FDtu1quPA9jvBeuu5Uvu4AhOxBmO85ju5Qwe1YwO5JoPA2retXw+5HqPBDqu43qu44v+tOxe1Wx+5Ise8+u+s2vOtOyO1RyOxGuu5Gve1Hv+1Jxu1Jx+wtueunhKmiAAAAYHRSTlMAARkzTBNdtvDs9bNRDQfW+rVnH/rPp5smohfsQ0riyiMs1x9w9wrohDr0eoD1HbPdgulmn/JtF1b62JXyB721J/FJ/o/aqRHQxsTW5C7hzOt6PrD78pBO1frO9e/y0DbrS+sHAAABDUlEQVR4AY2QA4IDQRAAe717sW3btm37/684xU6Np4YNn4GgGI7jGPFAESRF0zTDfDEsNudacUkeXyDERKgIE7LEEjZy4VApXyY/HI4gmEKsUJ4dpVLDJRqtTg97OFKVAa7R64ymfc9sudq3t0ad9a8V2exwj8Pp2m9E4QFujxcA8fngEXp/AIAIhh5KJOwHEEU08JCoJ/Yr1Y9lPOEFIhJ6LpFk6rF0pa0A9iTxyGWyOQDIFx6eWywV/5pyIX/vvJUq8tfW6g3TnWu2vPtevl3v3JzZbZ1m8r3+wHt+ynA0rp6HYB1M+tN4xxvzdmbT+aI5y1xfMliuVuv1erPZTofW+0jHdrNZcee92PQDjY8jYvYhfecAAAAASUVORK5CYII="
                alt="Langeasy Logo"
                className="h-6 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <span className="text-xs font-bold text-stone-800 group-hover:text-blue-700 transition-colors">
                Langeasy
              </span>
            </a>
          </div>
        </div>
      </div>
      {/* ─── TOOLKIT PEEK ─── */}
      <section className="py-20 sm:py-24 bg-stone-900 text-white relative overflow-hidden">
        {/* Kente chevron-stripe diagonal background texture */}
        <KenteStripe style={{ opacity: 0.18 }} />
        {/* Corner Nsibidi watermark */}
        <div className="absolute -top-8 -right-8 w-80 h-80 pointer-events-none select-none opacity-15">
          <NsibidiScatter />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
          <div className="max-w-3xl mb-12">
            <p className="text-xs font-mono font-bold tracking-widest uppercase text-emerald-400 mb-3">Toolkit Peek</p>
            <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight leading-tight text-white">
              What's in the box?
            </h2>
            <p className="text-stone-300 mt-3 text-base leading-relaxed">
              GPU infrastructure, developer SDKs, and fine-tuning tools built for sovereign Nigerian AI deployment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {toolkitFeatures.map((feat, i) => (
              <div
                key={i}
                className="bg-stone-950/85 border border-stone-800 p-7 sm:p-8 rounded-t-[32px] rounded-bl-[32px] rounded-br-[64px] shadow-2xl transition-all duration-300 flex flex-col justify-between gap-6 relative overflow-hidden group hover:border-emerald-500/60 hover:shadow-glow-green"
              >
                {/* Cultural pattern watermark */}
                {feat.pattern === 'aso-oke' && <AsoOkeWeave style={{ opacity: 0.22 }} />}
                {feat.pattern === 'ankara' && <AnkaraHex style={{ opacity: 0.22 }} />}
                {feat.pattern === 'kente' && <KenteStripe style={{ opacity: 0.22 }} />}
                {feat.pattern === 'adire' && <AdireDots style={{ opacity: 0.22 }} />}

                {/* Top accent badge + stripe */}
                <div className="relative z-10 flex items-center justify-between">
                  <div
                    style={{ backgroundColor: feat.accentColor }}
                    className="h-1.5 w-16 rounded-full opacity-80 group-hover:w-24 group-hover:opacity-100 transition-all duration-300"
                  />
                  <div className="w-10 h-10 rounded-2xl border border-stone-800 bg-stone-900/90 flex items-center justify-center text-white group-hover:border-emerald-500/50 transition-colors shadow-inner">
                    <feat.icon className="w-5 h-5" style={{ color: feat.accentColor }} />
                  </div>
                </div>

                <div className="relative z-10 space-y-3">
                  <h3 className="text-xl font-display font-bold text-white group-hover:text-emerald-400 transition-colors leading-snug">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-stone-400 leading-relaxed">{feat.body}</p>
                </div>

                {/* Feature tags */}
                {feat.tags && (
                  <div className="relative z-10 pt-4 border-t border-stone-800/80 flex flex-wrap gap-1.5">
                    {feat.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-900/90 border border-stone-800 text-stone-300 font-medium font-mono"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── MODELS ─── */}
      <section className="py-20 sm:py-24 bg-parchment/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="max-w-xl mb-12">
            <Label>The models</Label>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-stone-900 leading-tight">
              Five models, one platform.
            </h2>
            <p className="text-stone-600 mt-3 text-base leading-relaxed">
              Every model is published open-weight on Hugging Face under the NCAIR organisation and available to test here instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hfModels.map((m) => (
              <div
                key={m.id}
                className={`group rounded-t-[32px] rounded-bl-[32px] rounded-br-[64px] border p-7 shadow-sm hover:shadow-card-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${m.cardBg} ${m.borderClass}`}
              >
                {/* Ankara-hex honeycomb watermark */}
                <AnkaraHex style={{ opacity: 0.45 }} />

                {/* Model identity top accent bar */}
                <div
                  style={{ backgroundColor: m.accentColor }}
                  className="h-1.5 w-16 rounded-full mb-4 relative z-10 opacity-85 group-hover:w-24 group-hover:opacity-100 transition-all duration-300"
                />

                <div className="space-y-3.5 relative z-10">
                  {/* Model name & subtitle */}
                  <div>
                    <h3 className="text-xl font-display font-bold text-stone-900 group-hover:text-stone-950 transition-colors">
                      {m.name}
                    </h3>
                    <p className="text-xs text-stone-500 font-mono mt-0.5">{m.subtitle}</p>
                  </div>

                  <p className="text-sm text-stone-600 leading-relaxed">{m.description}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {m.tags.map(t => (
                      <span key={t} className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium font-mono ${m.pillBadge || 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions with signature bottom corner button matching the reference design */}
                <div className="mt-6 pt-4 border-t border-stone-200/60 flex items-center justify-between gap-3 relative z-10">
                  <button
                    onClick={() => onSelectStudio(m.action, m.id)}
                    className="text-xs font-bold uppercase tracking-wider text-stone-700 hover:text-stone-950 transition-colors flex items-center gap-1.5"
                  >
                    <span>Explore model</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <a
                      href={m.hfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-white/80 hover:bg-white border border-stone-200 text-stone-600 hover:text-stone-900 transition-colors shadow-xs"
                      title="View on Hugging Face"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => onSelectStudio(m.action, m.id)}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-sm ${m.buttonClass}`}
                      title={`Try ${m.name}`}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* CTA card */}
            <div className="bg-federal-950 rounded-t-[32px] rounded-bl-[32px] rounded-br-[64px] border border-federal-900 p-7 flex flex-col justify-between shadow-card-md relative overflow-hidden group">
              <AsoOkeWeave className="opacity-20" />
              <div className="space-y-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-federal-800/80 border border-federal-700/60 flex items-center justify-center shadow-inner">
                  <Globe2 className="w-6 h-6 text-federal-300" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-white">NCAIR on Hugging Face</h3>
                  <p className="text-xs text-federal-300 font-mono mt-1">Open weights · Apache / Research</p>
                </div>
                <p className="text-sm text-federal-200 leading-relaxed">
                  All five models are open-weight and downloadable. Explore the full repository, model cards, and evaluation benchmarks.
                </p>
              </div>
              {/* Action footer matching the language cards */}
              <div className="mt-6 pt-4 border-t border-federal-800/80 flex items-center justify-between gap-3 relative z-10">
                <a
                  href="https://huggingface.co/NCAIR1"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold uppercase tracking-wider text-ochre-400 hover:text-ochre-300 transition-colors"
                >
                  Browse all models
                </a>
                <a
                  href="https://huggingface.co/NCAIR1"
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-2xl bg-ochre-500 hover:bg-ochre-400 text-stone-950 flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-sm font-bold"
                  title="Browse all models on Hugging Face"
                >
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </a>
              </div>
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
            <h2 className="text-3xl sm:text-5xl font-display font-bold tracking-tight leading-tight text-white">
              Built for real Nigerian words, voices, and workflows.
            </h2>
            <p className="mt-4 text-stone-300 text-sm sm:text-base leading-relaxed">
              From audio transcriptions across regional dialects to indigenous multilingual text generation and universal developer SDKs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Card 1: Indigenous Acoustic Models */}
            <div className="bg-stone-950/80 border border-stone-800 rounded-3xl overflow-hidden hover:border-emerald-500/60 transition-all group flex flex-col justify-between shadow-2xl">
              <div>
                <div className="relative overflow-hidden aspect-[16/10] bg-stone-900 border-b border-stone-800/80">
                  <img
                    src="/assets/indigenous_acoustic_model.webp"
                    alt="Indigenous Acoustic Models - Nigerian Speech Recognition"
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
            <div className="bg-stone-950/80 border border-stone-800 rounded-3xl overflow-hidden hover:border-amber-500/60 transition-all group flex flex-col justify-between shadow-2xl">
              <div>
                <div className="relative overflow-hidden aspect-[16/10] bg-stone-900 border-b border-stone-800/80">
                  <img
                    src="/assets/multilingual_llm.webp"
                    alt="N-ATLaS Multilingual LLM Topology across Nigeria's six geopolitical zones"
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
                    Trained across Nigeria's six geopolitical zones. Understands context, local idioms, news, and informal conversations in Hausa, Yoruba, Igbo, and English.
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
            <div className="bg-stone-950/80 border border-stone-800 rounded-3xl overflow-hidden hover:border-federal-400 transition-all group flex flex-col justify-between shadow-2xl">
              <div>
                <div className="relative overflow-hidden aspect-[16/10] bg-stone-900 border-b border-stone-800/80">
                  <img
                    src="/assets/developer_coding.webp"
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
      <section className="py-20 sm:py-24 bg-white border-y border-stone-200 relative overflow-hidden">
        {/* Subtle Adire indigo double-dot grid across entire section background */}
        <AdireDots className="opacity-65" />
        {/* Corner Nsibidi indigenous glyph flourish in upper right */}
        <div className="absolute -top-12 -right-12 w-64 h-64 pointer-events-none select-none opacity-25">
          <NsibidiScatter />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8">
          <div className="max-w-2xl mb-12">
            <Label>Capabilities</Label>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-stone-900 leading-tight">
              Built for how Nigerians actually communicate.
            </h2>
            <p className="mt-3 text-stone-500 text-sm sm:text-base leading-relaxed">
              Designed from ground-up for multilingual code-switching, tonal accuracy, and sovereign privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {capabilities.map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={i}
                  className="group relative overflow-hidden bg-stone-50/70 hover:bg-white border border-stone-200/90 hover:border-federal-300 rounded-3xl p-7 transition-all duration-300 hover:shadow-card-md flex flex-col justify-between"
                >
                  {/* Ankara hexagonal weave watermark: visible at rest, elevates on hover */}
                  <AnkaraHex className="opacity-50 group-hover:opacity-90 transition-opacity duration-300" />

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-white group-hover:bg-federal-50 border border-stone-200/80 group-hover:border-federal-200 flex items-center justify-center transition-colors shadow-xs">
                        <Icon className="w-5 h-5 text-federal-700 group-hover:text-federal-800 transition-colors" />
                      </div>
                      <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200 group-hover:bg-federal-50 group-hover:text-federal-700 group-hover:border-federal-200 transition-colors">
                        0{i + 1}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-stone-900 group-hover:text-federal-900 transition-colors">
                        {c.title}
                      </h3>
                      <p className="text-sm text-stone-500 mt-2.5 leading-relaxed">
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
          <div className="rounded-3xl p-8 sm:p-14 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 bg-stone-950 border border-stone-800 shadow-2xl relative overflow-hidden">
            {/* Kente subtle overlay matching dark sections */}
            <KenteStripe style={{ opacity: 0.15 }} />
            {/* Corner Aso-Oke flourish */}
            <AsoOkeWeave className="opacity-20" />

            <div className="max-w-lg relative z-10">
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-white leading-tight">
                Trained on Nigerian voices. Built for Nigerian words.
              </h2>
              <p className="text-stone-300 mt-3 text-base leading-relaxed">
                Jump into the playground and interact with all five models live. No setup, no API key required to explore.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0 relative z-10">
              <button
                onClick={() => onSelectStudio('chat')}
                className="px-6 py-3 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Bot className="w-4 h-4 text-emerald-600" />
                Open Chat
              </button>
              <button
                onClick={() => onSelectStudio('asr')}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Radio className="w-4 h-4" />
                Try Speech
              </button>
              <button
                onClick={() => onSelectStudio('translate')}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Languages className="w-4 h-4 text-emerald-400" />
                Try Translator
              </button>
            </div>
          </div>
        </div>
      </section>


      {/* ─── ABOUT / INSTITUTION ─── */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            {/* Left Column: Text & Consortium Partner Cards */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <Label>About</Label>
                <h2 className="text-3xl sm:text-4xl font-display font-bold text-stone-900 leading-tight mb-4">
                  National Centre for Artificial Intelligence & Robotics
                </h2>
                <p className="text-stone-600 text-sm sm:text-base leading-relaxed mb-3">
                  NCAIR is a special purpose vehicle of NITDA, under Nigeria's Federal Ministry of Communications, Innovation, and Digital Economy (FMCIDE). Its mandate is to build the research and engineering capacity for AI in Nigeria.
                </p>
                <p className="text-stone-600 text-sm sm:text-base leading-relaxed mb-6">
                  N-ATLaS was developed in collaboration with Awarri Technologies under the Nigerian Languages AI Initiative, a programme to build AI infrastructure that serves Nigerian citizens in their own languages.
                </p>
              </div>

              {/* Partner Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                {[
                  { label: 'Technical Maintainer', name: 'Awarri Technologies', sub: 'Model training & deployment', accent: 'bg-red-500' },
                  { label: 'Research & Governance', name: 'NCAIR / NITDA', sub: 'National AI policy & research', accent: 'bg-emerald-600' },
                  { label: 'Federal Ministry', name: 'FMCIDE', sub: 'Digital Economy of Nigeria', accent: 'bg-ochre-500' },
                ].map(card => (
                  <div
                    key={card.name}
                    className="relative bg-white rounded-2xl p-4 border border-stone-200/90 shadow-card hover:shadow-card-md hover:border-stone-300 transition-all flex flex-col justify-between overflow-hidden"
                  >
                    {/* Clean top accent bar */}
                    <div className={`h-1 w-full ${card.accent} absolute top-0 left-0 right-0`} />
                    <div className="pt-1">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 mb-1.5">{card.label}</p>
                      <p className="text-sm font-bold text-stone-900 leading-snug">{card.name}</p>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">{card.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Sovereign Voice Card */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <div className="relative w-full rounded-3xl overflow-hidden border-2 border-emerald-700/80 hover:border-emerald-500 shadow-xl shadow-emerald-950/20 bg-stone-950 group isolate transition-all duration-300">
                <img
                  src="/assets/sovereign_voice.webp"
                  alt="N-ATLaS Sovereign Intelligence Topology"
                  className="w-full h-auto aspect-[16/9] object-cover bg-stone-950 group-hover:scale-102 transition-transform duration-500 block"
                  loading="lazy"
                />
                <div className="p-4 sm:p-5 bg-stone-900 border-t border-stone-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-600/90 text-emerald-50 border border-emerald-400/40">
                      Sovereign AI
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                    Multilingual intelligence engineered for over 220 million Nigerians across Yoruba, Hausa, Igbo, and English.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
