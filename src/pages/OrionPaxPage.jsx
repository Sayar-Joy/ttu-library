import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useNotifications } from '../hooks/useNotifications';
import supabase from '../lib/supabase';
import './OrionPaxPage.css';

const API_ENDPOINT = 'https://oxidation-wreckage-garnet.ngrok-free.dev/api/chat';

const STARTER_PROMPTS = [
  {
    title: 'Python Books',
    query: 'Do you have any Python books?',
    icon: '🐍',
    desc: 'Search Python guides, crash courses & tutorials'
  },
  {
    title: 'Machine Learning & AI',
    query: 'What machine learning and AI books are available in the library?',
    icon: '🤖',
    desc: 'Explore data science, AI & deep learning'
  },
  {
    title: 'Technology & Programming',
    query: 'Recommend the top technology and web development books.',
    icon: '💻',
    desc: 'Discover web development, systems & design'
  },
  {
    title: 'Classic Literature',
    query: 'Do you have classic literature or fiction novels to recommend?',
    icon: '📚',
    desc: 'Browse fiction, classics & story collections'
  },
  {
    title: 'Borrowing Rules',
    query: 'What are the TTU Library borrowing rules, loan durations, and renewal policies?',
    icon: '📋',
    desc: 'Learn about loan limits, due dates & policies'
  },
  {
    title: 'Book Availability',
    query: 'How can I check available copies and reserve a book in the library?',
    icon: '⚡',
    desc: 'Check live copy counts and checkout steps'
  }
];

