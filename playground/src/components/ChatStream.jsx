import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sliders, RefreshCw, Copy, Check, Wrench, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { LLM_LANGUAGES, DEFAULT_ENDPOINTS } from '../constants';
import { getOpenAITools, executeTool } from '../tools';

const QUICK_PROMPTS = [
  { label: '💵 Live FX Rates', text: 'How much is 100 USD in Naira today? Multiply the rate by 100 to give me the exact total.', tools: [['fx_rates', {base:'USD',target:'NGN'}]] },
  { label: '⛅ Live Weather', text: 'What is the current weather in Kano?', tools: [['weather_lookup', {location:'Kano'}]] },
  { label: '🗺️ LGA Validation', text: 'Tell me which state Alimosho LGA belongs to, its capital, and how many LGAs that state has.', tools: [['nigeria_gazetteer', {query:'Alimosho'}]] },
  { label: '🧮 VAT Calculator', text: 'Calculate 7.5% Nigerian VAT on an invoice of 450,000 NGN plus a 2,500 NGN flat processing fee. Give me the final number.', tools: [['math_eval', {expression:'(450000 * 0.075) + 2500'}]] },
  { label: '🌐 Live Web Search', text: 'Search the web and give me a brief overview of Artificial Intelligence.', tools: [['web_search', {query:'Artificial Intelligence'}]] },
];

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

  // Agent Tools Mode State
  const [toolsEnabled, setToolsEnabled] = useState(true);
  const [activeToolStatus, setActiveToolStatus] = useState(null);
  const [expandedToolCards, setExpandedToolCards] = useState({});

  const messagesEndRef = useRef(null);
  const shouldScrollRef = useRef(false);

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
    if (shouldScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming, activeToolStatus]);

  const toggleToolCard = (idx) => {
    setExpandedToolCards(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSend = async (overrideText = null, preloadedTools = null) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isStreaming) return;

    const userText = textToSend.trim();
    setInput('');

    shouldScrollRef.current = true;
    const conversationHistory = [...messages, { role: 'user', content: userText }];
    setMessages(conversationHistory);
    setIsStreaming(true);
    setTtft(null);
    setActiveToolStatus(null);

    const startTime = performance.now();
    let hasReceivedFirstToken = false;

    try {
      // 1. Prepare payload (with or without tools)
      const payload = {
        model: 'NCAIR1/N-ATLaS',
        messages: conversationHistory.map(m => ({
          role: m.role,
          content: m.content || '',
          ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
          ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
          ...(m.name ? { name: m.name } : {}),
        })),
        temperature: parseFloat(temperature),
        max_tokens: parseInt(maxTokens),
      };

      if (toolsEnabled) {
        payload.tools = getOpenAITools();
        payload.tool_choice = 'auto';
      }

      // --- PROACTIVE TOOL EXECUTION FOR DEMO PILLS ---
      // 8B models can be stubborn/lazy about emitting tool calls reliably.
      // For the playground demo pills, we proactively execute the tool client-side
      // so the model is guaranteed to have the context for a perfect answer.
      let forcedToolExecutions = [];
      if (toolsEnabled && preloadedTools && preloadedTools.length > 0) {
        for (const [fnName, fnArgs] of preloadedTools) {
          setActiveToolStatus(`Fetching ${fnName.replace('_', ' ')}...`);
          const result = await executeTool(fnName, fnArgs);
          forcedToolExecutions.push({ name: fnName, args: fnArgs, result });
          
          const fakeId = `call_${Date.now()}`;
          conversationHistory.push(
            { role: 'assistant', content: '', tool_calls: [{ id: fakeId, type: 'function', function: { name: fnName, arguments: JSON.stringify(fnArgs) } }] },
            { role: 'tool', tool_call_id: fakeId, name: fnName, content: JSON.stringify(result) }
          );
        }
      }

      if (forcedToolExecutions.length > 0) {
        setActiveToolStatus('Generating grounded response...');
        setMessages([...conversationHistory, { role: 'assistant', content: '', executedTools: forcedToolExecutions }]);

        const streamResp = await fetch(`${DEFAULT_ENDPOINTS.llmUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEFAULT_ENDPOINTS.apiKey}` },
          body: JSON.stringify({
            model: 'NCAIR1/N-ATLaS',
            messages: conversationHistory.map(m => ({
              role: m.role,
              content: m.content || '',
              ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
              ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
              ...(m.name ? { name: m.name } : {}),
            })),
            temperature: parseFloat(temperature),
            max_tokens: parseInt(maxTokens),
            stream: true,
          }),
        });

        if (!streamResp.ok) throw new Error(`HTTP Error: ${streamResp.status}`);
        const reader = streamResp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulatedText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const delta = JSON.parse(dataStr).choices?.[0]?.delta?.content || '';
              if (delta) {
                if (!hasReceivedFirstToken) { hasReceivedFirstToken = true; setTtft(Math.round(performance.now() - startTime)); }
                accumulatedText += delta;
                setMessages(prev => { const u = [...prev]; u[u.length-1] = { role: 'assistant', content: accumulatedText, executedTools: forcedToolExecutions }; return u; });
              }
            } catch (e) {}
          }
        }
        return;
      }

      // --- NORMAL FLOW (no pre-loaded tools) ---
      // First call (non-streaming): let the model decide which tools to invoke.
      const res = await fetch(`${DEFAULT_ENDPOINTS.llmUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEFAULT_ENDPOINTS.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      const choice = data.choices?.[0]?.message;

      // 2. Check if Model wants to execute Tools!
      if (choice && choice.tool_calls && choice.tool_calls.length > 0) {
        const toolCalls = choice.tool_calls;
        const toolExecutions = [];

        // Add assistant tool_calls message to thread
        conversationHistory.push({
          role: 'assistant',
          content: choice.content || '',
          tool_calls: toolCalls,
        });

        // Execute each tool locally in client
        for (const call of toolCalls) {
          const fnName = call.function.name;
          const fnArgs = call.function.arguments;
          setActiveToolStatus(`Executing tool: ${fnName}...`);

          const result = await executeTool(fnName, fnArgs);

          toolExecutions.push({
            name: fnName,
            args: typeof fnArgs === 'string' ? JSON.parse(fnArgs || '{}') : fnArgs,
            result,
          });

          // Append tool response
          conversationHistory.push({
            role: 'tool',
            tool_call_id: call.id,
            name: fnName,
            content: typeof result === 'object' ? JSON.stringify(result) : String(result),
          });
        }

        setActiveToolStatus('Generating grounded response...');

        // Now stream final assistant completion grounded on tool outputs
        setMessages([...conversationHistory, {
          role: 'assistant',
          content: '',
          executedTools: toolExecutions,
        }]);

        const secondResponse = await fetch(`${DEFAULT_ENDPOINTS.llmUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEFAULT_ENDPOINTS.apiKey}`,
          },
          body: JSON.stringify({
            model: 'NCAIR1/N-ATLaS',
            messages: conversationHistory.map(m => ({
              role: m.role,
              content: m.content || '',
              ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
              ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
              ...(m.name ? { name: m.name } : {}),
            })),
            temperature: parseFloat(temperature),
            max_tokens: parseInt(maxTokens),
            stream: true,
          }),
        });

        if (!secondResponse.ok) throw new Error(`HTTP Error: ${secondResponse.status}`);
        const reader = secondResponse.body.getReader();
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
                      executedTools: toolExecutions,
                    };
                    return updated;
                  });
                }
              } catch (e) {}
            }
          }
        }
      } else {
        // Normal response without tool calls
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: choice?.content || 'No response returned.' }
        ]);
        setTtft(Math.round(performance.now() - startTime));
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message || 'Failed to communicate with N-ATLaS model.'}` }
      ]);
    } finally {
      setIsStreaming(false);
      setActiveToolStatus(null);
    }
  };

  const copyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Language Selector & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs font-semibold text-stone-500 shrink-0 px-1">Language:</span>
          <div className="flex gap-1.5 shrink-0">
            {LLM_LANGUAGES.map(lang => (
              <button
                key={lang.id}
                onClick={() => handleSelectLang(lang.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                  selectedLang === lang.id
                    ? 'bg-federal-700 text-white shadow-sm'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/60'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0">
          {/* Agent Tools Mode Switch */}
          <button
            onClick={() => setToolsEnabled(!toolsEnabled)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              toolsEnabled
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                : 'bg-stone-50 border-stone-200 text-stone-500 hover:border-stone-300'
            }`}
            title="Toggle autonomous 100% free agent tools (DuckDuckGo, Weather, FX, 774 LGAs)"
          >
            <Wrench className={`w-3.5 h-3.5 ${toolsEnabled ? 'text-emerald-600' : 'text-stone-400'}`} />
            <span>Agent Tools:</span>
            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${toolsEnabled ? 'bg-emerald-200 text-emerald-900 font-bold' : 'bg-stone-200 text-stone-600'}`}>
              {toolsEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {ttft && (
            <span className="text-[11px] font-mono text-federal-600 bg-federal-50 px-2 py-1 rounded-lg border border-federal-100">
              {ttft}ms
            </span>
          )}

          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showConfig ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
            }`}
          >
            <Sliders className="w-3 h-3" />
            Config
          </button>
        </div>
      </div>

      {/* Quick Agent Tool Demo Prompt Pills */}
      {toolsEnabled && (
        <div className="bg-gradient-to-r from-emerald-50/70 via-stone-50 to-federal-50/50 p-2.5 rounded-xl border border-emerald-100 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-emerald-800 font-semibold flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Try Agent Tool:
          </span>
          {QUICK_PROMPTS.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSend(qp.text, qp.tools ?? null)}
              disabled={isStreaming}
              className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200/80 hover:border-emerald-400 text-stone-700 hover:text-emerald-900 shadow-2xs font-medium text-[11px] transition-all hover:scale-101 active:scale-99"
            >
              {qp.label}
            </button>
          ))}
        </div>
      )}

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
            // Hide intermediate tool calls and raw tool JSON responses from the UI
            if (m.role === 'tool' || m.tool_calls) return null;

            const isUser = m.role === 'user';
            const hasTools = m.executedTools && m.executedTools.length > 0;
            const isExpanded = expandedToolCards[idx];

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
                  {/* Tool Execution Accordion Badge */}
                  {hasTools && (
                    <div className="mb-3 rounded-xl border border-emerald-200 bg-white/95 overflow-hidden shadow-2xs">
                      <button
                        onClick={() => toggleToolCard(idx)}
                        className="w-full px-3 py-2 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-900 flex items-center justify-between text-xs font-semibold border-b border-emerald-100 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{m.executedTools.length} Tool{m.executedTools.length > 1 ? 's' : ''} Executed:</span>
                          <span className="font-mono text-[11px] text-emerald-700 font-normal">
                            {m.executedTools.map(t => t.name).join(', ')}
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="p-2.5 space-y-2 text-[11px] font-mono bg-stone-50 max-h-48 overflow-y-auto">
                          {m.executedTools.map((t, tIdx) => (
                            <div key={tIdx} className="bg-white p-2 rounded-lg border border-stone-200">
                              <div className="text-emerald-800 font-bold flex items-center gap-1 mb-1">
                                ⚙️ {t.name}
                              </div>
                              <div className="text-stone-500 text-[10px]">
                                <span className="font-semibold text-stone-700">Inputs:</span> {JSON.stringify(t.args)}
                              </div>
                              <div className="text-stone-800 text-[10px] mt-1 bg-stone-50 p-1.5 rounded border border-stone-100">
                                <span className="font-semibold text-stone-700">Output:</span> {JSON.stringify(t.result)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

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

          {activeToolStatus && (
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 pl-9 sm:pl-11 bg-emerald-50/80 py-1.5 px-3 rounded-lg border border-emerald-200/80 w-fit">
              <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
              {activeToolStatus}
            </div>
          )}

          {isStreaming && !activeToolStatus && (
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
              toolsEnabled
                ? "Ask anything (Agent tools enabled: FX, Weather, 774 LGAs, Search)..."
                : "Ask anything..."
            }
            className="flex-1 min-w-0 bg-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-federal-500/40 focus:border-federal-500 transition-colors"
          />
          <button
            onClick={() => handleSend()}
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
