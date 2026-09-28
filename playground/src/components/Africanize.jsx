import React, { useState } from 'react';
import { Sparkles, ArrowRight, Copy, Check, RefreshCw } from 'lucide-react';
import { CULTURAL_CONTEXTS, DEFAULT_ENDPOINTS } from '../constants';

export const Africanize = () => {
  const [content, setContent] = useState('We regret to inform you that your financial transaction was declined due to insufficient balances.');
  const [selectedContext, setSelectedContext] = useState('pidgin');
  const [formality, setFormality] = useState('natural');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleAfricanize = async () => {
    if (!content.trim() || isLoading) return;
    setIsLoading(true);
    setResult('');

    try {
      const res = await fetch(`${DEFAULT_ENDPOINTS.llmUrl}/v1/africanize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEFAULT_ENDPOINTS.apiKey}`,
        },
        body: JSON.stringify({
          content,
          culture_context: selectedContext,
          formality,
        }),
      });

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      setResult(data.adapted_text);
    } catch (e) {
      setResult(`Error adapting text: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-card">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 mb-1">Cultural Adaptation</p>
        <h2 className="text-lg sm:text-xl font-bold text-stone-900">Africanize Tone Adapter</h2>
        <p className="text-sm text-stone-400 mt-1 leading-relaxed">
          Rewrites formal or stiff phrasing into something that sounds like it was written by a Nigerian: warm, respectful, and natural.
        </p>
      </div>

      {/* Cultural Context Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {CULTURAL_CONTEXTS.map(c => {
          const isSelected = selectedContext === c.id;
          return (
            <div
              key={c.id}
              onClick={() => setSelectedContext(c.id)}
              className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-federal-600 border-federal-600 shadow-sm'
                  : 'bg-white border-stone-200 hover:border-stone-300'
              }`}
            >
              <h4 className={`font-bold text-xs sm:text-sm truncate ${isSelected ? 'text-white' : 'text-stone-900'}`}>{c.name}</h4>
              <p className={`text-[11px] sm:text-xs mt-1 line-clamp-2 ${isSelected ? 'text-federal-100' : 'text-stone-400'}`}>{c.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Side-by-side Workbench */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Text Input */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-card space-y-3">
          <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider block">
            Standard Input Text
          </span>
          <textarea
            rows={5}
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full p-3 bg-cream-50 rounded-xl border border-federal-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-federal-500 resize-none leading-relaxed"
            placeholder="Type standard or corporate message here..."
          />
          <button
            onClick={handleAfricanize}
            disabled={!content.trim() || isLoading}
            className="w-full py-2.5 rounded-xl bg-federal-700 hover:bg-federal-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-ochre-400" />}
            {isLoading ? "Adapting Cultural Tone..." : "Africanize Phrasing"}
          </button>
        </div>

        {/* Adapted Output */}
        <div className="bg-white p-5 rounded-2xl border border-federal-100 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-federal-700 uppercase tracking-wider">
                Adapted Nigerian Vernacular
              </span>
              {result && (
                <button
                  onClick={copyResult}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-mono"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-federal-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
            <div className="min-h-36 p-4 bg-federal-50/50 rounded-xl border border-federal-200/60 text-sm text-slate-800 leading-relaxed font-sans">
              {result ? (
                <p>{result}</p>
              ) : (
                <p className="text-slate-400 italic">
                  Click 'Africanize Phrasing' to see your message localized with authentic warmth and nuance.
                </p>
              )}
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Powered by N-ATLaS Cultural Linguistic Adapter
          </div>
        </div>
      </div>
    </div>
  );
};
