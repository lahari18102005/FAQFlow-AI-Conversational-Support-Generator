import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessions, createSession, deleteSession, getHistory, sendMessage, getMe } from '../api';
import { Send, Plus, LogOut, MessageSquare, Mic, Sun, Moon, Trash2, Bot, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard = ({ toggleTheme, isDarkMode }) => {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
    fetchSessions();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      fetchHistory(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchUser = async () => {
    try {
      const resp = await getMe();
      setUser(resp.data);
    } catch (err) {
      navigate('/login');
    }
  };

  const fetchSessions = async () => {
    try {
      const resp = await getSessions();
      setSessions(resp.data);
      if (resp.data.length > 0 && !currentSessionId) {
        setCurrentSessionId(resp.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async (id) => {
    try {
      const resp = await getHistory(id);
      setMessages(resp.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSession = async () => {
    try {
      const resp = await createSession("New Chat");
      setSessions([resp.data, ...sessions]);
      setCurrentSessionId(resp.data.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSession = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat?')) {
      try {
        await deleteSession(id);
        const newSessions = sessions.filter(s => s.id !== id);
        setSessions(newSessions);
        if (currentSessionId === id) {
          setCurrentSessionId(newSessions.length > 0 ? newSessions[0].id : null);
          if (newSessions.length === 0) setMessages([]);
        }
      } catch (err) {
        console.error("Failed to delete session", err);
      }
    }
  };

  const handleSend = async (queryText = null) => {
    const query = typeof queryText === 'string' ? queryText : input;
    if (!query.trim()) return;

    let targetSessionId = currentSessionId;
    if (!targetSessionId) {
      try {
        const resp = await createSession("New Chat");
        setSessions(prev => [resp.data, ...prev]);
        setCurrentSessionId(resp.data.id);
        targetSessionId = resp.data.id;
      } catch (err) {
        console.error("Failed to create session automatically", err);
        return;
      }
    }

    const userMsg = { role: 'user', content: query, timestamp: new Date().toISOString() };
    setMessages([...messages, userMsg]);
    setInput('');
    setLoading(true);
    setSuggestedQuestions([]);

    try {
      const response = await fetch(`http://localhost:8000/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ session_id: targetSessionId, query })
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      setLoading(false);
      
      let aiResponseContent = "";
      setMessages(prev => [...prev, { role: 'assistant', content: "", timestamp: new Date().toISOString() }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        aiResponseContent += chunk;
        
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = aiResponseContent;
          return newMessages;
        });
      }

      // If it's the first message, refresh sessions to get the auto-generated title
      if (messages.length === 0) {
        fetchSessions();
      }

    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.start();
  };

  return (
    <div style={{ display: 'flex', height: '100vh', padding: '20px', gap: '20px', background: 'radial-gradient(circle at top left, rgba(59, 130, 246, 0.05) 0%, transparent 40%)' }}>
      {/* Sidebar */}
      <motion.div 
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="glass-card" 
        style={{ width: '320px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div style={{ padding: '25px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 800, background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '1.4rem' }}>FAQFlow AI</h3>
          <button onClick={handleCreateSession} style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'var(--text-main)', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
            <Plus size={20} />
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '15px 10px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingLeft: '10px' }}>Recent Chats</div>
          {sessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => setCurrentSessionId(s.id)}
              style={{ 
                padding: '12px 15px', 
                borderRadius: '12px', 
                cursor: 'pointer', 
                marginBottom: '8px',
                background: currentSessionId === s.id ? 'var(--primary)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => { if (currentSessionId !== s.id) e.currentTarget.style.background = 'var(--glass-bg)' }}
              onMouseOut={e => { if (currentSessionId !== s.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                <MessageSquare size={18} color={currentSessionId === s.id ? '#fff' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.9rem', color: currentSessionId === s.id ? '#fff' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>
              </div>
              <button 
                onClick={(e) => handleDeleteSession(s.id, e)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: currentSessionId === s.id ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                onMouseOut={e => e.currentTarget.style.color = currentSessionId === s.id ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)'}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '1rem' }}>
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user?.full_name || 'User'}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pro Member</span>
            </div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <LogOut size={18} />
          </button>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card" 
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <header style={{ padding: '20px 30px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--primary)' }}>
              <Bot size={24} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{sessions.find(s => s.id === currentSessionId)?.title || 'Select a session'}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FAQFlow Engine Online</span>
              </div>
            </div>
          </div>
          {currentSessionId && (
            <button 
              onClick={(e) => handleDeleteSession(currentSessionId, e)}
              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)' }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)' }}
            >
              <Trash2 size={16} />
              Clear Chat
            </button>
          )}
        </header>

        <div className="chat-messages" style={{ padding: '30px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {messages.length === 0 && !loading && (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', maxWidth: '400px' }}>
              <Bot size={48} style={{ marginBottom: '20px', opacity: 0.5 }} />
              <h3 style={{ marginBottom: '10px', color: 'var(--text-main)' }}>How can I help you today?</h3>
              <p style={{ fontSize: '0.9rem' }}>I'm trained on your FAQ dataset. Ask me anything about support, troubleshooting, or account management.</p>
            </div>
          )}
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                style={{ 
                  display: 'flex', 
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: '15px',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '10px', 
                  background: msg.role === 'user' ? 'rgba(59, 130, 246, 0.2)' : 'var(--glass-bg)', 
                  border: `1px solid ${msg.role === 'user' ? 'var(--primary)' : 'var(--border-color)'}`,
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  color: msg.role === 'user' ? 'var(--primary)' : 'var(--text-main)',
                  flexShrink: 0
                }}>
                  {msg.role === 'user' ? <UserIcon size={18} /> : <Bot size={18} />}
                </div>
                <div className={`message ${msg.role}`} style={{ whiteSpace: 'pre-wrap', maxWidth: '75%', padding: '16px 20px', borderRadius: '16px', fontSize: '0.95rem', lineHeight: '1.6', background: msg.role === 'user' ? 'var(--primary)' : 'var(--glass-bg)', color: msg.role === 'user' ? 'white' : 'var(--text-main)', border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)', borderTopRightRadius: msg.role === 'user' ? '4px' : '16px', borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '16px' }}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
            {loading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--glass-bg)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-main)' }}>
                  <Bot size={18} />
                </div>
                <div style={{ padding: '16px 24px', background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', borderTopLeftRadius: '4px' }}>
                  <div className="typing-dots">
                    <span>.</span><span>.</span><span>.</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        {suggestedQuestions.length > 0 && (
          <div style={{ padding: '0 30px 15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {suggestedQuestions.map((q, idx) => (
              <motion.button 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={idx} 
                onClick={() => handleSend(q)} 
                className="follow-up-btn"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', padding: '10px 16px', borderRadius: '20px', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                {q}
              </motion.button>
            ))}
          </div>
        )}

        <div style={{ padding: '20px 30px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', gap: '15px', background: 'var(--bg-dark)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <button 
              onClick={startVoiceInput}
              style={{ background: 'var(--glass-bg)', border: 'none', borderRadius: '12px', width: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)' }}
              onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--glass-bg)' }}
            >
              <Mic size={20} />
            </button>
            <input 
              type="text" 
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.95rem', padding: '0 10px', outline: 'none' }}
              placeholder="Ask a question about your FAQ..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={() => handleSend()} 
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))', border: 'none', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: 'white', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
