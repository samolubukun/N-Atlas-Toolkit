import React, { useState, useRef } from 'react';
import {
  Volume2,
  Play,
  Pause,
  Download,
  RotateCcw,
  User,
  ExternalLink,
  Languages,
  Send,
  AlertCircle
} from 'lucide-react';
import { TTS_MODELS, TTS_VOICES, DEFAULT_ENDPOINTS } from '../constants';

const QUICK_PRESETS = [
  {
    category: "Yoruba",
    modelId: "samuelolubukun/xtts-v2-yoruba-openbible-conversational",
    voice: "male_victor",
    title: "Yoruba Sample",
    text: "Àjọṣepọ̀ àti ìrẹ́pọ̀ ló ń mú ìlọsíwájú wá. Nígbà tí a bá fi ọwọ́ kan ṣiṣẹ́, àṣeyọrí máa ń tètè dé fún gbogbo wa.",
  },
  {
    category: "Hausa",
    modelId: "samuelolubukun/xtts-v2-hausa-openbible-conversational",
    voice: "male_victor",
    title: "Hausa Sample",
    text: "Hadin kai da zaman lafiya sune ginshikin ci gaba. Idan muna aiki tare da zuciya daya, komai zai tafi daidai.",
  },
  {
    category: "Igbo",
    modelId: "samuelolubukun/xtts-v2-igbo-openbible-conversational",
    voice: "female_blessing",
    title: "Igbo Sample",
    text: "Udo na ọganihu dị mma maka obodo anyị. Mgbe anyị na-enyere ibe anyị aka, ndụ na-aka mma.",
  },
];

