import React, { useState, useRef, useEffect } from 'react';
import API from '../utils/api';

const QUICK_QUESTIONS = [
  'What is a herniated disc?',
  'How long does spine surgery recovery take?',
  'Which exercises are safe after surgery?',
  'How can I manage back pain at home?',
  'What posture should I maintain while sitting?',
  'When can I return to work after surgery?',
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-sm
        ${isUser ? 'bg-sky-500' : 'bg-slate-700 border border-slate-600'}`}>
        {isUser ? '👤' : '🤖'}
      </div>
      <div className={`max-w-2xl ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? 'bg-sky-500 text-white rounded-tr-sm'
            : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'}`}>
          {msg.content}
        </div>
        <span className="text-slate-600 text-xs px-1">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm SpineAI, your spine health assistant. I can help you understand your condition, explain surgical procedures, guide you through recovery, and answer questions about your exercises. What would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const { data } = await API.post('/chat/message', { message: msg, history });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, timestamp: new Date(data.timestamp) }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I\'m having trouble connecting right now. Please make sure the backend server is running.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-sky-500/20 border border-sky-500/30 rounded-xl flex items-center justify-center text-xl">🤖</div>
        <div>
          <h2 className="text-white font-display text-xl">SpineAI Assistant</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-xs">Online</span>
            <span className="text-slate-600 text-xs">·</span>
            <span className="text-slate-500 text-xs">Specialized in spine health & recovery</span>
          </div>
        </div>
      </div>

      {/* Quick questions */}
      {messages.length <= 1 && (
        <div className="mb-4">
          <p className="text-slate-500 text-sm mb-3">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map(q => (
              <button key={q} onClick={() => send(q)}
                className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-sky-500/50 text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-all">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin">
        {messages.map((m, i) => <Message key={i} msg={m} />)}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-sm">🤖</div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3 bg-slate-900 border border-slate-700 rounded-xl p-2 focus-within:border-sky-500/50 transition-colors">
        <textarea
          className="flex-1 bg-transparent text-white placeholder-slate-500 resize-none text-sm py-2 px-2 focus:outline-none max-h-32"
          placeholder="Ask about your spine condition, surgery, or recovery..."
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={1}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button onClick={() => send()}
          disabled={!input.trim() || loading}
          className="w-10 h-10 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-all self-end text-white">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      <p className="text-center text-slate-600 text-xs mt-3">
        SpineAI provides general education only. Always follow your surgeon's instructions.
      </p>
    </div>
  );
}
