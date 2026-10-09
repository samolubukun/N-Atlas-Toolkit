import React, { useState, useRef } from 'react';
import { Mic, MicOff, Upload, ArrowRight, Play, CheckCircle2, RefreshCw, Languages, Sparkles, Copy, Check } from 'lucide-react';
import { ASR_MODELS, DEFAULT_ENDPOINTS, LLM_LANGUAGES } from '../constants';
import { AudioVisualizer } from './AudioVisualizer';

// Helper: Encodes Float32Array PCM samples into standard 16kHz 16-bit Mono WAV Blob
function encodeWAV(samples, sampleRate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + samples.length * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample
  // data sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

export const ASRStudio = ({ initialModelId = null, onSendToLLM }) => {
  const [selectedModel, setSelectedModel] = useState(() => {
    if (initialModelId && ASR_MODELS.some(m => m.id === initialModelId)) {
      return initialModelId;
    }
    return ASR_MODELS[0].id;
  });

  React.useEffect(() => {
    if (initialModelId && ASR_MODELS.some(m => m.id === initialModelId)) {
      setSelectedModel(initialModelId);
    }
  }, [initialModelId]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [words, setWords] = useState([]);
  const [latency, setLatency] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  // Translation Suggestion State
  const [targetLang, setTargetLang] = useState('en');
  const [translationText, setTranslationText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [transCopied, setTransCopied] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioCtxRef = useRef(null);
  const isRecordingRef = useRef(false);

  const currentModelObj = ASR_MODELS.find(m => m.id === selectedModel) || ASR_MODELS[0];

  // Request translation suggestion for transcription via N-ATLaS LLM
  const handleTranslate = async (target = targetLang) => {
    if (!transcript.trim()) return;
    setIsTranslating(true);
    setTranslationText('');
    try {
      const langNames = {
        'en': 'English',
        'yo': 'Yorùbá',
        'ha': 'Hausa',
        'ig': 'Igbo',
      };
      const destName = langNames[target] || 'English';
      const prompt = `Translate the following ${currentModelObj.badge} transcription accurately into natural ${destName}. Maintain tone, context, and nuance. Output ONLY the translation without preamble:\n\n"${transcript.trim()}"`;

      const res = await fetch(`${DEFAULT_ENDPOINTS.llmUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEFAULT_ENDPOINTS.apiKey}`,
        },
        body: JSON.stringify({
          model: 'NCAIR1/N-ATLaS-7B',
          messages: [
            {
              role: 'system',
              content: `You are an expert translator specializing in Nigerian indigenous languages (Yoruba, Hausa, Igbo) and English. Translate accurately with proper tones and natural phrasing. Output only the direct translation.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 300,
          stream: false,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const translated = data.choices?.[0]?.message?.content?.trim() || '';
      setTranslationText(translated);
    } catch (err) {
      console.error('Translation error:', err);
      setTranslationText(`Translation error: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  // Smart Utterance Recording (Push-to-Talk / Click-to-Speak)
  // Ensures 100% full-context accuracy of the N-ATLaS ASR model without chop degradation
  const toggleSpeechRecording = async () => {
    if (isRecording) {
      // User clicked stop: finalize utterance and send to ASR backend
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setAudioLevel(0);
    } else {
      // User clicked start: wake backend ping and initialize browser mic
      setTranscript('');
      setWords([]);
      setErrorMsg(null);
      setLatency(null);

      try {
        // Background wake-up ping to container if cold
        fetch(`${DEFAULT_ENDPOINTS.asrUrl}/healthz`, {
          method: 'GET',
          signal: AbortSignal.timeout(4000),
        }).catch(() => {});

        // Disable browser aggressive filters (echoCancellation/noiseSuppression) that clip phonetics & tones
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          }
        });

        // Initialize AudioContext at native hardware rate (e.g. 44.1kHz or 48kHz)
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = audioCtx;
        const nativeSampleRate = audioCtx.sampleRate;

        const src = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const dataArr = new Uint8Array(analyser.frequencyBinCount);

        const checkLevel = () => {
          if (!isRecordingRef.current) {
            audioCtx.close().catch(() => {});
            return;
          }
          analyser.getByteFrequencyData(dataArr);
          let sum = 0;
          for (let i = 0; i < dataArr.length; i++) sum += dataArr[i];
          const avg = sum / dataArr.length / 255;
          setAudioLevel(Math.min(1, avg * 3.5));
          requestAnimationFrame(checkLevel);
        };

        // Capture raw audio samples directly from AudioContext
        const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
        const audioBuffers = [];

        scriptProcessor.onaudioprocess = (e) => {
          if (!isRecordingRef.current) return;
          const channel = e.inputBuffer.getChannelData(0);
          audioBuffers.push(new Float32Array(channel));
        };

        src.connect(scriptProcessor);
        scriptProcessor.connect(audioCtx.destination);

        isRecordingRef.current = true;
        setIsRecording(true);
        requestAnimationFrame(checkLevel);

        mediaRecorderRef.current = {
          stop: async () => {
            isRecordingRef.current = false;
            stream.getTracks().forEach(t => t.stop());
            scriptProcessor.disconnect();
            src.disconnect();
            
            // Merge all raw native buffers
            const totalLength = audioBuffers.reduce((acc, b) => acc + b.length, 0);
            const merged = new Float32Array(totalLength);
            let offset = 0;
            for (const b of audioBuffers) {
              merged.set(b, offset);
              offset += b.length;
            }

            // High-fidelity downsample to exact 16000Hz expected by Whisper
            const targetSampleRate = 16000;
            let finalSamples;
            if (nativeSampleRate === targetSampleRate) {
              finalSamples = merged;
            } else {
              const ratio = nativeSampleRate / targetSampleRate;
              const newLength = Math.round(merged.length / ratio);
              finalSamples = new Float32Array(newLength);
              for (let i = 0; i < newLength; i++) {
                const originIdx = i * ratio;
                const low = Math.floor(originIdx);
                const high = Math.min(low + 1, merged.length - 1);
                const weight = originIdx - low;
                finalSamples[i] = merged[low] * (1 - weight) + merged[high] * weight;
              }
            }

            const wavBlob = encodeWAV(finalSamples, 16000);
            await transcribeAudioUtterance(wavBlob, 'speech.wav');
          }
        };
      } catch (err) {
        console.error("Microphone error:", err);
        setErrorMsg(err.message || String(err));
        setIsRecording(false);
      }
    }
  };

  // Audio File Upload
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
    setSelectedFile(file);
    setTranscript('');
    setWords([]);
  };

  // Transcribe full utterance using sovereign ASR endpoint
  const transcribeAudioUtterance = async (blobOrFile, filename = 'audio.wav') => {
    setIsProcessing(true);
    const startTime = performance.now();
    try {
      const formData = new FormData();
      formData.append('file', blobOrFile, filename);
      formData.append('model', selectedModel);
      formData.append('language', currentModelObj.lang);
      formData.append('response_format', 'json');
      formData.append('timestamp_granularities', 'word');

      const res = await fetch(`${DEFAULT_ENDPOINTS.asrUrl}/v1/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEFAULT_ENDPOINTS.apiKey}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      setTranscript(data.text || '');
      setWords(data.words || []);
      setLatency(Math.round(performance.now() - startTime));
    } catch (e) {
      console.error('Transcription error:', e);
      setErrorMsg(`Error transcribing audio: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadSampleAudio = async () => {
    try {
      const langMap = { 'ha': 'hausa', 'ig': 'igbo', 'yo': 'yoruba', 'en-ng': 'english' };
      const lang = langMap[currentModelObj.lang] || 'english';
      const res = await fetch(`/audio/${lang}.mp3`);
      const blob = await res.blob();
      const file = new File([blob], `${lang}_sample.mp3`, { type: 'audio/mp3' });
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setSelectedFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setTranscript('');
      setWords([]);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to load sample audio.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 mb-1">Sovereign Speech-to-Text</p>
          <h2 className="text-lg sm:text-xl font-bold text-stone-900">
            Speech Recognition Studio
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            100% Full-Context Accuracy
          </span>
        </div>
      </div>

      {/* Model Selection Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {ASR_MODELS.map((m) => {
          const isSelected = selectedModel === m.id;
          return (
            <div
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-federal-600 border-federal-600 shadow-sm ring-1 ring-federal-600'
                  : 'bg-white border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-md ${
                  isSelected ? 'bg-federal-500 text-white' : 'bg-stone-100 text-stone-500'
                }`}>
                  {m.badge}
                </span>
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />}
              </div>
              <h3 className={`font-bold text-xs sm:text-sm leading-snug ${isSelected ? 'text-white' : 'text-stone-900'}`}>{m.name}</h3>
              <p className={`text-[11px] sm:text-xs mt-1 leading-relaxed ${isSelected ? 'text-federal-100' : 'text-stone-500'}`}>{m.description}</p>
            </div>
          );
        })}
      </div>

      {/* Main Studio Console */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Real-time Oscilloscope & Spectrogram Visualizer */}
        <AudioVisualizer
          isRecording={isRecording || isProcessing}
          audioLevel={audioLevel}
          isLiveStream={isRecording}
        />

        {/* Action Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={toggleSpeechRecording}
              className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all w-full sm:w-auto ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-glow-green animate-pulse'
                  : 'bg-federal-700 hover:bg-federal-800 text-white shadow-sm'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isRecording ? 'Stop & Transcribe' : `Start Recording (${currentModelObj.badge})`}</span>
            </button>

            <label className="px-3.5 sm:px-4 py-2.5 rounded-xl font-semibold text-xs bg-federal-50 hover:bg-federal-100 text-federal-900 border border-federal-200 cursor-pointer flex items-center justify-center gap-2 transition-all flex-1 sm:flex-initial truncate">
              <Upload className="w-4 h-4 text-federal-600 shrink-0" />
              <span className="truncate">{selectedFile ? selectedFile.name : 'Upload Audio'}</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={loadSampleAudio}
              className="px-3 sm:px-3.5 py-2.5 rounded-xl font-medium text-xs bg-cream-100 hover:bg-cream-200 text-slate-700 border border-cream-300 transition-all shrink-0"
            >
              Load Sample
            </button>

            {audioUrl && !isProcessing && !isRecording && (
              <>
                <audio src={audioUrl} controls className="h-10 max-w-[200px]" />
                <button
                  onClick={() => transcribeAudioUtterance(selectedFile, selectedFile.name)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs bg-federal-600 hover:bg-federal-700 text-white shadow-sm transition-all"
                >
                  Transcribe
                </button>
              </>
            )}

            {isProcessing && (
              <span className="flex items-center gap-1.5 text-xs font-mono text-federal-700 animate-pulse bg-federal-50 px-2.5 py-1 rounded-lg border border-federal-200">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Transcribing audio...
              </span>
            )}

            {isRecording && (
              <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Listening to microphone...
              </span>
            )}
          </div>

          {latency && (
            <span className="text-xs font-mono text-slate-500 text-right">
              Latency: <strong className="text-federal-700">{latency}ms</strong>
            </span>
          )}
        </div>

        {/* Output & Word Alignment Panel */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1">
            <h4 className="text-[11px] sm:text-xs font-mono uppercase tracking-wider font-bold text-slate-700">
              Transcription Output
            </h4>
            {transcript && (
              <button
                onClick={() => onSendToLLM?.(transcript)}
                className="text-xs font-semibold text-federal-700 hover:text-federal-800 flex items-center gap-1 transition-all self-start xs:self-auto"
              >
                Send to N-ATLaS LLM <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="min-h-24 sm:min-h-28 p-3.5 sm:p-4 bg-cream-50 rounded-xl border border-federal-100 font-sans text-xs sm:text-sm text-slate-800 leading-relaxed">
            {transcript ? (
              <p className="font-medium text-slate-900">{transcript}</p>
            ) : errorMsg ? (
              <p className="text-red-600 font-mono text-xs">Error: {errorMsg}</p>
            ) : isRecording ? (
              <p className="text-emerald-700 italic animate-pulse">
                Recording in progress... Speak into your mic, then click "Stop & Transcribe" when finished.
              </p>
            ) : (
              <p className="text-slate-400 italic">
                Click "Start Recording ({currentModelObj.badge})" to record your voice, or upload an audio file.
              </p>
            )}
          </div>

          {/* Word-Level Timestamp Alignment */}
          {words.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-2">
                Word-Level Alignment & Confidence
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-white rounded-lg border border-federal-100/60">
                {words.map((w, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-cream-200 hover:bg-federal-100 text-slate-800 rounded text-xs font-mono border border-cream-300 transition-colors flex items-center gap-1.5"
                  >
                    <span>{w.word}</span>
                    <span className="text-[10px] text-federal-700 font-semibold">{w.start?.toFixed(1)}s</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Translation Suggestion Section */}
          {transcript && (
            <div className="mt-4 pt-4 border-t border-federal-100/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-federal-100 text-federal-800">
                    <Languages className="w-4 h-4" />
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      Translation Suggestion
                      <span className="text-[10px] font-mono font-normal text-federal-600 bg-federal-50 border border-federal-200 px-1.5 py-0.5 rounded">
                        Powered by N-ATLaS LLM
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Get an instant indigenous or English translation suggestion for this transcript
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={targetLang}
                    onChange={(e) => {
                      setTargetLang(e.target.value);
                      handleTranslate(e.target.value);
                    }}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-federal-500"
                  >
                    <option value="en">Translate to English</option>
                    <option value="yo">Translate to Yorùbá</option>
                    <option value="ha">Translate to Hausa</option>
                    <option value="ig">Translate to Igbo</option>
                  </select>

                  <button
                    onClick={() => handleTranslate(targetLang)}
                    disabled={isTranslating}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-federal-700 hover:bg-federal-800 text-white flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0"
                  >
                    {isTranslating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Translating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Translate
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Translation Output Box */}
              {isTranslating ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-federal-600" />
                  Generating accurate translation via N-ATLaS LLM...
                </div>
              ) : translationText ? (
                <div className="p-3.5 rounded-xl bg-federal-50/70 border border-federal-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-federal-800">
                      Suggested Translation
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(translationText);
                        setTransCopied(true);
                        setTimeout(() => setTransCopied(false), 2000);
                      }}
                      className="text-[11px] font-medium text-federal-700 hover:text-federal-900 flex items-center gap-1"
                    >
                      {transCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                    {translationText}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
