import React, { useState } from 'react';
import { ArrowLeftRight, RefreshCw, Copy, Check } from 'lucide-react';
import { DEFAULT_ENDPOINTS } from '../constants';

export const Translate = () => {
  const [sourceText, setSourceText] = useState('Welcome to Nigeria. We hope you enjoy our culture, food, and hospitality.');
  const [targetLang, setTargetLang] = useState('yoruba');
  const [sourceLang, setSourceLang] = useState('english');
  const [translatedText, setTranslatedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const languages = [
    { id: 'english', name: 'English' },
    { id: 'yoruba', name: 'Yorùbá' },
    { id: 'hausa', name: 'Hausa' },
    { id: 'igbo', name: 'Asụsụ Igbo' },
    { id: 'pidgin', name: 'Nigerian Pidgin' },
  ];

  const handleTranslate = async () => {
    if (!sourceText.trim() || isLoading) return;
    setIsLoading(true);
    setTranslatedText('');

    try {
      const res = await fetch(`${DEFAULT_ENDPOINTS.llmUrl}/v1/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEFAULT_ENDPOINTS.apiKey}`,
        },
        body: JSON.stringify({
          text: sourceText,
          target_lang: targetLang,
          source_lang: sourceLang,
          tone: 'natural',
        }),
      });

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      setTranslatedText(data.translation);
    } catch (e) {
      setTranslatedText(`Translation error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const swapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    setSourceText(translatedText || sourceText);
    setTranslatedText('');
  };

  const copyResult = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-card">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 mb-1">Neural Translation</p>
        <h2 className="text-lg sm:text-xl font-bold text-stone-900">Multilingual Translation</h2>
        <p className="text-sm text-stone-400 mt-1">Direct translation between English and Nigerian languages. No pivot languages, no quality loss.</p>
      </div>

      {/* Language Bar */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-stone-200 shadow-card flex items-center justify-between gap-2 sm:gap-4">
        <select
          value={sourceLang}
          onChange={e => setSourceLang(e.target.value)}
          className="bg-stone-100 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold text-stone-800 border border-stone-200 focus:outline-none flex-1 max-w-[42%]"
        >
          {languages.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        <button
          onClick={swapLanguages}
          className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors shrink-0"
          aria-label="Swap languages"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>

        <select
          value={targetLang}
          onChange={e => setTargetLang(e.target.value)}
          className="bg-stone-100 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold text-stone-800 border border-stone-200 focus:outline-none flex-1 max-w-[42%]"
        >
          {languages.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {/* Side-by-side translation boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-federal-100 shadow-sm space-y-3">
          <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider block">
            Source Text
          </span>
          <textarea
            rows={5}
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            className="w-full p-3 bg-cream-50 rounded-xl border border-federal-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-federal-500 resize-none leading-relaxed"
            placeholder="Enter text to translate..."
          />
          <button
            onClick={handleTranslate}
            disabled={!sourceText.trim() || isLoading}
            className="w-full py-2.5 rounded-xl bg-federal-700 hover:bg-federal-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            {isLoading ? "Translating..." : "Translate Directly"}
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-federal-100 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-federal-700 uppercase tracking-wider">
                Translation
              </span>
              {translatedText && (
                <button
                  onClick={copyResult}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-mono"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-federal-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
            <div className="min-h-44 p-4 bg-federal-50/50 rounded-xl border border-federal-200/60 text-sm text-slate-800 leading-relaxed font-sans">
              {translatedText ? (
                <p>{translatedText}</p>
              ) : (
                <p className="text-slate-400 italic">
                  Translation with authentic diacritics and cultural tone will appear here.
                </p>
              )}
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            NCAIR1/N-ATLaS Neural Translation
          </div>
        </div>
      </div>
    </div>
  );
};
