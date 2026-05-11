import React, { useState } from 'react';
import { Bot, X, Send, Mic, Sparkles } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function AIAssistantChat() {
  const { patients, appointments, doctors } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello! I am your AI Assistant. I can help you manage appointments, summarize patient data, or answer clinic questions.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if(!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    const newMessages = [...messages, { role: 'user', text: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('clinic_token') || ''}`
        },
        body: JSON.stringify({ messages: newMessages })
      });

      if (!response.ok) {
        throw new Error('API Error');
      }
      
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, the AI Assistant is currently offline or missing API key." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          width: '60px', height: '60px', borderRadius: '50%',
          background: 'var(--grad-primary)', color: '#fff',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px var(--clr-primary-glow)'
        }}
        className="animate-float"
      >
        <Bot size={28} />
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
      width: '350px', height: '500px', background: 'var(--clr-surface)',
      border: '1px solid var(--clr-border)', borderRadius: 'var(--r-xl)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      boxShadow: 'var(--shadow-lg), 0 0 30px var(--clr-primary-glow)'
    }} className="animate-slideUp">
      
      {/* Header */}
      <div style={{
        padding: 'var(--sp-md)', background: 'var(--grad-primary)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)' }}>
          <Bot size={20} />
          <span style={{ fontWeight: 600 }}>AI Assistant</span>
          <Sparkles size={14} style={{ color: '#fbbf24' }} />
        </div>
        <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--sp-md)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'ai' ? 'flex-start' : 'flex-end', maxWidth: '80%' }}>
            <div style={{
              background: m.role === 'ai' ? 'var(--clr-surface-2)' : 'var(--clr-primary)',
              color: m.role === 'ai' ? 'var(--clr-text-primary)' : '#fff',
              padding: '10px 14px', borderRadius: 'var(--r-lg)',
              borderBottomLeftRadius: m.role === 'ai' ? '4px' : 'var(--r-lg)',
              borderBottomRightRadius: m.role === 'user' ? '4px' : 'var(--r-lg)',
              fontSize: '0.85rem', boxShadow: m.role === 'user' ? '0 2px 10px var(--clr-primary-glow)' : 'none'
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
            <div style={{
              background: 'var(--clr-surface-2)', color: 'var(--clr-text-primary)',
              padding: '10px 14px', borderRadius: 'var(--r-lg)', borderBottomLeftRadius: '4px',
              fontSize: '0.85rem', fontStyle: 'italic', opacity: 0.7
            }}>
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{ padding: 'var(--sp-md)', borderTop: '1px solid var(--clr-border)', background: 'var(--clr-surface-2)' }}>
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: 'var(--sp-sm)', alignItems: 'center' }}>
          <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--clr-text-secondary)', cursor: 'pointer' }}>
            <Mic size={20} />
          </button>
          <input 
            type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask AI or dictate..." 
            style={{
              flex: 1, background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
              padding: '8px 12px', borderRadius: 'var(--r-full)', color: 'var(--clr-text-primary)'
            }}
          />
          <button type="submit" style={{ 
            background: 'var(--clr-primary)', border: 'none', width: '32px', height: '32px',
            borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            <Send size={14} />
          </button>
        </form>
      </div>

    </div>
  );
}
