import React, { useState } from 'react';
import {
  Languages,
  ArrowRightLeft,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Volume2,
  Send,
  FileText,
  AlertCircle
} from 'lucide-react';
import { DEFAULT_ENDPOINTS, isConfigured } from '../constants';

const TRANSLATION_LANGUAGES = [
  { id: 'en', name: 'English', badge: 'English', toneMarks: false },
  { id: 'yo', name: 'Yorùbá', badge: 'Yorùbá (Àmì Ohùn)', toneMarks: true },
  { id: 'ha', name: 'Hausa', badge: 'Hausa', toneMarks: false },
  { id: 'ig', name: 'Igbo', badge: 'Asụsụ Igbo', toneMarks: false },
];

const EXAMPLE_PROMPTS = [
  {
    category: 'Yorùbá Proverb & Wisdom',
    sourceLang: 'yo',
    targetLang: 'en',
    title: 'Òwe Yorùbá: Unity & Endurance',
    text: 'Àgbájọ ọwọ́ la fi ń sọ̀yà; àjèjì ọwọ́ kan kò gbẹ́rù d\'orí.',
    hint: 'Translates indigenous proverb with cultural depth and meaning.',
  },
  {
    category: 'Hausa Etiquette & Commerce',
    sourceLang: 'ha',
    targetLang: 'en',
    title: 'Gaisuwa da Ciniki a Kano',
    text: 'Ina kwana ranka ya dade, fatan kana lafiya lau. Nawa ne kudin wannan yadi na shadda?',
    hint: 'Respectful Northern market greeting and inquiry.',
  },
  {
    category: 'Igbo Kinship & Hospitality',
    sourceLang: 'ig',
    targetLang: 'en',
    title: 'Ekele na Mmadụ niile',
    text: 'Nnọọ nwanne m nwoke, kedu ka ezinụlọ gị na ụmụaka si eme? Anyị na-enwe ekele maka ọbịbịa gị.',
    hint: 'Warm traditional Igbo family greeting and gratitude.',
  },
  {
    category: 'Healthcare Localization',
    sourceLang: 'en',
    targetLang: 'yo',
    title: 'Public Health Advisory (Cholera)',
    text: 'Ensure all drinking water is properly boiled or chlorinated, wash hands with soap frequently, and report severe dehydration immediately to the nearest primary health center.',
    hint: 'Translates clinical English into clear grassroot Yorùbá with tones.',
  },
  {
    category: 'Civic & Legal Notice',
    sourceLang: 'en',
    targetLang: 'ha',
    title: 'CAC Business Registration Guide',
    text: 'To register your small enterprise on the CAC portal, prepare two proposed business names, a valid National Identification Number (NIN), and a clear passport photograph.',
    hint: 'Translates formal institutional English into accessible Hausa.',
  },
  {
    category: 'Agriculture & Climate',
    sourceLang: 'en',
    targetLang: 'ig',
    title: 'Yam Harvest & Soil Management',
    text: 'Before planting yams during the early rains, prepare fertile ridges with organic mulch and protect the young shoots from pest infestation.',
    hint: 'Translates agronomy guidance into authentic Igbo vocabulary.',
  },
];

