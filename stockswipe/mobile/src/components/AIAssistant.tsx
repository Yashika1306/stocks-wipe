import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../constants/api';
import { Colors } from '../constants/theme';

const SUGGESTED_QUESTIONS = [
  "Analyze my portfolio performance vs SPY benchmark",
  "What sectors am I overexposed to?",
  "Am I a momentum or value investor based on my swipes?",
  "What's my swipe hit rate and accuracy?",
  "Which of my positions has the best risk-adjusted return?",
  "How should I allocate my coins for max bounty returns?",
  "When will I hit Legend streak tier?",
  "Which sector missions give the best coin ROI?",
  "What's my biggest portfolio concentration risk?",
  "How does my performance compare to top leaderboard players?",
];

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            animation: `aiDotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';

  const lines = msg.text.split('\n').map((line, i) => {
    // Bold text between **
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i} style={{ display: 'block', marginBottom: line === '' ? 6 : 0 }}>
        {parts.map((part, j) =>
          j % 2 === 1
            ? <strong key={j} style={{ color: isUser ? '#fff' : '#c4b5fd' }}>{part}</strong>
            : <span key={j}>{part}</span>
        )}
      </span>
    );
  });

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      {!isUser && (
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          flexShrink: 0,
          marginRight: 8,
          marginTop: 2,
        }}>
          ✦
        </div>
      )}
      <div style={{
        maxWidth: '82%',
        padding: '10px 14px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
        background: isUser
          ? 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)'
          : Colors.surfaceAlt,
        color: isUser ? '#fff' : Colors.text,
        fontSize: 13.5,
        lineHeight: 1.55,
        boxShadow: isUser
          ? '0 2px 12px rgba(124,58,237,0.35)'
          : '0 1px 4px rgba(0,0,0,0.3)',
      }}>
        {lines}
      </div>
    </div>
  );
}

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        text: "Hi! I'm your StockSwipe AI analyst ✦\n\nI can analyze your portfolio, swipe patterns, sector exposure, coin strategy, and more. Pick a question below or ask me anything.",
      }]);
    }
  }, [open, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const question = text.trim();
    setInput('');
    setShowSuggestions(false);
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const { data } = await axios.post(
        `${API_BASE_URL}/ai/chat`,
        { question, context: {} },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: "Sorry, I couldn't reach the analysis engine. Make sure you're connected and try again.",
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes aiDotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes aiPanelSlide {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }
        @keyframes aiFabPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.5), 0 4px 20px rgba(59,130,246,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(139,92,246,0), 0 4px 20px rgba(59,130,246,0.4); }
        }
        .ai-fab:hover { transform: scale(1.1) !important; }
        .ai-chip:hover { background: rgba(139,92,246,0.2) !important; border-color: #7c3aed !important; }
        .ai-send:hover { opacity: 0.85; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2e2e3e; border-radius: 2px; }
      `}</style>

      {/* Floating Action Button */}
      <button
        className="ai-fab"
        onClick={() => setOpen(o => !o)}
        title="AI Assistant"
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          width: 58,
          height: 58,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          color: '#fff',
          zIndex: 9999,
          transition: 'transform 0.2s ease',
          animation: open ? 'none' : 'aiFabPulse 2.5s ease-in-out infinite',
          boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
        }}
      >
        {open ? '✕' : '✦'}
      </button>

      {/* Chat Panel */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 100,
          right: 28,
          width: 380,
          maxWidth: 'calc(100vw - 56px)',
          height: 560,
          maxHeight: 'calc(100vh - 120px)',
          background: Colors.surface,
          borderRadius: 20,
          border: `1px solid rgba(139,92,246,0.3)`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 9998,
          animation: 'aiPanelSlide 0.25s ease',
        }}>

          {/* Header */}
          <div style={{
            padding: '16px 18px 14px',
            borderBottom: `1px solid ${Colors.border}`,
            background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.08) 100%)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                color: '#fff',
              }}>✦</div>
              <div>
                <div style={{ color: Colors.text, fontWeight: 700, fontSize: 15 }}>StockSwipe AI</div>
                <div style={{ color: '#8b5cf6', fontSize: 11, fontWeight: 500 }}>Portfolio Analyst · Powered by ML</div>
              </div>
              <div style={{
                marginLeft: 'auto',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: Colors.green,
                boxShadow: `0 0 6px ${Colors.green}`,
              }} />
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 14px 8px',
          }}>
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>✦</div>
                <div style={{
                  padding: '10px 14px',
                  background: Colors.surfaceAlt,
                  borderRadius: '4px 18px 18px 18px',
                }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested Questions */}
          {showSuggestions && (
            <div style={{
              padding: '8px 14px',
              borderTop: `1px solid ${Colors.border}`,
              flexShrink: 0,
            }}>
              <div style={{ color: Colors.textMuted, fontSize: 10, fontWeight: 600, marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Suggested questions
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                gap: 6,
                paddingBottom: 4,
              }}>
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    className="ai-chip"
                    onClick={() => sendMessage(q)}
                    style={{
                      flexShrink: 0,
                      padding: '5px 11px',
                      borderRadius: 20,
                      border: `1px solid rgba(139,92,246,0.35)`,
                      background: 'rgba(139,92,246,0.08)',
                      color: '#c4b5fd',
                      fontSize: 11.5,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '10px 14px 14px',
            borderTop: showSuggestions ? 'none' : `1px solid ${Colors.border}`,
            flexShrink: 0,
            background: Colors.surface,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: Colors.surfaceAlt,
              border: `1px solid rgba(139,92,246,0.25)`,
              borderRadius: 14,
              padding: '8px 12px',
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                placeholder="Ask about your portfolio…"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: Colors.text,
                  fontSize: 13.5,
                }}
              />
              <button
                className="ai-send"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                  border: 'none',
                  borderRadius: 10,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  opacity: input.trim() && !loading ? 1 : 0.4,
                  transition: 'opacity 0.15s',
                  color: '#fff',
                  fontSize: 15,
                  flexShrink: 0,
                }}
              >
                ↑
              </button>
            </div>
            <div style={{ color: Colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 7 }}>
              Not financial advice · Simulated data only
            </div>
          </div>
        </div>
      )}
    </>
  );
}
