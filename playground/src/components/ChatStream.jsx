import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sliders, RefreshCw, Copy, Check } from 'lucide-react';
import { LLM_LANGUAGES, DEFAULT_ENDPOINTS } from '../constants';

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

  const messagesEndRef = useRef(null);
  const shouldScrollRef = useRef(false);

  // When user switches language pill, only update greeting if chat hasn't started
  const handleSelectLang = (langId) => {
    setSelectedLang(langId);
    const langObj = LLM_LANGUAGES.find(l => l.id === langId);
    if (!langObj) return;
    // Only swap greeting — do NOT trigger scroll
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

  // Only scroll when a message send/stream is in progress
  useEffect(() => {
    if (shouldScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userText = input.trim();
    setInput('');

    shouldScrollRef.current = true;  // enable scrolling only for real sends
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setIsStreaming(true);
    setTtft(null);

    const startTime = performance.now();
    let hasReceivedFirstToken = false;

    // Append blank assistant response to accumulate streamed tokens
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch(`${DEFAULT_ENDPOINTS.llmUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEFAULT_ENDPOINTS.apiKey}`,
        },
        body: JSON.stringify({
          model: 'NCAIR1/N-ATLaS',
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          temperature: parseFloat(temperature),
          max_tokens: parseInt(maxTokens),
          stream: true,
        }),
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                if (!hasReceivedFirstToken) {
                  hasReceivedFirstToken = true;
                  setTtft(Math.round(performance.now() - startTime));
                }
                accumulatedText += delta;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: accumulatedText,
                  };
                  return updated;
                });
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error('Streaming error:', err);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Connection error with Modal LLM: ${err.message}`,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      shouldScrollRef.current = false;  // reset after stream ends
    }
  };

  const copyMessage = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Top Controls & Language Selector */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-stone-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest shrink-0">Language</span>
          <div className="flex items-center gap-1 shrink-0">
            {LLM_LANGUAGES.map(lang => (
              <button
                key={lang.id}
                onClick={() => handleSelectLang(lang.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedLang === lang.id
                    ? 'bg-federal-600 text-white'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0">
          {ttft && (
            <span className="text-[11px] font-mono text-federal-600 bg-federal-50 px-2 py-1 rounded-lg border border-federal-100">
              {ttft}ms first token
            </span>
          )}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showConfig ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
            }`}
          >
            <Sliders className="w-3 h-3" />
            Settings
          </button>
        </div>
      </div>

      {/* Expandable Parameters Drawer */}
      {showConfig && (
        <div className="bg-white p-5 rounded-2xl border border-federal-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
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
                  <p className="whitespace-pre-wrap">{m.content}</p>
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
          {isStreaming && (
            <div className="flex items-center gap-2 text-xs font-mono text-federal-700 pl-9 sm:pl-11">
              <RefreshCw className="w-3 h-3 animate-spin" />
              N-ATLaS is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-2.5 sm:p-3 bg-stone-50 border-t border-stone-100 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={
              selectedLang === 'general'
                ? "Ask anything..."
                : `Ask in ${LLM_LANGUAGES.find(l => l.id === selectedLang)?.name || 'any language'}...`
            }
            className="flex-1 min-w-0 bg-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-federal-500/40 focus:border-federal-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-federal-600 hover:bg-federal-700 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
