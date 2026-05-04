import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! I'm Belle. Any updates on our 2026 Project today?" }
  ]);
  const [input, setInput] = useState('');
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Danh sách các cuộc trò chuyện 
  const recentChats = [
    "DeepLearning",
    "Digital Image Gray Level Transform",
    "Windows Network Admin Review",
    "X-ray Contraband Detection",
    "Website Refurbishment Support",
    "Optimize web UI like Figma",
    "Build Frontend Chatbot AI",
    "Upgrade Fahasa Project DB",
    "Design effective trading DB",
    "Unique Web Dev Project",
    "Bookstore database design"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newMessages = [...messages, { role: 'user', type: 'text', text: input }];
    setMessages(newMessages);
    setInput('');

    setTimeout(() => {
      setMessages(prev => [
        ...prev, 
        { role: 'bot', type: 'text', text: "This is a simulated response from your Transformer model. Please replace this with a real API call!" }
      ]);
    }, 800);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setMessages(prev => [...prev, { role: 'user', type: 'image', url: imageUrl }]);
      e.target.value = null;

      setTimeout(() => {
        setMessages(prev => [
          ...prev, 
          { role: 'bot', type: 'text', text: "Image received! Sending to YOLO for object detection and ResNet for feature extraction..." }
        ]);
      }, 1000);
    }
  };

  return (
    <div className="app-layout">
      
      {/*  SIDEBAR BÊN TRÁI  */}
      <aside className="sidebar">
        <div className="sidebar-top-icons">
          <button className="sidebar-icon-btn">☰</button>
          <button className="sidebar-icon-btn">🔍</button>
        </div>

        <div className="sidebar-menu">
          <div className="sidebar-item">
            <span className="icon">📝</span> New chat
          </div>
          <div className="sidebar-item">
            <span className="icon">⭐</span> My content
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span>Notebooks</span>
              <span className="icon-right">›</span>
            </div>
            <div className="sidebar-item">
              <span className="icon">➕</span> New notebook
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span>Gems</span>
              <span className="icon-right">›</span>
            </div>
            <div className="sidebar-item">
              <span className="icon">✨</span> Productivity planner
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">Recent</div>
            <div className="recent-chats-list">
              {recentChats.map((chat, index) => (
                <div key={index} className="sidebar-item recent-chat-item">
                  <span className="chat-name">{chat}</span>
                  <span className="pin-icon" title="Pin chat">📌</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-item">
            <span className="icon">⚙️</span> Settings & Help
            <span className="notification-dot"></span>
          </div>
        </div>
      </aside>

      {/* KHUNG CHAT CHÍNH BÊN PHẢI */}
      <main className="main-content">
        <div className="chat-container">
          <header className="chat-header">
            <h1>Belle Chatbot <span>Project 2026</span></h1>
          </header>

          <div className="messages-list">
            {messages.map((msg, index) => (
              <div key={index} className={`message-row ${msg.role}`}>
                {msg.role === 'bot' && <div className="avatar bot-avatar">B</div>}
                
                <div className={`message-bubble ${msg.role}`}>
                  {msg.type === 'image' ? (
                    <img 
                      src={msg.url} 
                      alt="User upload" 
                      style={{ maxWidth: '200px', borderRadius: '8px', marginTop: '4px' }} 
                    />
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <div className="input-box-container">
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
              />
              <button className="icon-btn" title="Upload image (YOLO/ResNet)" onClick={handleImageClick}>📷</button>
              <button className="icon-btn" title="Record audio (STT/TTS)">🎤</button>
              
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Message Belle..."
                rows="1"
              />
              
              <button 
                className={`send-btn ${input.trim() ? 'active' : ''}`} 
                onClick={handleSend}
              >
                ➤
              </button>
            </div>
            <p className="disclaimer">Belle can make mistakes. Please verify important information.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;