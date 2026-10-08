import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, Sliders, RefreshCw, Copy, Check, 
  Mic, MicOff, Paperclip, FileText, X, Volume2 
} from 'lucide-react';
import { LLM_LANGUAGES, DEFAULT_ENDPOINTS, ASR_MODELS } from '../constants';
import { extractTextFromFile } from '../documentParser';
import { encodeWAV, downsampleBuffer } from '../audioRecorder';

export const ChatStream = ({ initialPrompt = '' }) => {
  const [selectedLang, setSelectedLang] = useState('general');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: LLM_LANGUAGES[0].greeting,
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [showConfig, setShowConfig] = useState(false);
  const [ttft, setTtft] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Document Attachment State
  const [attachments, setAttachments] = useState([]);
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const fileInputRef = useRef(null);

  // Voice Note / ASR State
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [asrModelForChat, setAsrModelForChat] = useState('NCAIR1/Yoruba-ASR');
  const mediaRecorderRef = useRef(null);
  const audioCtxRef = useRef(null);
  const isRecordingRef = useRef(false);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const shouldScrollRef = useRef(false);

  // Map chat language to corresponding ASR model
  useEffect(() => {
    if (selectedLang === 'yoruba') setAsrModelForChat('NCAIR1/Yoruba-ASR');
    else if (selectedLang === 'hausa') setAsrModelForChat('NCAIR1/Hausa-ASR');
    else if (selectedLang === 'igbo') setAsrModelForChat('NCAIR1/Igbo-ASR');
    else setAsrModelForChat('NCAIR1/NigerianAccentedEnglish');
  }, [selectedLang]);

  const handleSelectLang = (langId) => {
    setSelectedLang(langId);
    const langObj = LLM_LANGUAGES.find(l => l.id === langId);
    if (!langObj) return;
    setMessages(prev => {
      if (prev.length <= 1) {
        return [{ role: 'assistant', content: langObj.greeting }];
      }
      return prev;
    });
  };

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (shouldScrollRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isStreaming, isTranscribing]);

  // ---------------------------------------------------------------------------
  // Document Attachment Handlers
  // ---------------------------------------------------------------------------
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsExtractingDoc(true);
    for (const file of files) {
      // If user uploaded an audio file directly, transcribe it via ASR!
      if (file.type.startsWith('audio/') || /\.(wav|mp3|m4a|ogg|flac|webm)$/i.test(file.name)) {
        await transcribeAudioFile(file);
        continue;
      }

      // Otherwise extract document text (.pdf, .docx, .txt, .md, .json, .csv)
      try {
        const parsed = await extractTextFromFile(file);
        setAttachments(prev => [...prev, parsed]);
      } catch (err) {
        console.error('File extraction failed:', err);
        alert(`Failed to extract text from ${file.name}: ${err.message}`);
      }
    }
    setIsExtractingDoc(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  // ---------------------------------------------------------------------------
  // Voice Recording & ASR Handlers
  // ---------------------------------------------------------------------------
  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setAudioLevel(0);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          }
        });

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

            const finalSamples = downsampleBuffer(audioBuffers, nativeSampleRate, 16000);
            const wavBlob = encodeWAV(finalSamples, 16000);
            await transcribeAudioFile(wavBlob, 'voice_note.wav');
          }
        };
      } catch (err) {
        console.error('Mic error:', err);
        alert(`Could not start microphone: ${err.message}`);
        setIsRecording(false);
      }
    }
  };

  const transcribeAudioFile = async (fileOrBlob, filename = 'recording.wav') => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', fileOrBlob, filename);
      formData.append('model', asrModelForChat);
      formData.append('response_format', 'verbose_json');

      const res = await fetch(`${DEFAULT_ENDPOINTS.asrUrl}/v1/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEFAULT_ENDPOINTS.apiKey}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`ASR Error (${res.status}): ${await res.text()}`);
      }

      const data = await res.json();
      const transcribedText = (data.text || '').trim();

      if (transcribedText) {
        setInput(prev => prev ? `${prev} ${transcribedText}` : transcribedText);
      }
    } catch (err) {
      console.error('Transcription failed:', err);
      alert(`Audio transcription failed: ${err.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Message Submission
  // ---------------------------------------------------------------------------
  const handleSend = async (overrideText = null) => {
    const textToSend = overrideText || input;
    const hasAttachments = attachments.length > 0;
    if ((!textToSend.trim() && !hasAttachments) || isStreaming) return;

    let userPrompt = textToSend.trim();
    let displayPrompt = userPrompt;
    const attachedDocs = [...attachments];

    // If documents are attached, format into structured context
    if (hasAttachments) {
      const docContextStrings = attachedDocs.map(doc => 
        `--- DOCUMENT: ${doc.filename} ---\n${doc.text}`
      ).join('\n\n');

      userPrompt = `${docContextStrings}\n\nUser Question/Instruction:\n${userPrompt || 'Please analyze and summarize the attached document(s).'}`;
      if (!displayPrompt) {
        displayPrompt = `Analyzed ${attachedDocs.length} attached document(s): ${attachedDocs.map(d => d.filename).join(', ')}`;
      }
    }

    setInput('');
    setAttachments([]);

    shouldScrollRef.current = true;
    const userMessageObj = { 
      role: 'user', 
      content: userPrompt,
      displayContent: displayPrompt,
      attachedFiles: hasAttachments ? attachedDocs.map(d => ({ name: d.filename, type: d.type })) : null
    };

    const conversationHistory = [...messages, userMessageObj];
    setMessages(conversationHistory);
    setIsStreaming(true);
    setTtft(null);

    const startTime = performance.now();
    let hasReceivedFirstToken = false;

    try {
      const systemMessage = {
        role: 'system',
        content: `You are N-ATLaS, Nigeria's sovereign AI assistant developed by FMCIDE, NCAIR, NITDA, and Awarri Technologies. Answer the user's questions directly, accurately, and naturally. Do not append unsolicited conversational questions (such as "Question: ...") at the end of your answers.`
      };

      const payload = {
        model: 'NCAIR1/N-ATLaS',
        messages: [
          systemMessage,
          ...conversationHistory.map(m => ({
            role: m.role,
            content: m.content || '',
          }))
        ],
        temperature: parseFloat(temperature),
        max_tokens: parseInt(maxTokens),
        stream: true,
      };

      setMessages([...conversationHistory, { role: 'assistant', content: '' }]);

      const streamResp = await fetch(`${DEFAULT_ENDPOINTS.llmUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEFAULT_ENDPOINTS.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!streamResp.ok) throw new Error(`HTTP Error: ${streamResp.status}`);
      const reader = streamResp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullAssistantMsg = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const clean = line.trim();
          if (!clean.startsWith('data:')) continue;
          const dataStr = clean.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              if (!hasReceivedFirstToken) {
                hasReceivedFirstToken = true;
                setTtft(Math.round(performance.now() - startTime));
              }
              fullAssistantMsg += delta;
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                updated[lastIdx] = {
                  ...updated[lastIdx],
                  role: 'assistant',
                  content: fullAssistantMsg,
                };
                return updated;
              });
            }
          } catch {
            // ignore partial json chunk parse errors
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error communicating with N-ATLaS endpoint: ${err.message}. Please verify the backend status and API key.`,
        }
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const copyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearChat = () => {
    const langObj = LLM_LANGUAGES.find(l => l.id === selectedLang);
    setMessages([
      {
        role: 'assistant',
        content: langObj ? langObj.greeting : LLM_LANGUAGES[0].greeting,
      }
    ]);
    setTtft(null);
    setAttachments([]);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Persona + Quick ASR selector + Parameters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-50/80 p-3 rounded-2xl border border-stone-200">
        {/* Language Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {LLM_LANGUAGES.map(lang => (
            <button
              key={lang.id}
              onClick={() => handleSelectLang(lang.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedLang === lang.id
                  ? 'bg-federal-700 text-white shadow-xs'
                  : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200/80'
              }`}
            >
              {lang.shortName}
            </button>
          ))}
        </div>

        {/* Right Controls: Audio Model Pill + Sliders */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Quick ASR selector */}
          <div className="flex items-center gap-1 text-[11px] font-mono bg-white px-2.5 py-1.5 rounded-xl border border-stone-200 text-stone-600">
            <Volume2 className="w-3.5 h-3.5 text-federal-600" />
            <span className="text-[10px] text-stone-400 hidden xs:inline">ASR:</span>
            <select
              value={asrModelForChat}
              onChange={e => setAsrModelForChat(e.target.value)}
              className="bg-transparent text-stone-700 text-[11px] font-medium focus:outline-none cursor-pointer"
            >
              {ASR_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.badge}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 rounded-xl border text-stone-600 hover:text-stone-900 transition-colors ${
              showConfig ? 'bg-cream-200 border-stone-300' : 'bg-white border-stone-200 hover:bg-stone-50'
            }`}
            title="Inference Parameters"
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            onClick={handleClearChat}
            className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors"
            title="Clear Chat History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Config Drawer */}
      {showConfig && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-cream-100 rounded-xl border border-stone-200 text-xs animate-fade-down">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Temperature</span>
              <span>{temperature}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.5"
              step="0.05"
              value={temperature}
              onChange={e => setTemperature(e.target.value)}
              className="w-full accent-federal-600"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Max Tokens</span>
              <span>{maxTokens}</span>
            </div>
            <input
              type="range"
              min="64"
              max="2048"
              step="64"
              value={maxTokens}
              onChange={e => setMaxTokens(e.target.value)}
              className="w-full accent-federal-600"
            />
          </div>
        </div>
      )}

      {/* Chat Messages Box */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-card h-[58vh] sm:h-[480px] flex flex-col overflow-hidden">
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';

            return (
              <div key={idx} className={`flex gap-2 sm:gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-federal-700 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                )}
                <div
                  className={`relative group max-w-[85%] sm:max-w-[80%] rounded-2xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-federal-700 text-white'
                      : 'bg-cream-100 text-slate-800 border border-federal-100/60'
                  }`}
                >
                  {/* Attached Document Tags on User Messages */}
                  {isUser && m.attachedFiles && m.attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-white/20">
                      {m.attachedFiles.map((f, fIdx) => (
                        <span key={fIdx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] font-mono">
                          <FileText className="w-3 h-3" />
                          <span>{f.name}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="whitespace-pre-wrap">{m.displayContent || m.content}</p>

                  {!isUser && m.content && (
                    <button
                      onClick={() => copyMessage(m.content, idx)}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-cream-200 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-federal-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
                {isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-ochre-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isTranscribing && (
            <div className="flex items-center gap-2 text-xs font-mono text-ochre-800 pl-9 sm:pl-11 bg-ochre-50 py-1.5 px-3 rounded-lg border border-ochre-300 w-fit">
              <RefreshCw className="w-3 h-3 animate-spin text-ochre-600" />
              Transcribing audio via {asrModelForChat.split('/')[1]}...
            </div>
          )}

          {isExtractingDoc && (
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-800 pl-9 sm:pl-11 bg-indigo-50 py-1.5 px-3 rounded-lg border border-indigo-200 w-fit">
              <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
              Extracting document text context...
            </div>
          )}

          {isStreaming && (
            <div className="flex items-center gap-2 text-xs font-mono text-federal-700 pl-9 sm:pl-11">
              <RefreshCw className="w-3 h-3 animate-spin" />
              N-ATLaS is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Attached Files Preview Strip */}
        {attachments.length > 0 && (
          <div className="px-3 pt-2 pb-1 bg-stone-100/90 border-t border-stone-200 flex flex-wrap gap-2 items-center">
            <span className="text-[11px] font-mono text-stone-500 font-semibold">Context Attachments:</span>
            {attachments.map((att, attIdx) => (
              <span
                key={attIdx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-800 text-xs font-mono shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-federal-600" />
                <span className="max-w-[140px] truncate">{att.filename}</span>
                <span className="text-[10px] text-stone-400">({(att.sizeBytes / 1024).toFixed(0)}KB)</span>
                <button
                  onClick={() => removeAttachment(attIdx)}
                  className="hover:text-red-500 transition-colors ml-0.5"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Live Audio Recording Status Banner */}
        {isRecording && (
          <div className="px-3 py-2 bg-red-50 border-t border-red-200 flex items-center justify-between text-xs text-red-900 animate-pulse">
            <div className="flex items-center gap-2 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <span>Recording Voice Note... ({asrModelForChat.split('/')[1]})</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-24 h-2 bg-red-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 transition-all duration-75"
                  style={{ width: `${Math.min(100, audioLevel * 100)}%` }}
                />
              </div>
              <button
                onClick={toggleRecording}
                className="px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[11px] hover:bg-red-700 transition-colors"
              >
                Stop & Transcribe
              </button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-2.5 sm:p-3 bg-stone-50 border-t border-stone-100 flex items-center gap-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept=".pdf,.docx,.txt,.md,.json,.csv,.wav,.mp3,.m4a,.ogg,.flac,.webm"
            className="hidden"
          />

          {/* Paperclip Document Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming || isExtractingDoc || isTranscribing}
            className="p-2 sm:p-2.5 rounded-xl bg-white border border-stone-200 hover:border-federal-400 text-stone-600 hover:text-federal-700 transition-all shrink-0 shadow-2xs hover:bg-stone-50"
            title="Attach documents (.pdf, .docx, .txt, .csv) or audio files to transcribe"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Microphone Recording Button */}
          <button
            type="button"
            onClick={toggleRecording}
            disabled={isStreaming || isTranscribing}
            className={`p-2 sm:p-2.5 rounded-xl border transition-all shrink-0 shadow-2xs flex items-center justify-center ${
              isRecording
                ? 'bg-red-600 border-red-600 text-white animate-pulse'
                : 'bg-white border-stone-200 hover:border-federal-400 text-stone-600 hover:text-federal-700 hover:bg-stone-50'
            }`}
            title={isRecording ? "Stop recording voice note" : `Record voice note (transcribed via ${asrModelForChat.split('/')[1]})`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Main Text Input */}
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isRecording
                ? "Listening to voice note..."
                : isTranscribing
                ? "Transcribing voice to text..."
                : attachments.length > 0
                ? "Ask a question about the attached document..."
                : "Ask anything (Multilingual LLM + Voice notes + Document context)..."
            }
            className="flex-1 min-w-0 bg-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-federal-500/40 focus:border-federal-500 transition-colors"
          />

          {/* Send Button */}
          <button
            onClick={() => handleSend()}
            disabled={(!input.trim() && attachments.length === 0) || isStreaming}
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-federal-600 hover:bg-federal-700 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shrink-0 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