export const TranslationStudio = ({ onSendToChat }) => {
  const [sourceLang, setSourceLang] = useState('yo');
  const [targetLang, setTargetLang] = useState('en');
  const [inputText, setInputText] = useState('Àgbájọ ọwọ́ la fi ń sọ̀yà; àjèjì ọwọ́ kan kò gbẹ́rù d\'orí.');
  const [translatedText, setTranslatedText] = useState('');
  const [notes, setNotes] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const sourceObj = TRANSLATION_LANGUAGES.find(l => l.id === sourceLang) || TRANSLATION_LANGUAGES[0];
  const targetObj = TRANSLATION_LANGUAGES.find(l => l.id === targetLang) || TRANSLATION_LANGUAGES[1];

  const handleSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    if (translatedText) {
      setInputText(translatedText);
      setTranslatedText('');
      setNotes('');
    }
  };

  const handleTranslate = async (textToTranslate = inputText) => {
    const text = textToTranslate.trim();
    if (!text) return;

    setIsTranslating(true);
    setErrorMsg(null);
    setTranslatedText('');
    setNotes('');

    try {
      const isTargetToneMarked = targetLang === 'yo';

      const systemPrompt = `You are N-ATLaS, Nigeria's Sovereign Sovereign Multilingual Translation Engine.
You specialize in high-fidelity translation between Nigerian indigenous languages (Yorùbá, Hausa, Igbo) and English.
Guidelines:
1. Translate accurately while preserving cultural nuance, idiomatic meaning, and formal/informal register.
${isTargetToneMarked ? '2. ALWAYS use proper Yorùbá diacritics and tone marks (Àmì Ohùn: do, re, mi) consistently across all words.' : '2. Use natural, authentic phrasing rather than stiff word-for-word translation.'}
3. Format your response into two distinct sections:
### Translation:
[The direct, natural translation here]

### Cultural & Linguistic Notes:
[1-2 brief bullet points explaining idiomatic nuances, proverbs, or tone guidelines, if applicable. If none, write "Direct contextual translation."]`;

      const userPrompt = `Source Language: ${sourceObj.name}
Target Language: ${targetObj.name}

Text to translate:
"""
${text}
"""`;

      const res = await fetch(`${DEFAULT_ENDPOINTS.llmUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEFAULT_ENDPOINTS.apiKey}`,
        },
        body: JSON.stringify({
          model: 'NCAIR1/N-ATLaS-7B',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 600,
          stream: false,
        }),
      });

      if (!res.ok) {
        throw new Error(`API returned status ${res.status}`);
      }

      const data = await res.json();
      const rawOutput = data.choices?.[0]?.message?.content || '';

      // Parse output sections
      const transMatch = rawOutput.match(/### Translation:\s*([\s\S]*?)(?=### Cultural & Linguistic Notes:|$)/i);
      const notesMatch = rawOutput.match(/### Cultural & Linguistic Notes:\s*([\s\S]*)$/i);

      if (transMatch && transMatch[1].trim()) {
        setTranslatedText(transMatch[1].trim());
        if (notesMatch && notesMatch[1].trim()) {
          setNotes(notesMatch[1].trim());
        }
      } else {
        // Fallback: direct content
        setTranslatedText(rawOutput.trim());
      }
    } catch (err) {
      console.error('Translation error:', err);
      setErrorMsg(`Translation failed: ${err.message || 'Please check your API key & network.'}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadExample = (example) => {
    setSourceLang(example.sourceLang);
    setTargetLang(example.targetLang);
    setInputText(example.text);
    setTranslatedText('');
    setNotes('');
  };

  const handleTransferToChat = () => {
    const prompt = `Translate the following text from ${sourceObj.name} to ${targetObj.name} with cultural explanations and tone marks:\n\n"${inputText}"`;
    onSendToChat?.(prompt);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-federal-100 text-federal-800">
              <Languages className="w-4 h-4" />
            </span>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-stone-400">Sovereign Translation</p>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 mt-1">
            N-ATLaS Multilingual Translator
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Bi-directional cultural translation across Yorùbá, Hausa, Igbo, and English powered by N-ATLaS LLM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Tone & Nuance Aware
          </span>
        </div>
      </div>

      {/* Language Selector Controls Bar */}
      <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-card flex items-center justify-between gap-2 sm:gap-4">
        {/* Source Language Selector */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-semibold text-stone-500 hidden sm:inline">From:</span>
          <select
            value={sourceLang}
            onChange={(e) => {
              setSourceLang(e.target.value);
              if (e.target.value === targetLang) {
                // Pick different target
                const other = TRANSLATION_LANGUAGES.find(l => l.id !== e.target.value);
                if (other) setTargetLang(other.id);
              }
            }}
            className="w-full sm:w-auto text-xs font-bold px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-federal-500"
          >
            {TRANSLATION_LANGUAGES.map(l => (
              <option key={l.id} value={l.id}>{l.name} ({l.badge})</option>
            ))}
          </select>
        </div>

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-cream-100 hover:bg-cream-200 text-stone-700 border border-stone-200 flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs"
          title="Swap source and target languages"
        >
          <ArrowRightLeft className="w-4 h-4 text-federal-700" />
          <span className="text-xs font-medium hidden md:inline">Swap</span>
        </button>

        {/* Target Language Selector */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-xs font-semibold text-stone-500 hidden sm:inline">To:</span>
          <select
            value={targetLang}
            onChange={(e) => {
              setTargetLang(e.target.value);
              if (e.target.value === sourceLang) {
                const other = TRANSLATION_LANGUAGES.find(l => l.id !== e.target.value);
                if (other) setSourceLang(other.id);
              }
            }}
            className="w-full sm:w-auto text-xs font-bold px-3 py-2 rounded-xl border border-federal-300 bg-federal-50/50 text-federal-900 focus:outline-none focus:ring-2 focus:ring-federal-500"
          >
            {TRANSLATION_LANGUAGES.map(l => (
              <option key={l.id} value={l.id}>{l.name} ({l.badge})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Dual Translation Panes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Text Box */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-4 sm:p-5 flex flex-col justify-between space-y-3 min-h-[300px]">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-500">
              Source ({sourceObj.name})
            </span>
            <span className="text-[10px] text-stone-400 font-mono">
              {inputText.length} characters
            </span>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Type or paste text in ${sourceObj.name}...`}
            className="w-full flex-1 min-h-[160px] resize-none border-none focus:outline-none text-stone-800 text-sm sm:text-base leading-relaxed placeholder:text-stone-300 bg-transparent font-sans"
          />

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
            <button
              onClick={() => setInputText('')}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              Clear
            </button>

            <button
              onClick={() => handleTranslate()}
              disabled={isTranslating || !inputText.trim()}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-federal-700 hover:bg-federal-800 text-white shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isTranslating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-ochre-300" />
                  <span>Translate to {targetObj.name}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Target Translation Box */}
        <div className="bg-cream-50/60 rounded-2xl border border-stone-200 shadow-card p-4 sm:p-5 flex flex-col justify-between space-y-3 min-h-[300px]">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200/60">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-federal-800">
                Translation ({targetObj.name})
              </span>
              {targetObj.toneMarks && (
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Tone-Marked
                </span>
              )}
            </div>

            {translatedText && (
              <button
                onClick={() => handleCopy(translatedText)}
                className="text-xs font-medium text-federal-700 hover:text-federal-900 flex items-center gap-1 px-2 py-1 rounded hover:bg-stone-200/50 transition-colors"
                title="Copy translation"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>

          {/* Translation content */}
          <div className="flex-1 min-h-[160px] overflow-y-auto">
            {isTranslating ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-federal-600" />
                <p className="text-xs font-semibold text-stone-600">Translating text with cultural nuances & tone marks...</p>
              </div>
            ) : errorMsg ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div>{errorMsg}</div>
              </div>
            ) : translatedText ? (
              <div className="space-y-4">
                <p className="text-stone-900 text-base sm:text-lg font-medium leading-relaxed select-text">
                  {translatedText}
                </p>

                {notes && (
                  <div className="p-3 rounded-xl bg-white/80 border border-stone-200 text-xs text-stone-600 space-y-1">
                    <p className="font-bold text-[10px] font-mono uppercase tracking-wider text-federal-800 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-ochre-600" />
                      Cultural & Linguistic Notes
                    </p>
                    <div className="text-[11px] leading-relaxed whitespace-pre-line text-slate-700">
                      {notes}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-stone-400 text-xs py-8">
                Click &quot;Translate&quot; to see the bilingual output with tone marks and cultural notes.
              </div>
            )}
          </div>

          {/* Action buttons at bottom */}
          {translatedText && (
            <div className="pt-3 border-t border-stone-200/60 flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-stone-400">
                Sovereign N-ATLaS Output
              </span>

              <button
                onClick={handleTransferToChat}
                className="text-xs font-semibold text-federal-700 hover:text-federal-900 bg-white hover:bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Continue discussion in Chat Stream"
              >
                <span>Ask LLM in Chat ↗</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Example Prompts Across All Languages */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-ochre-600" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
              Interactive Example Prompts across All Languages
            </h3>
          </div>
          <span className="text-[11px] text-stone-400 hidden sm:inline">
            Click any card to load instantly
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {EXAMPLE_PROMPTS.map((ex, idx) => {
            const sLang = TRANSLATION_LANGUAGES.find(l => l.id === ex.sourceLang)?.name;
            const tLang = TRANSLATION_LANGUAGES.find(l => l.id === ex.targetLang)?.name;
            return (
              <div
                key={idx}
                onClick={() => handleLoadExample(ex)}
                className="p-3 rounded-xl bg-cream-50/70 hover:bg-federal-50/60 border border-stone-200 hover:border-federal-300 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white border border-stone-200 text-federal-800">
                      {sLang} → {tLang}
                    </span>
                    <span className="text-[10px] text-stone-400 truncate max-w-[120px]">
                      {ex.category}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-federal-700 transition-colors mb-1">
                    {ex.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 line-clamp-2 italic mb-2">
                    &quot;{ex.text}&quot;
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-200/50 flex items-center justify-between">
                  <span className="text-[10px] text-stone-500">
                    {ex.hint}
                  </span>
                  <span className="text-[11px] font-bold text-federal-700 group-hover:translate-x-0.5 transition-transform">
                    Try ↗
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
