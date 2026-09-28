import React, { useState, useRef } from 'react';
import { Mic, MicOff, Upload, ArrowRight, Play, CheckCircle2, RefreshCw } from 'lucide-react';
import { ASR_MODELS, DEFAULT_ENDPOINTS } from '../constants';
import { AudioVisualizer } from './AudioVisualizer';
import { AudioStreamer } from '../utils/audioStreamer';

export const ASRStudio = ({ onSendToLLM }) => {
  const [selectedModel, setSelectedModel] = useState(ASR_MODELS[0].id);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [streamStatus, setStreamStatus] = useState('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [words, setWords] = useState([]);
  const [latency, setLatency] = useState(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const streamerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const currentModelObj = ASR_MODELS.find(m => m.id === selectedModel) || ASR_MODELS[0];

  // 1. Live Streaming Mode (Deepgram-style WebSocket)
  const toggleLiveStreaming = async () => {
    if (isRecording) {
      streamerRef.current?.stop();
      setIsRecording(false);
      setStreamStatus('idle');
    } else {
      setLiveTranscript('');
      setWords([]);
      const wsUrl = DEFAULT_ENDPOINTS.asrUrl.replace(/^http/, 'ws') + '/v1/audio/transcriptions/streaming';
      
      const streamer = new AudioStreamer({
        wsUrl,
        onTranscript: (res) => {
          setLiveTranscript(prev => (prev ? prev + ' ' : '') + res.transcript);
          if (res.words?.length) {
            setWords(prev => [...prev, ...res.words]);
          }
        },
        onError: (err) => {
          console.error("Streamer error:", err);
          setStreamStatus('error');
        },
        onStatusChange: (status) => setStreamStatus(status),
        onAudioLevel: (level) => setAudioLevel(level),
      });

      streamerRef.current = streamer;
      await streamer.start(currentModelObj.lang);
      setIsRecording(true);
    }
  };

  // 2. Batch Mode Audio Capture / Upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    await transcribeBatchAudio(file);
  };

  const transcribeBatchAudio = async (blobOrFile) => {
    setIsBatchProcessing(true);
    const startTime = performance.now();
    try {
      const formData = new FormData();
      formData.append('file', blobOrFile, 'audio.wav');
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
      setLiveTranscript(data.text);
      setWords(data.words || []);
      setLatency(Math.round(performance.now() - startTime));
    } catch (e) {
      console.error('Batch transcription failed:', e);
      setLiveTranscript(`Error transcribing audio: ${e.message}`);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const loadSampleText = () => {
    setLiveTranscript(currentModelObj.sampleText);
    setWords(currentModelObj.sampleText.split(' ').map((w, i) => ({ word: w, start: i * 0.4, end: (i + 1) * 0.4 })));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5">
      {/* Top Banner / Mode Switcher */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 mb-1">Sovereign Speech-to-Text</p>
          <h2 className="text-lg sm:text-xl font-bold text-stone-900">
            Speech Recognition Studio
          </h2>
        </div>

        {/* Streaming Mode Toggle */}
        <div className="flex items-center bg-stone-100 rounded-xl p-1 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => { setIsLiveMode(false); if (isRecording) toggleLiveStreaming(); }}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${
              !isLiveMode ? 'bg-white text-stone-900 shadow-card' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Batch
          </button>
          <button
            onClick={() => { setIsLiveMode(true); }}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              isLiveMode ? 'bg-federal-600 text-white shadow-sm' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </button>
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
              <h3 className={`font-bold text-xs sm:text-sm truncate ${isSelected ? 'text-white' : 'text-stone-900'}`}>{m.name}</h3>
              <p className={`text-[11px] sm:text-xs mt-1 line-clamp-2 ${isSelected ? 'text-federal-100' : 'text-stone-400'}`}>{m.description}</p>
            </div>
          );
        })}
      </div>

      {/* Main Studio Console */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Real-time Oscilloscope & Spectrogram Visualizer */}
        <AudioVisualizer
          isRecording={isRecording || isBatchProcessing}
          audioLevel={audioLevel}
          isLiveStream={isLiveMode}
        />

        {/* Action Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {isLiveMode ? (
              <button
                onClick={toggleLiveStreaming}
                className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all w-full sm:w-auto ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-glow-green animate-pulse'
                    : 'bg-federal-700 hover:bg-federal-800 text-white shadow-sm'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isRecording ? 'Stop Live Stream' : `Speak in ${currentModelObj.badge}`}
              </button>
            ) : (
              <>
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
                  onClick={loadSampleText}
                  className="px-3 sm:px-3.5 py-2.5 rounded-xl font-medium text-xs bg-cream-100 hover:bg-cream-200 text-slate-700 border border-cream-300 transition-all shrink-0"
                >
                  Load Sample
                </button>
              </>
            )}

            {isBatchProcessing && (
              <span className="flex items-center gap-1.5 text-xs font-mono text-federal-700 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Transcribing...
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
              Live Transcription Output
            </h4>
            {liveTranscript && (
              <button
                onClick={() => onSendToLLM?.(liveTranscript)}
                className="text-xs font-semibold text-federal-700 hover:text-federal-800 flex items-center gap-1 transition-all self-start xs:self-auto"
              >
                Send to N-ATLaS LLM <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="min-h-24 sm:min-h-28 p-3.5 sm:p-4 bg-cream-50 rounded-xl border border-federal-100 font-sans text-xs sm:text-sm text-slate-800 leading-relaxed">
            {liveTranscript ? (
              <p>{liveTranscript}</p>
            ) : (
              <p className="text-slate-400 italic">
                {isLiveMode
                  ? "Click 'Speak' and begin talking. Words will stream in real-time as you speak..."
                  : "Upload an audio file or load a sample to inspect transcription and word timestamps."}
              </p>
            )}
          </div>

          {/* Word-Level Timestamp Alignment (if available) */}
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
        </div>
      </div>
    </div>
  );
};