export const TTSStudio = ({ onSendToLLM }) => {
  const [selectedModelId, setSelectedModelId] = useState(TTS_MODELS[0].id);
  const [selectedVoice, setSelectedVoice] = useState(TTS_VOICES[0].id);
  const [inputText, setInputText] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [latency, setLatency] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef(null);

  const selectedModel = TTS_MODELS.find(m => m.id === selectedModelId) || TTS_MODELS[0];
  const selectedVoiceObj = TTS_VOICES.find(v => v.id === selectedVoice) || TTS_VOICES[0];

  const handleModelChange = (modelId) => {
    setSelectedModelId(modelId);
  };

  const handleSynthesize = async () => {
    if (!inputText.trim()) return;

    if (!DEFAULT_ENDPOINTS.ttsUrl) {
      setErrorMsg("VITE_WAZOBIA_TTS_API_URL is not configured in your environment (.env).");
      return;
    }

    setIsSynthesizing(true);
    setErrorMsg(null);
    const startTime = performance.now();

    try {
      const endpoint = `${DEFAULT_ENDPOINTS.ttsUrl}/v1/audio/speech`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEFAULT_ENDPOINTS.ttsApiKey || 'none'}`,
        },
        body: JSON.stringify({
          model: selectedModelId,
          voice: selectedVoice,
          input: inputText.trim(),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Speech synthesis failed (${response.status}): ${errText || response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      setLatency(elapsed);

      // Play audio automatically
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('TTS synthesis error:', err);
      setErrorMsg(err.message || 'Unable to generate speech. Please check your endpoint.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  return (
    <div className="space-y-5">
      {/* Research Preview Banner — clean, subtle slate neutral styling */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 text-white shadow-card relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 text-[10px] font-mono font-semibold tracking-wide uppercase">
                XTTS-v2
              </span>
              <span className="text-[11px] text-stone-400 font-mono">
                WaZoBia Voice AI
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Wazobia Speech Synthesis Studio
            </h2>

            <p className="text-xs text-stone-300 leading-relaxed">
              Fine-tuned Coqui XTTS-v2 speech models by{' '}
              <a
                href="https://huggingface.co/samuelolubukun"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-white underline hover:text-emerald-400 transition-colors"
              >
                Samuel Olubukun
              </a>{' '}
              for Yoruba, Hausa, and Igbo. Note: This is an independent project and not an official N-ATLaS model(s).
            </p>
          </div>

          <div className="shrink-0 pt-1 md:pt-0">
            <a
              href="https://www.samuelolubukun.com/blogs/fine-tuning-xtts-v2-wazobia-conversational-speech"
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full sm:w-auto justify-center px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-200 hover:text-white border border-stone-700 text-xs font-medium shadow-sm transition-all items-center gap-1.5 touch-manipulation"
            >
              <span>Learn More</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-stone-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Studio Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-3.5 sm:p-6 space-y-5 sm:space-y-6">
        
        {/* Model & Voice Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Conversational Model Select */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-federal-600" />
              Select XTTS-v2 Language Model
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {TTS_MODELS.map((model) => {
                const isSelected = model.id === selectedModelId;
                return (
                  <div
                    key={model.id}
                    onClick={() => handleModelChange(model.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-federal-600 bg-federal-50/70 shadow-sm ring-1 ring-federal-500'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-semibold text-xs text-stone-900">
                          {model.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        {model.description}
                      </p>
                    </div>

                    {/* Link to Hugging Face Model Weights */}
                    <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        model.lang === 'yo' ? 'bg-indigo-50 text-indigo-700' :
                        model.lang === 'ha' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {model.badge}
                      </span>
                      {model.hfUrl && (
                        <a
                          href={model.hfUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] text-federal-600 hover:text-federal-800 font-medium inline-flex items-center gap-1 hover:underline"
                          title="View model weights on Hugging Face"
                        >
                          <span>Model Weights</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Voice Timbre Select */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-federal-600" />
              Reference Voice
            </label>
            <div className="space-y-2">
              {TTS_VOICES.map((v) => {
                const isSelected = v.id === selectedVoice;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVoice(v.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'border-federal-600 bg-federal-50/70 shadow-sm'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50/60'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                      isSelected ? 'bg-federal-600 text-white' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {v.gender === 'Male' ? 'M' : 'F'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-stone-900 flex items-center gap-1.5">
                        <span>{v.name}</span>
                        <span className="text-[10px] font-normal text-stone-400">({v.accent})</span>
                      </div>
                      <div className="text-[11px] text-stone-500 truncate mt-0.5">
                        {v.tagline}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Presets */}
            <div className="pt-2">
              <div className="text-[11px] font-semibold text-stone-500 mb-1.5">Sample Presets:</div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedModelId(p.modelId);
                      setSelectedVoice(p.voice);
                      setInputText(p.text);
                    }}
                    className="text-[10px] px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors"
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Input Text Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-federal-600 shrink-0" />
              <span>Text to Synthesize (Diacritics Supported)</span>
            </label>
            <span className="text-[11px] font-mono text-stone-400 shrink-0">
              {inputText.length} chars
            </span>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`e.g. "${selectedModel?.sampleText || 'Type Yoruba, Hausa, or Igbo text with tone diacritics...'}"`}
            rows={3}
            className="w-full rounded-xl border border-stone-300 p-3 sm:p-3.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-federal-500 focus:border-transparent transition-all placeholder:text-stone-400"
          />

          {/* Quick Diacritics bar (commented out)
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-stone-500 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 overflow-hidden">
            <span className="text-[11px] font-medium shrink-0">Quick Diacritics:</span>
            <div className="flex items-center gap-1 font-mono text-xs overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
              {['à', 'á', 'è', 'é', 'ẹ', 'ẹ́', 'ẹ̀', 'ì', 'í', 'ò', 'ó', 'ọ', 'ọ́', 'ọ̀', 'ù', 'ú', 'ṣ', 'ɓ', 'ɗ', 'ƙ', 'ị', 'ọ', 'ụ', 'ṅ'].map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => setInputText((prev) => prev + char)}
                  className="px-2 py-1 sm:px-1.5 sm:py-0.5 rounded bg-white hover:bg-stone-200 active:bg-stone-300 text-stone-800 border border-stone-300 transition-colors shrink-0 text-xs shadow-xs touch-manipulation"
                >
                  {char}
                </button>
              ))}
            </div>
          </div>
          */}
        </div>

        {/* Action Bar — responsive wrapping */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSynthesize}
              disabled={isSynthesizing || !inputText.trim()}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-federal-600 hover:bg-federal-700 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2 touch-manipulation"
            >
              {isSynthesizing ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Synthesizing Audio...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 shrink-0" />
                  <span>Generate Speech</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setInputText('')}
              className="px-3.5 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 active:bg-stone-100 text-stone-600 text-xs font-medium transition-colors shrink-0 touch-manipulation"
            >
              Clear
            </button>
          </div>

          {latency && (
            <div className="text-xs font-mono text-stone-500 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 self-start sm:self-auto">
              Latency: {latency}s
            </div>
          )}
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-1">
              <p className="font-semibold">Synthesis Error</p>
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Audio Playback Player Card — fully responsive layout */}
        {audioUrl && (
          <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-federal-50 to-emerald-50/50 border border-federal-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={togglePlayback}
                  className="w-10 h-10 rounded-full bg-federal-600 hover:bg-federal-700 active:scale-95 text-white flex items-center justify-center shadow-md transition-all shrink-0 touch-manipulation"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-stone-900 leading-snug break-words">
                    {selectedModel.name} <span className="text-stone-400 font-normal">·</span> {selectedVoiceObj.name}
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono tracking-tight flex items-center gap-1.5 flex-wrap">
                    <span>24kHz Mono WAV</span>
                    <span className="text-stone-300">·</span>
                    <span className="text-emerald-700 font-sans font-medium">XTTS-v2</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={audioUrl}
                  download={`wazobia_${selectedModel.lang}_speech.wav`}
                  className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-xl bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-xs touch-manipulation"
                >
                  <Download className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <span>Download .WAV</span>
                </a>

                {onSendToLLM && (
                  <button
                    type="button"
                    onClick={() => onSendToLLM(`Translate or analyze this synthesized sentence: "${inputText}"`)}
                    className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-xl bg-federal-100 hover:bg-federal-200 active:bg-federal-300 text-federal-800 text-xs font-medium transition-colors flex items-center justify-center gap-1 touch-manipulation"
                  >
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span>Discuss</span>
                  </button>
                )}
              </div>
            </div>

            <audio
              ref={audioRef}
              controls
              src={audioUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="w-full mt-1 sm:mt-2"
            />
          </div>
        )}

      </div>
    </div>
  );
};
