import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, Bot, User, Sliders, RefreshCw, Copy, Check, 
  Mic, MicOff, Paperclip, FileText, X, Volume2, Sparkles, Eye,
  ChevronDown, ChevronUp
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
  const [previewDocModal, setPreviewDocModal] = useState(null);
  const [isDiscoverCollapsed, setIsDiscoverCollapsed] = useState(true);

  // Ready-to-review sample indigenous & reverse-localization documents
  const SAMPLE_DOCS = {
    yorubaChieftaincy: {
      filename: 'Igbimo_Awon_Oloye_Resolution.pdf',
      type: 'pdf',
      sizeBytes: 2469,
      url: '/docs/Igbimo_Awon_Oloye_Resolution.pdf',
      text: `ÌGBÌMỌ̀ ÀWỌN OLÓYÈ ÀTI ÌJÒYÈ ILẸ̀ Ẹ̀GBÁ
ÌPINLẸ̀ ÒGÙN, NÀÌJÍRÍÀ
Ọjọ́ Kẹrìnlá Oṣù Kẹfà, 2024

ÀKỌ́LÉ: ÌFIKÙNLUKÙN LÓRÍ ÈTÒ ÀÀBÒ ÀTI ÀTÚNTO ỌJÀ ỌBA L’ÁBẸ́ÒKÚTA

Àkíyèsí pàtàkì sí gbogbo àwọn Ọlọ́jà, Alága ẹgbẹ́ àwọn oníṣòwò, àti àwọn Ọmọ Ìlú:

1. Ìgbìmọ̀ ti fohùn ṣọ̀kan lẹ́yìn àpérò pẹ̀lú Aláké ti Ilẹ̀ Ẹ̀gbá pé kí gbogbo àwọn tó ń tajà lẹ́bàá títì wọ inú ọjà lọ láti dènà ìjànbá mọ́tò àti ìdínà ọ̀nà.
2. Ẹnikẹ́ni tí a bá mú tí ó ń ta ọjà lẹ́yìn aago mẹ́sàn-án alẹ́ láì gba àṣẹ lọ́wọ́ Olórí Ọlọ́jà yóò san owó ìtanràn ẹgbàárún náírà (₦10,000).
3. Òwe àwọn àgbà sọ pé: "Àgbájọ ọwọ́ la fi ń sọ̀yà; àjèjì ọwọ́ kan kò gbẹ́rù d'orí." A bẹ gbogbo ará ìlú láti fọwọ́sowọ́pọ̀ fún àlàáfíà àti ìtẹ̀síwájú agbègbè wa.

Fọwọ́sí:
Olóyè Bámigbóyè Òkè (Balógun Ilẹ̀ Ẹ̀gbá)
Àkọ̀wé Ìgbìmọ̀ Àwọn Olóyè`
    },
    englishHealthAdvisory: {
      filename: 'Federal_Ministry_Health_Cholera_Advisory.pdf',
      type: 'pdf',
      sizeBytes: 3000,
      url: '/docs/Federal_Ministry_Health_Cholera_Advisory.pdf',
      text: `FEDERAL MINISTRY OF HEALTH & SOCIAL WELFARE
PUBLIC HEALTH EMERGENCY ADVISORY: CHOLERA & WATERBORNE EPIDEMIC PROTOCOL

Target: Primary Healthcare Centres, Traditional Rulers, Community Development Associations.

EPIDEMIOLOGICAL SUMMARY:
Recent surveillance reports indicate clusters of acute watery diarrhea and suspected cholera outbreaks across high-density municipal markets and agrarian communities due to severe contamination of shallow well water during early flash flooding.

DIRECTIVES FOR COMMUNITY HEALTH OFFICERS:
1. Decontamination & Boiling: All households must boil borehole and open-well water vigorously for at least 3 minutes before consumption, or use certified chlorine water guard tablets (1 capful per 25-litre jerrycan).
2. Food Hygiene: Ban open roadside hawking of unwashed sliced fruits (watermelons, pineapples) and raw vegetables without potable running water wash stations.
3. Oral Rehydration Therapy (ORT): Immediately administer homemade ORS (1 level teaspoon of salt + 6 level teaspoons of sugar in 1 litre of boiled clean water) at the first onset of watery stool while evacuating the patient to the nearest primary health center. Do not wait for dehydration collapse.`
    }
  };

  // Suggested Prompts: Balanced indigenous languages & Sovereign Document Intelligence
  const SUGGESTED_PROMPTS = [
    {
      category: 'Document Intelligence',
      icon: '📜',
      title: 'Digest Chieftaincy Resolution',
      desc: 'Yorùbá Document • Attached for Preview',
      prompt: 'Translate and analyze this attached Yorùbá Chieftaincy resolution sentence-by-sentence into English. Highlight and explain the traditional proverbs and directives.',
      attachedDoc: SAMPLE_DOCS.yorubaChieftaincy,
      scenario: 'doc_yoruba'
    },
    {
      category: 'Document Intelligence',
      icon: '🏥',
      title: 'Reverse Localize Health PDF',
      desc: 'English Advisory • Attached for Preview',
      prompt: 'Convert the attached Federal Health Ministry cholera advisory into simple, grassroot-friendly Nigerian Pidgin and Yorùbá so market women and community elders can easily follow the safety rules.',
      attachedDoc: SAMPLE_DOCS.englishHealthAdvisory,
      scenario: 'doc_english'
    },
    {
      category: 'Lagos Life',
      icon: '🛍️',
      title: 'Balogun Market Haggling',
      desc: 'Interactive Street Roleplay',
      prompt: 'Act as an assertive Lagos textile trader in Balogun. I want 5 yards of Swiss voile lace for ₦25,000, but your first price was ₦60,000. Start by asking what design I want and challenge my budget in authentic Lagos street style!',
      scenario: 'market'
    },
    {
      category: 'Education (Yorùbá)',
      icon: '👶',
      title: 'Teach a Child Yorùbá',
      desc: 'Pedagogy with Tone Marks',
      prompt: 'Teach a 7-year-old child 5 everyday animals in Yorùbá with clear phonetic pronunciations, tone marks (Àmì Ohùn), and a simple catchy rhyme to remember them.',
      scenario: 'tutor'
    },
    {
      category: 'Education (Hausa)',
      icon: '👶',
      title: 'Teach a Child Hausa',
      desc: 'Greetings & Etiquette',
      prompt: 'Teach a beginner how to greet elders and friends in Hausa across morning, afternoon, and evening, with phonetic pronunciation and cultural respect etiquette.',
      scenario: 'tutor'
    },
    {
      category: 'Education (Igbo)',
      icon: '👶',
      title: 'Teach a Child Igbo',
      desc: 'Family Titles & Kinship',
      prompt: 'Teach a beginner 5 essential family relations in Igbo (such as Nne, Nna, Nwanne) with phonetic pronunciation and their cultural importance.',
      scenario: 'tutor'
    }
  ];

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
  const handleSend = async (overrideText = null, overrideDocs = null) => {
    const textToSend = overrideText !== null ? overrideText : input;
    const attachedDocs = overrideDocs !== null ? overrideDocs : [...attachments];
    const hasAttachments = attachedDocs.length > 0;
    if ((!textToSend.trim() && !hasAttachments) || isStreaming) return;

    let userPrompt = textToSend.trim();
    let displayPrompt = userPrompt;

    // If documents are attached, format into structured context
    if (hasAttachments) {
      const docContextStrings = attachedDocs.map(doc => 
        `--- ATTACHED SOVEREIGN DOCUMENT: ${doc.filename} ---\n${doc.text}`
      ).join('\n\n');

      userPrompt = `${docContextStrings}\n\nUSER QUESTION / TASK:\n${userPrompt || 'Please translate, analyze, and explain the attached document.'}`;
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
          {/* Suggested Prompts & "Lagos Life" Scenarios (Early ChatGPT Discovery Pattern) */}
          {messages.length <= 1 && (
            <div className={`mb-3 transition-all rounded-xl border border-stone-200/80 bg-cream-50 ${isDiscoverCollapsed ? 'p-2 sm:px-3' : 'p-3 sm:p-3.5 space-y-2.5'}`}>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsDiscoverCollapsed(p => !p)}
                  className="flex items-center gap-1.5 text-left group cursor-pointer focus:outline-none"
                  title={isDiscoverCollapsed ? "Click to view prompt examples" : "Click to hide prompt examples"}
                >
                  <Sparkles className="w-3.5 h-3.5 text-ochre-600 shrink-0" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 group-hover:text-federal-700 transition-colors">
                    Explore Example Prompts
                  </span>
                  <span className="text-[10px] text-stone-400 font-normal ml-0.5">
                    ({SUGGESTED_PROMPTS.length})
                  </span>
                  {isDiscoverCollapsed ? (
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-transform" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-transform" />
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDiscoverCollapsed(p => !p)}
                    className="text-[11px] font-medium text-federal-700 hover:text-federal-900 bg-white hover:bg-stone-100 border border-stone-200/90 px-2 py-0.5 rounded-md transition-all shadow-2xs"
                  >
                    {isDiscoverCollapsed ? 'Show Prompts ▾' : 'Hide Prompts ▴'}
                  </button>
                </div>
              </div>

              {!isDiscoverCollapsed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 animate-fade-down">
                  {SUGGESTED_PROMPTS.map((item, pIdx) => {
                    const hasDoc = Boolean(item.attachedDoc);
                    return (
                      <div
                        key={pIdx}
                        className="p-3 rounded-xl bg-white border border-stone-200 hover:border-federal-400 hover:shadow-xs transition-all group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-base shrink-0">{item.icon}</span>
                              <span className="text-xs font-bold text-slate-900 group-hover:text-federal-700 transition-colors truncate">
                                {item.title}
                              </span>
                            </div>
                            {hasDoc && (
                              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                Doc Attached
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2.5">
                            {item.prompt}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-stone-100">
                          {hasDoc ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewDocModal(item.attachedDoc);
                              }}
                              className="text-[11px] font-medium text-slate-600 hover:text-federal-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-stone-100 transition-colors"
                              title="Preview original document text"
                            >
                              <Eye className="w-3.5 h-3.5 text-federal-600" />
                              <span>Preview File</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-stone-400 font-mono truncate">
                              {item.desc || item.category}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const docsToAttach = item.attachedDoc ? [item.attachedDoc] : null;
                              if (docsToAttach) {
                                setAttachments(docsToAttach);
                              }
                              setInput('');
                              handleSend(item.prompt, docsToAttach);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-federal-50 hover:bg-federal-600 text-federal-700 hover:text-white font-semibold text-xs transition-all shrink-0"
                          >
                            Run Prompt ↗
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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

                  {isUser ? (
                    <p className="whitespace-pre-wrap">{m.displayContent || m.content}</p>
                  ) : (
                    <div className="markdown-chat-content text-slate-800 text-xs sm:text-sm leading-relaxed space-y-2">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => <h1 className="text-base font-bold text-slate-900 mt-2 mb-1">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-bold text-slate-900 mt-2 mb-1">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-xs font-bold text-slate-900 mt-1.5 mb-0.5">{children}</h3>,
                          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                          strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
                          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-1.5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-1.5">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          hr: () => <hr className="my-3 border-stone-200" />,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-federal-500 pl-3 my-2 italic text-slate-700 bg-federal-50/50 py-1 rounded-r">
                              {children}
                            </blockquote>
                          ),
                          code: ({ inline, children }) => inline ? (
                            <code className="px-1.5 py-0.5 rounded bg-cream-200 text-federal-800 font-mono text-[11px]">{children}</code>
                          ) : (
                            <pre className="p-2.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto my-2">{children}</pre>
                          )
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {!isUser && m.content && (
                    <button
                      onClick={() => copyMessage(m.content, idx)}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-cream-200 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy message"
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
          <div className="px-3 py-2 bg-red-50 border-t border-red-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs text-red-900">
            <div className="flex items-center gap-2 font-mono min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
              <span className="truncate font-semibold text-[11px] sm:text-xs">
                Recording Voice Note...
              </span>
              <span className="hidden xs:inline-block text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded border border-red-200 truncate max-w-[120px] sm:max-w-none">
                {ASR_MODELS.find(m => m.id === asrModelForChat)?.badge || asrModelForChat.split('/')[1]}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto sm:ml-0">
              <div className="w-14 sm:w-24 h-2 bg-red-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 transition-all duration-75"
                  style={{ width: `${Math.min(100, audioLevel * 100)}%` }}
                />
              </div>
              <button
                onClick={toggleRecording}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-[11px] whitespace-nowrap transition-colors shadow-2xs"
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

      {/* Document Review & Preview Modal */}
      {previewDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-federal-50 text-federal-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {previewDocModal.filename}
                  </h3>
                  <span className="text-[11px] font-mono text-stone-400">
                    Sovereign Document Intelligence • {previewDocModal.type.toUpperCase()} ({(previewDocModal.sizeBytes / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewDocModal(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewDocModal.url ? (
              <div className="flex-1 flex flex-col min-h-[380px] sm:min-h-[460px]">
                <iframe
                  src={previewDocModal.url}
                  title={previewDocModal.filename}
                  className="w-full flex-1 border-0 bg-stone-100"
                />
              </div>
            ) : (
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 font-mono text-xs leading-relaxed text-slate-800 bg-cream-50/60 whitespace-pre-wrap select-text">
                {previewDocModal.text}
              </div>
            )}

            <div className="p-3 sm:p-4 border-t border-stone-100 bg-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {previewDocModal.url && (
                  <a
                    href={previewDocModal.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-federal-700 hover:text-federal-900 underline flex items-center gap-1"
                  >
                    Open PDF in tab ↗
                  </a>
                )}
                <span className="text-[11px] text-stone-400 font-sans hidden sm:inline">
                  • Ingested into Sovereign LLM
                </span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setPreviewDocModal(null)}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const docToAttach = previewDocModal;
                    setPreviewDocModal(null);
                    setAttachments([docToAttach]);
                    const matchedPrompt = SUGGESTED_PROMPTS.find(p => p.attachedDoc?.filename === docToAttach.filename);
                    const promptText = matchedPrompt?.prompt || 'Please translate, analyze, and explain the attached document.';
                    setInput('');
                    handleSend(promptText, [docToAttach]);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-federal-700 hover:bg-federal-800 text-white text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <span>Attach & Analyze</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