function OrionPaxPage() {
  const { userId: urlUserId } = useParams();
  const navigate = useNavigate();
  
  const [activeNav] = useState('ai');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userId, setUserId] = useState(urlUserId || null);
  const [user, setUser] = useState(null);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [errorStatus, setErrorStatus] = useState(null);
  const [sidebarPanelOpen, setSidebarPanelOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize notifications
  const { unreadCount } = useNotifications(userId, {
    enabled: !!userId,
    onNotification: (notification) => {
      console.log('🔔 New notification:', notification);
    }
  });

  // Load user session
  useEffect(() => {
    async function initSession() {
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          setUserId(u.id);
          setUser(u);
          const initialSessionId = `ttu-user-${u.id}`;
          setSessionId(initialSessionId);
          loadChatHistory(initialSessionId);
          return;
        } catch (e) {
          console.error('Failed to parse user session', e);
        }
      }

      // Check Supabase session fallback
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const u = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url || null,
        };
        setUserId(u.id);
        setUser(u);
        const initialSessionId = `ttu-user-${u.id}`;
        setSessionId(initialSessionId);
        loadChatHistory(initialSessionId);
      } else {
        const guestSession = `guest-${Math.random().toString(36).substring(2, 9)}`;
        setSessionId(guestSession);
        loadChatHistory(guestSession);
      }
    }

    initSession();
  }, [urlUserId]);

  // Load chat history from localStorage
  const loadChatHistory = (sid) => {
    try {
      const saved = localStorage.getItem(`orionpax_chat_${sid}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to load local chat history:', err);
    }
    // Default empty if nothing stored
    setMessages([]);
  };

  // Save chat history to localStorage
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      try {
        localStorage.setItem(`orionpax_chat_${sessionId}`, JSON.stringify(messages));
      } catch (err) {
        console.error('Failed to save chat history:', err);
      }
    }
  }, [messages, sessionId]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputMessage]);

  // Handle Speech Recognition (Voice Input)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Voice input error:', err);
        setIsListening(false);
      }
    }
  };

  // Text to Speech
  const handleSpeak = (text, id) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isSpeaking === id) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);

    setIsSpeaking(id);
    window.speechSynthesis.speak(utterance);
  };

  // Copy message text
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Start New Chat / Reset Session
  const handleNewChat = () => {
    const freshSession = user ? `ttu-user-${user.id}-${Date.now().toString(36)}` : `guest-${Date.now().toString(36)}`;
    setSessionId(freshSession);
    setMessages([]);
    setErrorStatus(null);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(null);
  };

  // Send message to API
  const handleSendMessage = async (textToSend = null) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    setErrorStatus(null);
    const userMessageId = `user-${Date.now()}`;
    const newUserMessage = {
      id: userMessageId,
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputMessage('');
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      // POST fetch as required
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          session_id: sessionId || 'user-123',
          message: query
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to get response from AI Librarian`);
      }

      const data = await response.json();
      console.log('🤖 AI Librarian Response:', data);

      const aiText = data.response || (typeof data === 'string' ? data : 'No response text received.');
      
      const newAiMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiText,
        tool_used: data.tool_used || null,
        sources: Array.isArray(data.sources) ? data.sources : (data.sources ? [data.sources] : []),
        timestamp: data.timestamp || new Date().toISOString(),
        raw: data
      };

      setMessages((prev) => [...prev, newAiMessage]);
    } catch (err) {
      console.error('AI Librarian Error:', err);
      setErrorStatus(err.message || 'Failed to connect to AI Librarian');

      const errorMessage = {
        id: `ai-error-${Date.now()}`,
        sender: 'ai',
        isError: true,
        text: "I'm having trouble connecting to the library intelligence server right now. Please verify your connection or try again shortly.",
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for new line
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format markdown helper (bold, lists, quotes, code)
  const renderFormattedText = (text) => {
    if (!text) return null;

    // Split paragraphs
    const lines = text.split('\n');

    return lines.map((line, idx) => {
      // Check for bullet lists
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const isNumbered = /^\d+\.\s/.test(line.trim());

      // Format bold (**word**) and inline code (`code`) and book titles ("Title")
      let formattedLine = line;

      // Extract parts with basic regex tokenization
      const parts = [];
      let lastIdx = 0;
      const regex = /(\*\*[^*]+\*\*|`[^`]+`|"[^"]{3,60}")/g;
      let match;

      while ((match = regex.exec(formattedLine)) !== null) {
        if (match.index > lastIdx) {
          parts.push(formattedLine.substring(lastIdx, match.index));
        }

        const token = match[0];
        if (token.startsWith('**') && token.endsWith('**')) {
          parts.push(<strong key={match.index} className="ai-text-bold">{token.slice(2, -2)}</strong>);
        } else if (token.startsWith('`') && token.endsWith('`')) {
          parts.push(<code key={match.index} className="ai-text-code">{token.slice(1, -1)}</code>);
        } else if (token.startsWith('"') && token.endsWith('"')) {
          const bookTitle = token.slice(1, -1);
          parts.push(
            <span key={match.index} className="ai-book-mention" title="Search this book in TTU Library">
              "{bookTitle}"
            </span>
          );
        }
        lastIdx = regex.lastIndex;
      }

      if (lastIdx < formattedLine.length) {
        parts.push(formattedLine.substring(lastIdx));
      }

      if (isBullet) {
        return (
          <div key={idx} className="ai-list-item bullet">
            <span className="bullet-dot">•</span>
            <span>{parts.length > 0 ? parts : line.replace(/^[-*]\s/, '')}</span>
          </div>
        );
      }

      if (isNumbered) {
        return (
          <div key={idx} className="ai-list-item numbered">
            <span>{parts.length > 0 ? parts : line}</span>
          </div>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="ai-paragraph-space" />;
      }

      return (
        <p key={idx} className="ai-paragraph">
          {parts.length > 0 ? parts : line}
        </p>
      );
    });
  };

  return (
    <div className="orionpax-page">
      {/* Sidebar Component */}
      <Sidebar activeNav={activeNav} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Chat Layout */}
      <div className="orionpax-main-content">
        {/* Top Navigation Bar */}
        <header className="orionpax-header">
          <div className="header-left">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                {sidebarOpen ? (
                  <path d="M6 6L18 18M18 6L6 18" stroke="#1B1C1D" strokeWidth="2" strokeLinecap="round" />
                ) : (
                  <>
                    <path d="M4 6H20" stroke="#1B1C1D" strokeWidth="2" strokeLinecap="round" />
                    <path d="M4 12H20" stroke="#1B1C1D" strokeWidth="2" strokeLinecap="round" />
                    <path d="M4 18H20" stroke="#1B1C1D" strokeWidth="2" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>

            <div className="orionpax-header-brand">
              <div className="orionpax-avatar-header">
                <span className="orionpax-avatar-icon">🌌</span>
                <span className="pulse-dot" />
              </div>
              <div className="orionpax-title-wrapper">
                <h1 className="orionpax-title">
                  AI Librarian <span className="ai-badge">AI</span>
                </h1>
                <span className="orionpax-status">
                  <span className="status-indicator-dot" /> Autonomous Library Intelligence
                </span>
              </div>
            </div>
          </div>

          <div className="header-right">
            <button 
              className="new-chat-top-btn"
              onClick={handleNewChat}
              title="Start a new chat session"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>New Chat</span>
            </button>

            <button
              className="header-icon-btn info-panel-toggle"
              onClick={() => setSidebarPanelOpen(!sidebarPanelOpen)}
              title="Capabilities & Quick Prompts"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
              </svg>
            </button>

            <button
              className="header-icon-btn notif-btn"
              onClick={() => userId && navigate(`/notifications/${userId}`)}
              title="Notifications"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            <div
              className="header-avatar"
              onClick={() => userId && navigate(`/profile/${userId}`)}
              title="View Profile"
            >
              {user?.avatar_url && user.avatar_url.length > 2 ? (
                <img src={user.avatar_url} alt={user.name || 'User'} className="avatar-img" />
              ) : (
                <div className="avatar-circle">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'ME'}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className={`orionpax-chat-container ${sidebarPanelOpen ? 'panel-open' : ''}`}>
          {/* Main Chat Flow */}
          <div className="chat-flow-section">
            {messages.length === 0 ? (
              /* Hero / Empty State with Starter Prompts */
              <div className="orionpax-hero">
                <div className="hero-orb">
                  <div className="hero-orb-glow" />
                  <div className="hero-orb-core">
                    <span className="hero-orb-emoji">🤖</span>
                  </div>
                </div>

                <h2 className="hero-title">
                  Welcome to <span className="hero-highlight">AI Librarian</span>
                </h2>
                <p className="hero-subtitle">
                  Your dedicated intelligent assistant for TTU Library. Query our complete book catalog, inspect copy availability, request tailored reading lists, and get instant answers on library rules.
                </p>

                <div className="starter-prompts-grid">
                  {STARTER_PROMPTS.map((item, index) => (
                    <button
                      key={index}
                      className="starter-card"
                      onClick={() => handleSendMessage(item.query)}
                    >
                      <div className="starter-card-header">
                        <span className="starter-icon">{item.icon}</span>
                        <span className="starter-title">{item.title}</span>
                      </div>
                      <p className="starter-desc">"{item.query}"</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message List */
              <div className="messages-list">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-message-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`}
                  >
                    {msg.sender === 'ai' && (
                      <div className="message-avatar ai-avatar">
                        <span className="ai-icon-small">🌌</span>
                      </div>
                    )}

                    <div className={`message-bubble ${msg.sender === 'user' ? 'user-bubble' : 'ai-bubble'} ${msg.isError ? 'error-bubble' : ''}`}>
                      <div className="bubble-header">
                        <span className="sender-name">
                          {msg.sender === 'user' ? (user?.name || 'You') : 'AI Librarian'}
                        </span>
                        <span className="message-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="bubble-content">
                        {renderFormattedText(msg.text)}
                      </div>

                      {/* Tool & Source Badges for AI Responses */}
                      {msg.sender === 'ai' && (msg.tool_used || (msg.sources && msg.sources.length > 0)) && (
                        <div className="ai-meta-pills">
                          {msg.tool_used && (
                            <span className="meta-pill tool-pill" title="AI Tool Invocation">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                              </svg>
                              {msg.tool_used}
                            </span>
                          )}
                          {msg.sources && msg.sources.map((src, sIdx) => (
                            <span key={sIdx} className="meta-pill source-pill" title="Verified Data Source">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                              </svg>
                              {src}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* AI Action Buttons */}
                      {msg.sender === 'ai' && !msg.isError && (
                        <div className="bubble-actions">
                          <button
                            className="action-btn"
                            onClick={() => handleCopy(msg.text, msg.id)}
                            title="Copy text"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                                  <path d="M20 6L9 17l-5-5"/>
                                </svg>
                                <span className="action-label" style={{ color: '#10B981' }}>Copied!</span>
                              </>
                            ) : (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                                <span className="action-label">Copy</span>
                              </>
                            )}
                          </button>

                          <button
                            className={`action-btn ${isSpeaking === msg.id ? 'active-speaking' : ''}`}
                            onClick={() => handleSpeak(msg.text, msg.id)}
                            title={isSpeaking === msg.id ? 'Stop reading' : 'Read aloud'}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                            </svg>
                            <span className="action-label">
                              {isSpeaking === msg.id ? 'Stop' : 'Speak'}
                            </span>
                          </button>

                          <button
                            className="action-btn"
                            onClick={() => navigate('/bookshelf')}
                            title="Explore Bookshelf"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                              <line x1="8" y1="21" x2="16" y2="21"/>
                              <line x1="12" y1="17" x2="12" y2="21"/>
                            </svg>
                            <span className="action-label">View Bookshelf</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {msg.sender === 'user' && (
                      <div className="message-avatar user-avatar">
                        {user?.avatar_url && user.avatar_url.length > 2 ? (
                          <img src={user.avatar_url} alt="User" className="avatar-img-sm" />
                        ) : (
                          <div className="avatar-circle-sm">
                            {user?.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading / Thinking State */}
                {isLoading && (
                  <div className="chat-message-row ai-row">
                    <div className="message-avatar ai-avatar pulsing">
                      <span className="ai-icon-small">🌌</span>
                    </div>
                    <div className="message-bubble ai-bubble thinking-bubble">
                      <div className="thinking-content">
                        <div className="thinking-dots">
                          <span className="dot dot-1" />
                          <span className="dot dot-2" />
                          <span className="dot dot-3" />
                        </div>
                        <span className="thinking-text">AI Librarian is querying library database...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input Bar Section */}
            <div className="chat-input-area">
              {errorStatus && (
                <div className="error-banner">
                  <span className="error-banner-icon">⚠️</span>
                  <span>{errorStatus}</span>
                  <button className="error-retry-btn" onClick={() => handleSendMessage()}>
                    Retry
                  </button>
                </div>
              )}

              <div className="input-card">
                <button
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={toggleVoiceInput}
                  title={isListening ? 'Stop listening' : 'Voice input'}
                  type="button"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </button>

                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? 'Listening to your voice...' : 'Ask AI Librarian about books, authors, availability, recommendations...'}
                  className="chat-textarea"
                  rows={1}
                  disabled={isLoading}
                />

                <div className="input-actions-right">
                  <button
                    className={`send-button ${inputMessage.trim() && !isLoading ? 'ready' : ''}`}
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || isLoading}
                    type="button"
                    aria-label="Send message"
                  >
                    {isLoading ? (
                      <div className="send-spinner" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="input-footer-hint">
                <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line</span>
                <span className="dot-sep">•</span>
                <span>Powered by TTU Library AI Engine</span>
              </div>
            </div>
          </div>

          {/* Right Capabilities Side Panel (Desktop / Expandable) */}
          <aside className={`capabilities-panel ${sidebarPanelOpen ? 'open' : ''}`}>
            <div className="panel-header">
              <h3 className="panel-title">Library Intelligence</h3>
              <button 
                className="panel-close-btn"
                onClick={() => setSidebarPanelOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="panel-section">
              <h4 className="section-label">Active Session</h4>
              <div className="session-info-badge">
                <span className="session-id-text">{sessionId}</span>
                <button className="reset-session-btn" onClick={handleNewChat} title="Reset session">
                  Reset
                </button>
              </div>
            </div>

            <div className="panel-section">
              <h4 className="section-label">Core Capabilities</h4>
              <div className="capability-card">
                <div className="cap-icon">🔎</div>
                <div className="cap-content">
                  <strong>Catalog Search</strong>
                  <p>Real-time lookup across TTU Library collection</p>
                </div>
              </div>
              <div className="capability-card">
                <div className="cap-icon">📊</div>
                <div className="cap-content">
                  <strong>Live Copy Inventory</strong>
                  <p>Check available physical copies instantly</p>
                </div>
              </div>
              <div className="capability-card">
                <div className="cap-content">
                  <div className="cap-icon">🎯</div>
                  <div>
                    <strong>Curated Recommendations</strong>
                    <p>Suggested books based on genres and topics</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-section">
              <h4 className="section-label">Popular Catalog Topics</h4>
              <div className="topic-tags">
                {['Python', 'JavaScript', 'Algorithms', 'Machine Learning', 'Data Science', 'Fiction', 'Dystopian', 'Science', 'Design'].map((t) => (
                  <button
                    key={t}
                    className="topic-tag-btn"
                    onClick={() => handleSendMessage(`Do you have books on ${t}?`)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel-section">
              <div className="library-quick-link-card" onClick={() => navigate('/bookshelf')}>
                <div className="quick-link-text">
                  <strong>Browse Bookshelf</strong>
                  <p>View all library books directly</p>
                </div>
                <span className="arrow-icon">→</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default OrionPaxPage;
