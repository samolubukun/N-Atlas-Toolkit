import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Sparkles,
  Bot,
  User,
  Radio,
  Download,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Send,
  Loader2,
  Info
} from 'lucide-react';
import { DEFAULT_ENDPOINTS, TTS_VOICES } from '../constants';
import { AudioVisualizer } from './AudioVisualizer';

// Encode raw Float32Array PCM samples into standard 16kHz 16-bit Mono WAV Blob for Whisper ASR
function encodeWAV(samples, sampleRate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + samples.length * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  // data sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

const S2S_LANGUAGES = [
  {
    id: 'yo',
    name: 'Yoruba',
    nativeName: 'Èdè Yorùbá',
    asrModel: 'NCAIR1/Yoruba-ASR',
    ttsModel: 'samuelolubukun/xtts-v2-yoruba-openbible-conversational',
    systemPrompt: `You are a friendly native Yoruba speaker having a casual voice conversation.
RULES:
1. Reply ONLY in plain, everyday spoken Yoruba — the kind a neighbour would use.
2. NO JARGON. Use common everyday Yoruba words naturally.
3. Be FACTUALLY CORRECT. Answer exactly what was asked directly and truthfully. If you genuinely do not know, say "Mi ò mọ̀ dájú" briefly.
4. Keep it to 1–2 short natural sentences.
5. Output spoken words only. No asterisks, bullet points, labels, or markdown.`,
    quickSample: 'Ẹ n lẹ́ o gbogbo ilé, ṣé àlàáfíà ni ẹ wà?',
  },
  {
    id: 'ha',
    name: 'Hausa',
    nativeName: 'Harshe Hausa',
    asrModel: 'NCAIR1/Hausa-ASR',
    ttsModel: 'samuelolubukun/xtts-v2-hausa-openbible-conversational',
    systemPrompt: `You are a friendly native Hausa speaker having a casual voice conversation.
RULES:
1. Reply ONLY in plain, everyday spoken Hausa — the kind a friend or market person would use. No formal or academic Hausa.
2. NO JARGON. Use the most common, natural Hausa word for any concept. If a loanword is widely used (e.g. "waya", "mota"), use it naturally.
3. Be FACTUALLY CORRECT. If asked "Mene ne X?", describe the real thing simply and truthfully. If you genuinely don't know, say "Ban sani ba" briefly rather than guessing.
4. Answer EXACTLY what was asked. No extra lectures or off-topic additions.
5. Keep it to 1–2 short natural sentences.
6. Output spoken words only. No asterisks, bullet points, labels, or markdown.`,
    quickSample: 'Ina kwana ranka ya dade, fatan kana lafiya lau?',
  },
  {
    id: 'ig',
    name: 'Igbo',
    nativeName: 'Asụsụ Igbo',
    asrModel: 'NCAIR1/Igbo-ASR',
    ttsModel: 'samuelolubukun/xtts-v2-igbo-openbible-conversational',
    systemPrompt: `You are a friendly native Igbo speaker having a casual voice conversation.
RULES:
1. Reply ONLY in plain, everyday spoken Igbo — the kind a neighbour or family member would use. No overly formal or literary Igbo.
2. NO JARGON. Use the most natural, widely understood Igbo word for any concept. If a common loanword is used (e.g. "fọnụ", "ụgbọ ala"), use it naturally.
3. Be FACTUALLY CORRECT. If asked "Kedu ihe bụ X?", describe the real thing simply and truthfully. If you genuinely don't know, say "Amaghị m" briefly rather than guessing.
4. Answer EXACTLY what was asked. No background lectures or off-topic additions.
5. Keep it to 1–2 short natural sentences.
6. Output spoken words only. No asterisks, bullet points, labels, or markdown.`,
    quickSample: 'Nnọọ nwanne m, kedu ka ị mere taa?',
  },
];

export const S2SStudio = ({ onSendToLLM }) => {
  const [selectedLangId, setSelectedLangId] = useState('yo');
  const [selectedVoice, setSelectedVoice] = useState('female_blessing');

  // Pipeline execution state
  // Idle -> Recording -> Transcribing (ASR) -> Generating (LLM) -> Synthesizing (XTTS) -> Playing -> Complete
  const [pipelineStep, setPipelineStep] = useState('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Conversation turns history
  const [turns, setTurns] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);

  // Audio Playback
  const [currentPlayingId, setCurrentPlayingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Manual fallback input text
  const [manualText, setManualText] = useState('');

  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioCtxRef = useRef(null);
  const isRecordingRef = useRef(false);
  const animFrameRef = useRef(null);

  const activeLang = S2S_LANGUAGES.find((l) => l.id === selectedLangId) || S2S_LANGUAGES[0];
  const activeVoiceObj = TTS_VOICES.find((v) => v.id === selectedVoice) || TTS_VOICES[0];

  // Stop playback when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // ── Step 1: Manual Voice Recording (click to start, click to stop) ──
  const toggleRecording = async () => {
    if (isRecording) {
      // ── STOP: user taps again to finish recording ──
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      return;
    }

    // ── START ──
    setErrorMsg(null);
    try {
      // Pre-warm ASR endpoint
      fetch(`${DEFAULT_ENDPOINTS.asrUrl}/healthz`, { signal: AbortSignal.timeout(3000) }).catch(() => {});

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording. Use localhost or HTTPS.');
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const nativeSampleRate = audioCtx.sampleRate;

      const src = audioCtx.createMediaStreamSource(stream);

      // Level meter only — no VAD / silence logic
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      const tickLevel = () => {
        if (!isRecordingRef.current) return;
        analyser.getByteFrequencyData(dataArr);
        let sum = 0;
        for (let i = 0; i < dataArr.length; i++) sum += dataArr[i];
        setAudioLevel(Math.min(1, (sum / dataArr.length / 255) * 3.5));
        animFrameRef.current = requestAnimationFrame(tickLevel);
      };

      // Raw PCM capture
      const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
      const audioBuffers = [];
      scriptProcessor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;
        audioBuffers.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      src.connect(scriptProcessor);
      scriptProcessor.connect(audioCtx.destination);

      isRecordingRef.current = true;
      setIsRecording(true);
      setPipelineStep('recording');
      animFrameRef.current = requestAnimationFrame(tickLevel);

      mediaRecorderRef.current = {
        stop: async () => {
          if (!isRecordingRef.current) return;
          isRecordingRef.current = false;
          setIsRecording(false);
          setAudioLevel(0);

          stream.getTracks().forEach((t) => t.stop());
          scriptProcessor.disconnect();
          src.disconnect();
          audioCtx.close().catch(() => {});

          const totalLength = audioBuffers.reduce((acc, b) => acc + b.length, 0);
          if (totalLength === 0) {
            setPipelineStep('idle');
            setErrorMsg('No audio captured. Please check your microphone.');
            return;
          }

          const merged = new Float32Array(totalLength);
          let offset = 0;
          for (const b of audioBuffers) { merged.set(b, offset); offset += b.length; }

          // Downsample to 16 kHz for Whisper
          let finalSamples;
          if (nativeSampleRate === 16000) {
            finalSamples = merged;
          } else {
            const ratio = nativeSampleRate / 16000;
            const newLen = Math.round(merged.length / ratio);
            finalSamples = new Float32Array(newLen);
            for (let i = 0; i < newLen; i++) {
              const o = i * ratio;
              const lo = Math.floor(o), hi = Math.min(lo + 1, merged.length - 1);
              finalSamples[i] = merged[lo] * (1 - (o - lo)) + merged[hi] * (o - lo);
            }
          }

          await processVoicePipeline(encodeWAV(finalSamples, 16000));
        },
      };
    } catch (err) {
      console.error('Mic capture error:', err);
      let msg = `Microphone error (${err.name || 'Error'}): ${err.message || 'Access denied or device not found.'}`;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Microphone permission blocked. Click the 🔒 in the address bar, set Microphone to "Allow", then reload.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No microphone found. Please plug in or enable a microphone.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Microphone is in use by another app. Close other voice programs and retry.';
      }
      setErrorMsg(msg);
      setIsRecording(false);
      setPipelineStep('idle');
    }
  };

  // ── Step 2 -> 3 -> 4: Complete S2S Execution Pipeline ──
  const processVoicePipeline = async (audioBlobOrText) => {
    setErrorMsg(null);
    const turnId = Date.now().toString();
    const newTurn = {
      id: turnId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      lang: activeLang.name,
      userText: '',
      agentText: '',
      audioUrl: null,
      durations: { asr: null, llm: null, tts: null },
    };

    setCurrentTurn(newTurn);

    try {
      let userQuery = '';

      // Check if input is audio or pre-typed text
      if (audioBlobOrText instanceof Blob) {
        // Step A: ASR Transcription
        setPipelineStep('transcribing');
        const asrStart = performance.now();

        const formData = new FormData();
        formData.append('file', audioBlobOrText, 'speech.wav');
        formData.append('model', activeLang.asrModel);
        formData.append('language', activeLang.id);
        formData.append('response_format', 'json');

        const asrRes = await fetch(`${DEFAULT_ENDPOINTS.asrUrl}/v1/audio/transcriptions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${DEFAULT_ENDPOINTS.apiKey}`,
          },
          body: formData,
        });

        if (!asrRes.ok) {
          throw new Error(`ASR Transcription failed (HTTP ${asrRes.status})`);
        }

        const asrData = await asrRes.json();
        userQuery = asrData.text?.trim() || '';
        newTurn.durations.asr = ((performance.now() - asrStart) / 1000).toFixed(2);
      } else {
        userQuery = String(audioBlobOrText).trim();
      }

      if (!userQuery) {
        throw new Error('No speech detected or transcription was empty. Please speak clearly into your mic.');
      }

      newTurn.userText = userQuery;
      setCurrentTurn({ ...newTurn });

      // Step B: N-ATLaS LLM Generation
      setPipelineStep('generating');
      const llmStart = performance.now();

      const llmRes = await fetch(`${DEFAULT_ENDPOINTS.llmUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEFAULT_ENDPOINTS.apiKey}`,
        },
        body: JSON.stringify({
          model: 'NCAIR1/N-ATLaS-7B',
          messages: [
            {
              role: 'system',
              content: `You are N-ATLaS, Nigeria's sovereign AI brain.
Understand the user's spoken voice query (even if in Yoruba, Hausa, Igbo, or English without accents).
Answer factually, accurately, and concisely (1 to 2 spoken sentences maximum).
Explain the real-world meaning, answer, or proverb clearly in English.`
            },
            {
              role: 'user',
              content: userQuery,
            },
          ],
          temperature: 0.2,
          max_tokens: 80,
          stream: false,
        }),
      });

      if (!llmRes.ok) {
        throw new Error(`LLM Brain response failed (HTTP ${llmRes.status})`);
      }

      const llmData = await llmRes.json();
      const englishThought = llmData.choices?.[0]?.message?.content?.trim() || '';

      // Pass B2: Translate into natural spoken indigenous language for XTTS-v2
      const transRes = await fetch(`${DEFAULT_ENDPOINTS.llmUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEFAULT_ENDPOINTS.apiKey}`,
        },
        body: JSON.stringify({
          model: 'NCAIR1/N-ATLaS-7B',
          messages: [
            {
              role: 'system',
              content: `You are N-ATLaS, Nigeria's Sovereign Multilingual Voice Partner.
Translate the following concise explanation into natural, everyday spoken ${activeLang.name}.
${activeLang.id === 'yo' ? 'Use proper Yorùbá tone marks (Àmì Ohùn) accurately.' : 'Use natural, fluent phrasing.'}
Keep it strictly to 1 or 2 natural spoken sentences.
Output ONLY the spoken words. No markdown, asterisks, bullet points, or labels.`
            },
            {
              role: 'user',
              content: englishThought,
            },
          ],
          temperature: 0.1,
          max_tokens: 100,
          stream: false,
        }),
      });

      if (!transRes.ok) throw new Error(`Indigenous voice translation failed (HTTP ${transRes.status})`);
      const transData = await transRes.json();
      let agentReply = transData.choices?.[0]?.message?.content?.trim() || '';
      if (!agentReply) {
        throw new Error('LLM generated an empty response.');
      }

      // Sanitize markdown, asterisks, bullet points or labels so TTS speaks purely spoken words
      agentReply = agentReply
        .replace(/^(\*|\-|\#+|[A-Za-zÀ-ÿ]+:)\s*/gm, '') // Strip bullet points, headings, labels
        .replace(/\*+/g, '')                             // Strip bold/italics asterisks
        .replace(/\n+/g, ' ')                            // Single line
        .trim();

      newTurn.agentText = agentReply;
      newTurn.durations.llm = ((performance.now() - llmStart) / 1000).toFixed(2);
      setCurrentTurn({ ...newTurn });

      // Step C: Wazobia Sovereign XTTS-v2 Speech Synthesis
      setPipelineStep('synthesizing');
      const ttsStart = performance.now();

      const ttsRes = await fetch(`${DEFAULT_ENDPOINTS.ttsUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEFAULT_ENDPOINTS.ttsApiKey || 'none'}`,
        },
        body: JSON.stringify({
          model: activeLang.ttsModel,
          voice: selectedVoice,
          input: agentReply,
        }),
      });

      if (!ttsRes.ok) {
        const errTxt = await ttsRes.text();
        throw new Error(`XTTS Synthesis failed (${ttsRes.status}): ${errTxt || ttsRes.statusText}`);
      }

      const audioBlob = await ttsRes.blob();
      const spokenUrl = URL.createObjectURL(audioBlob);
      newTurn.audioUrl = spokenUrl;
      newTurn.durations.tts = ((performance.now() - ttsStart) / 1000).toFixed(2);

      // Finalize turn & push into session history
      setTurns((prev) => [newTurn, ...prev]);
      setCurrentTurn(null);
      setPipelineStep('playing');

      // Auto-play the synthesized reply
      if (audioRef.current) {
        audioRef.current.src = spokenUrl;
        audioRef.current.play().catch(() => {});
        setCurrentPlayingId(turnId);
      }
    } catch (err) {
      console.error('S2S loop error:', err);
      setErrorMsg(err.message || 'Error occurred during Voice Agent loop.');
      setPipelineStep('idle');
      setCurrentTurn(null);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualText.trim() || pipelineStep !== 'idle') return;
    const txt = manualText.trim();
    setManualText('');
    processVoicePipeline(txt);
  };

  const playTurnAudio = (turn) => {
    if (!turn.audioUrl || !audioRef.current) return;
    if (currentPlayingId === turn.id) {
      audioRef.current.pause();
      setCurrentPlayingId(null);
    } else {
      audioRef.current.src = turn.audioUrl;
      audioRef.current.play().catch(() => {});
      setCurrentPlayingId(turn.id);
    }
  };

  const resetSession = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setTurns([]);
    setCurrentTurn(null);
    setPipelineStep('idle');
    setErrorMsg(null);
    setCurrentPlayingId(null);
  };

  return (
    <div className="space-y-5">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onEnded={() => {
          setCurrentPlayingId(null);
          if (pipelineStep === 'playing') setPipelineStep('idle');
        }}
        onError={() => setCurrentPlayingId(null)}
      />

      {/* Hero / Studio Top Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-stone-900 via-stone-900 to-federal-950 text-white p-4 sm:p-6 shadow-xl border border-stone-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                End-to-End Voice Agent
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                ASR &bull; N-ATLaS LLM &bull; XTTS-v2
              </span>
              <span className="text-[10px] font-mono tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 animate-pulse">
                ⚗ Experimental
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Wazobia Voice Agent</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-stone-800 text-emerald-400 font-mono font-medium">
                Live S2S Loop
              </span>
            </h1>
            <p className="text-xs text-stone-300 leading-relaxed">
              Speak naturally in Yoruba, Hausa, or Igbo. Your speech is transcribed by Sovereign ASR, reasoned over by the N-ATLaS LLM, and vocalized back in conversational XTTS-v2 speech.
            </p>
            <p className="text-[10px] text-amber-400/70 font-mono mt-1">
              ⚠︎ Experimental feature &mdash; model outputs may vary. Latency depends on endpoint availability.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={resetSession}
              disabled={turns.length === 0 && !currentTurn}
              className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 disabled:opacity-40 disabled:pointer-events-none text-stone-200 text-xs font-medium border border-stone-700 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Session</span>
            </button>
          </div>
        </div>

        {/* Step Progression Visualizer - mobile responsive horizontal scroll or 4-col */}
        <div className="mt-4 pt-4 border-t border-stone-800/80 grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              pipelineStep === 'recording'
                ? 'bg-rose-500/20 border-rose-400/50 text-rose-200 ring-2 ring-rose-500/20'
                : 'bg-stone-800/40 border-stone-700/60 text-stone-400'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
              <span>1. Voice In</span>
              <Mic className="w-3.5 h-3.5 shrink-0" />
            </div>
            <p className="text-[10px] opacity-80 truncate">Microphone Stream</p>
          </div>

          <div
            className={`p-2.5 rounded-xl border transition-all ${
              pipelineStep === 'transcribing'
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-200 ring-2 ring-amber-500/20'
                : 'bg-stone-800/40 border-stone-700/60 text-stone-400'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
              <span>2. Sovereign ASR</span>
              <Radio className="w-3.5 h-3.5 shrink-0" />
            </div>
            <p className="text-[10px] opacity-80 truncate">{activeLang.name} Whisper ASR</p>
          </div>

          <div
            className={`p-2.5 rounded-xl border transition-all ${
              pipelineStep === 'generating'
                ? 'bg-federal-500/20 border-federal-400/50 text-federal-200 ring-2 ring-federal-500/20'
                : 'bg-stone-800/40 border-stone-700/60 text-stone-400'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
              <span>3. N-ATLaS LLM</span>
              <Bot className="w-3.5 h-3.5" />
            </div>
            <p className="text-[10px] opacity-80 truncate">Conversational Brain</p>
          </div>

          <div
            className={`p-2.5 rounded-xl border transition-all ${
              pipelineStep === 'synthesizing' || pipelineStep === 'playing'
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 ring-2 ring-emerald-500/20'
                : 'bg-stone-800/40 border-stone-700/60 text-stone-400'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
              <span>4. XTTS-v2 Speech</span>
              <Volume2 className="w-3.5 h-3.5" />
            </div>
            <p className="text-[10px] opacity-80 truncate">Native Spoken Reply</p>
          </div>
        </div>
      </div>

      {/* Language & Voice Selector Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Language */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 block">Conversational Language</label>
            <div className="grid grid-cols-3 gap-2">
              {S2S_LANGUAGES.map((lang) => {
                const isSelected = lang.id === selectedLangId;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setSelectedLangId(lang.id)}
                    className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-federal-600 bg-federal-50/80 shadow-xs ring-1 ring-federal-600'
                        : 'border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="text-xs font-bold text-stone-900 whitespace-nowrap">{lang.name}</div>
                    <div className="text-[9.5px] sm:text-[10px] text-stone-500 font-serif whitespace-nowrap tracking-tighter leading-none mt-0.5">{lang.nativeName}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference Voice */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 block">Agent Voice Timbre</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TTS_VOICES.map((v) => {
                const isSelected = v.id === selectedVoice;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVoice(v.id)}
                    className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-600'
                        : 'border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="text-xs font-bold text-stone-900 whitespace-nowrap">{v.name}</div>
                    <div className="text-[11px] text-stone-500 leading-snug mt-0.5">{v.tagline}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Sample Starter - natural wrapping instead of horizontal scroll */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-stone-500 shrink-0">Try saying:</span>
          <button
            type="button"
            onClick={() => processVoicePipeline(activeLang.quickSample)}
            disabled={pipelineStep !== 'idle'}
            className="w-full sm:w-auto text-left px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-800 text-xs font-medium border border-stone-200 transition-colors disabled:opacity-50 break-words leading-relaxed touch-manipulation"
          >
            &ldquo;{activeLang.quickSample}&rdquo;
          </button>
        </div>
      </div>

      {/* Main Interactive Mic Recorder Station */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-stone-200 shadow-card flex flex-col items-center justify-center text-center space-y-4">
        {/* Real-Time Waveform / Audio Visualizer Box */}
        <div className="w-full max-w-lg space-y-1.5">
          <div className="flex items-center justify-between px-1 text-[11px] font-mono">
            <span className="text-stone-500 font-medium">16kHz Audio Stream</span>
            <div>
              {isRecording ? (
                <span className="flex items-center gap-1.5 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  RECORDING LIVE
                </span>
              ) : pipelineStep !== 'idle' ? (
                <span className="flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300 shadow-2xs text-[10px]">
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-emerald-600" />
                  {pipelineStep.toUpperCase()}
                </span>
              ) : (
                <span className="text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200 text-[10px]">
                  MIC STANDBY
                </span>
              )}
            </div>
          </div>

          <div className="w-full h-24 rounded-2xl overflow-hidden border border-stone-200 bg-stone-50 relative shadow-inner">
            <AudioVisualizer isRecording={isRecording} audioLevel={audioLevel} />
          </div>
        </div>

        {/* Big Mic Button */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={pipelineStep !== 'idle' && !isRecording}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none touch-manipulation ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-700 text-white ring-8 ring-rose-200 animate-pulse'
                : 'bg-federal-600 hover:bg-federal-700 text-white hover:ring-4 hover:ring-federal-100'
            }`}
          >
            {isRecording ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
          </button>

          <div className="text-xs font-semibold text-stone-700 space-y-1.5 flex flex-col items-center">
            {isRecording ? (
              <div className="flex items-center gap-1.5 justify-center text-rose-600 font-bold text-center px-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping shrink-0" />
                <span>Recording — tap again to stop &amp; send</span>
              </div>
            ) : (
              <span className="text-stone-800 text-center font-medium">
                Tap microphone to speak in {activeLang.name}
              </span>
            )}
          </div>
        </div>

        {/* Fallback Text Input (if mic is unavailable) */}
        <form onSubmit={handleManualSubmit} className="w-full max-w-lg pt-2 flex items-center gap-2">
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            disabled={pipelineStep !== 'idle'}
            placeholder={`Or type ${activeLang.name} sentence...`}
            className="flex-1 min-w-0 rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-federal-500 focus:border-transparent placeholder:text-stone-400 disabled:opacity-50 transition-all shadow-xs"
          />
          <button
            type="submit"
            disabled={!manualText.trim() || pipelineStep !== 'idle'}
            className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-federal-600 hover:bg-federal-700 active:bg-federal-800 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 touch-manipulation"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5 shrink-0" />
          </button>
        </form>

        {/* Error message banner */}
        {errorMsg && (
          <div className="w-full max-w-lg p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Active Conversation Feed */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-stone-200 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-stone-900">Voice Conversation Feed</h2>
            <span className="text-xs text-stone-500 font-mono">({turns.length} turns)</span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-stone-500 font-mono tracking-tight">
            Real-Time Audio Loop
          </span>
        </div>

        {/* Current Active Pipeline Turn In-Progress */}
        {currentTurn && (
          <div className="p-4 rounded-2xl bg-stone-50 border border-federal-200 space-y-3 animate-pulse">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="font-semibold text-federal-700">Processing Voice Turn...</span>
              <span className="text-[10px] font-mono">{pipelineStep.toUpperCase()}</span>
            </div>

            {currentTurn.userText && (
              <div className="flex items-start gap-2 text-xs">
                <span className="font-bold text-stone-800 shrink-0">You:</span>
                <span className="text-stone-700 italic">&ldquo;{currentTurn.userText}&rdquo;</span>
              </div>
            )}

            {currentTurn.agentText && (
              <div className="flex items-start gap-2 text-xs">
                <span className="font-bold text-emerald-800 shrink-0">Agent:</span>
                <span className="text-emerald-950 font-medium">{currentTurn.agentText}</span>
              </div>
            )}
          </div>
        )}

        {/* Completed Conversation Turns */}
        {turns.length === 0 && !currentTurn ? (
          <div className="py-12 text-center text-stone-400 text-xs space-y-1">
            <Bot className="w-8 h-8 mx-auto text-stone-300 mb-2" />
            <p className="font-medium">No conversation turns yet.</p>
            <p className="text-[11px] text-stone-400">Click the microphone above to speak with the agent.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {turns.map((t) => {
              const isTurnPlaying = currentPlayingId === t.id;
              return (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-gradient-to-br from-stone-50 to-white border border-stone-200 shadow-xs space-y-3 transition-all hover:border-federal-200"
                >
                  <div className="flex items-center justify-between text-xs text-stone-400 pb-2 border-b border-stone-100">
                    <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {t.lang} Voice Turn
                    </span>
                    <span className="font-mono text-[10px]">{t.timestamp}</span>
                  </div>

                  {/* User Speech Transcription */}
                  <div className="flex items-start gap-3 text-xs">
                    <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-0.5">
                        You Spoke:
                      </div>
                      <p className="text-stone-900 font-medium leading-relaxed">&ldquo;{t.userText}&rdquo;</p>
                      {t.durations.asr && (
                        <span className="text-[10px] font-mono text-stone-400">ASR: {t.durations.asr}s</span>
                      )}
                    </div>
                  </div>

                  {/* Agent Response & Audio Player */}
                  <div className="flex items-start gap-3 text-xs pt-1">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mb-0.5">
                          Agent Answer:
                        </div>
                        <p className="text-stone-900 text-sm leading-relaxed font-serif">{t.agentText}</p>
                      </div>

                      {/* Spoken Audio Controls */}
                      {t.audioUrl && (
                        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={() => playTurnAudio(t)}
                              className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shadow-xs transition-transform shrink-0 touch-manipulation"
                            >
                              {isTurnPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                            </button>
                            <span className="text-xs font-semibold text-emerald-950 truncate">
                              {isTurnPlaying ? 'Playing Spoken Reply...' : 'Listen to Spoken Reply'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                            <a
                              href={t.audioUrl}
                              download={`agent_reply_${t.id}.wav`}
                              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-2xs touch-manipulation"
                            >
                              <Download className="w-3.5 h-3.5 text-stone-500" />
                              <span>.WAV</span>
                            </a>
                            {onSendToLLM && (
                              <button
                                type="button"
                                onClick={() => onSendToLLM(`Analyze this indigenous dialogue turn:\nUser: "${t.userText}"\nAgent: "${t.agentText}"`)}
                                className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 text-xs font-medium transition-colors flex items-center justify-center gap-1 touch-manipulation"
                              >
                                <span>Discuss</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] font-mono text-stone-400 flex items-center gap-3 pt-0.5">
                        {t.durations.llm && <span>LLM: {t.durations.llm}s</span>}
                        {t.durations.tts && <span>XTTS: {t.durations.tts}s</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
