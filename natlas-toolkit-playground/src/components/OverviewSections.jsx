import React from 'react';
import {
  Terminal,
  Code2,
  Mic,
  Radio,
  Globe,
  Wand2,
  Server,
  Cloud,
  Layers,
  Compass,
  FileCode,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export const CoreCapabilities = () => {
  return (
    <div className="not-prose my-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Dual-Stack SDKs */}
      <div className="bg-stone-50/90 border border-stone-200/90 rounded-2xl p-4 sm:p-5 hover:border-federal-400 hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-xl bg-emerald-100/70 text-emerald-800 border border-emerald-200/80">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900">Dual-Stack SDKs</h4>
              <span className="text-[10px] font-mono text-emerald-700 font-semibold">Python · TypeScript</span>
            </div>
          </div>
          <ul className="text-xs text-stone-600 space-y-1.5 leading-relaxed">
            <li>• <strong>Python SDK</strong>: Sync, Async, SSE streams, retries, and CLI tool.</li>
            <li>• <strong>TypeScript SDK</strong>: Universal client for Node.js 18+, Bun, Next.js, and Browsers.</li>
          </ul>
        </div>
      </div>

      {/* 2. Audio Transcriptions */}
      <div className="bg-stone-50/90 border border-stone-200/90 rounded-2xl p-4 sm:p-5 hover:border-federal-400 hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-xl bg-blue-100/70 text-blue-800 border border-blue-200/80">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900">Audio Transcriptions</h4>
              <span className="text-[10px] font-mono text-blue-700 font-semibold">Batch & Timestamps</span>
            </div>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Convert spoken Yoruba, Hausa, Igbo, and Nigerian Accented English audio into formatted text with millisecond word timestamps and automatic resampling.
          </p>
        </div>
      </div>

      {/* 3. Sovereign Speech Recognizers */}
      <div className="bg-stone-50/90 border border-stone-200/90 rounded-2xl p-4 sm:p-5 hover:border-federal-400 hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-xl bg-amber-100/70 text-amber-800 border border-amber-200/80">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900">Sovereign Speech Models</h4>
              <span className="text-[10px] font-mono text-amber-700 font-semibold">Whisper Quad (244M)</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-stone-600 mt-2">
            <div className="bg-white border border-stone-200 px-2 py-1 rounded-md"><strong>Yoruba</strong>: 120h</div>
            <div className="bg-white border border-stone-200 px-2 py-1 rounded-md"><strong>Hausa</strong>: 120h</div>
            <div className="bg-white border border-stone-200 px-2 py-1 rounded-md"><strong>Igbo</strong>: 120h</div>
            <div className="bg-white border border-stone-200 px-2 py-1 rounded-md"><strong>Nig. English</strong>: 120h</div>
          </div>
        </div>
      </div>

      {/* 4. Specialized Nigerian Linguistic Endpoints */}
      <div className="bg-stone-50/90 border border-stone-200/90 rounded-2xl p-4 sm:p-5 hover:border-federal-400 hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-xl bg-purple-100/70 text-purple-800 border border-purple-200/80">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900">Cultural Linguistic APIs</h4>
            </div>
          </div>
          <ul className="text-xs text-stone-600 space-y-1.5 leading-relaxed">
          </ul>
        </div>
      </div>

      {/* 5. Fine-Tuning Starter Kit */}
      <div className="bg-stone-50/90 border border-stone-200/90 rounded-2xl p-4 sm:p-5 hover:border-federal-400 hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-xl bg-rose-100/70 text-rose-800 border border-rose-200/80">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900">Fine-Tuning Starter Kit</h4>
              <span className="text-[10px] font-mono text-rose-700 font-semibold">LoRA · QLoRA · Unsloth</span>
            </div>
          </div>
          <ul className="text-xs text-stone-600 space-y-1.5 leading-relaxed">
            <li>• <strong>LLM LoRA</strong>: Train custom Nigerian dialect adapters on Llama-3 8B.</li>
            <li>• <strong>Whisper PEFT</strong>: Fine-tune speech checkpoints on domain audio datasets.</li>
            <li>• <strong>Auto-Eval</strong>: Automated evaluation harness streaming Common Voice samples.</li>
          </ul>
        </div>
      </div>

      {/* 6. Sovereign Deployment & Gateway */}
      <div className="bg-stone-50/90 border border-stone-200/90 rounded-2xl p-4 sm:p-5 hover:border-federal-400 hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-xl bg-teal-100/70 text-teal-800 border border-teal-200/80">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900">Deployment & Infrastructure</h4>
              <span className="text-[10px] font-mono text-teal-700 font-semibold">Modal Serverless · Docker Compose</span>
            </div>
          </div>
          <ul className="text-xs text-stone-600 space-y-1.5 leading-relaxed">
            <li>• <strong>Modal Cloud</strong>: Scale-to-zero serverless GPU inference with cold-start volume caching.</li>
            <li>• <strong>Docker Gateway</strong>: 1-command on-prem deployment with NGINX routing and CPU fallback.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export const QuickNextSteps = ({ onSelectDoc }) => {
  const steps = [
    {
      id: 'install',
      title: 'Installation & Quickstart',
      description: 'Clone repo and configure local Python & TypeScript SDKs in 2 minutes.',
      icon: Terminal,
      color: 'bg-federal-50 text-federal-700 border-federal-200',
    },
    {
      id: 'models',
      title: 'Explore Model Catalog',
      description: 'Meta-Llama-3 8.03B specifications and fine-tuned Whisper checkpoints.',
      icon: Layers,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'asr-transcription',
      title: 'Batch Audio Transcriptions',
      description: 'Upload audio buffers and receive accurate millisecond word timestamps.',
      icon: Mic,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      id: 'finetune-overview',
      title: 'Fine-Tuning Starter Kit',
      description: 'Run LoRA scripts to adapt LLM and speech models to your domain.',
      icon: Code2,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
      id: 'deploy-modal',
      title: 'Modal & Docker Deployment',
      description: 'Deploy serverless on Modal or run self-hosted Docker containers.',
      icon: Server,
      color: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    {
      id: 'cookbook',
      title: 'Developer Cookbook & Recipes',
      description: 'Production WhatsApp bots, voice pipelines, and Next.js guides.',
      icon: Compass,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  ];

  return (
    <div className="not-prose my-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {steps.map((step) => {
        const Icon = step.icon;
        return (
          <button
            key={step.id}
            onClick={() => onSelectDoc(step.id)}
            className="group p-4 rounded-xl border border-stone-200 bg-white hover:border-federal-500 hover:shadow-xs transition-all flex items-start gap-3.5 text-left"
          >
            <div className={`p-2 rounded-xl border ${step.color} group-hover:scale-105 transition-transform shrink-0`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-stone-900 group-hover:text-federal-700 transition-colors flex items-center justify-between">
                <span>{step.title}</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-federal-600 transition-colors shrink-0" />
              </div>
              <div className="text-[11px] text-stone-500 mt-1 leading-normal">
                {step.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
