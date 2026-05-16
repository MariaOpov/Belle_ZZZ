import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';
const [responseMode, setResponseMode] = useState('normal');
const [belleStyle, setBelleStyle] = useState('technical');
const [autoScroll, setAutoScroll] = useState(true);


const MODEL_LABELS = {
  'belle-1': 'Belle-1 RNN',
  'belle-2': 'Belle-2 GPT-2',
  'belle-3': 'Belle-3 Qwen RAG'
};

const TypewriterText = ({ text, animate, scrollRef }) => {
  const [displayedText, setDisplayedText] = useState(animate ? '' : text);

  useEffect(() => {
    if (!animate) {
      setDisplayedText(text);
      return;
    }

    let i = 0;

    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });

      if (i >= text.length) {
        clearInterval(interval);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [text, animate, scrollRef]);

  return <>{displayedText}</>;
};

function App() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'My name is Belle. Has your system successfully connected?',
      isNew: false
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Dashboard states
  const [systemLog, setSystemLog] = useState(
    '[SYSTEM_LOG_INITIALIZED]\nWaiting for queries...'
  );
  const [chatHistory, setChatHistory] = useState([]);
  const [currentIntent, setCurrentIntent] = useState('STANDBY');
  const [selectedModel, setSelectedModel] = useState('belle-3');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:5000/api/history');
      setChatHistory(res.data.data || []);
    } catch (err) {
      console.error('Lỗi lấy lịch sử:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const modelLabel = MODEL_LABELS[selectedModel] || selectedModel;

    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setIsLoading(true);
    setCurrentIntent('ANALYZING...');

    setSystemLog(
      `[MODEL_ROUTER]\n` +
      `Selected model: ${modelLabel}\n` +
      `Processing query: "${userText}"...`
    );

    try {
      const response = await axios.post('http://127.0.0.1:5000/api/chat', {
        userMessage: userText,
        model: selectedModel
      });

      const data = response.data.data || {};

      const botReply = data.botResponse || 'Belle did not return a response.';
      const ragContext = data.context || '';
      const intentDetected = data.intent || 'UNKNOWN';
      const modelUsed = data.modelUsed || selectedModel;
      const usedRag = data.usedRag || false;

      const usedModelLabel = MODEL_LABELS[modelUsed] || modelUsed;

      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          text: botReply,
          isNew: true,
          modelUsed,
          intent: intentDetected,
          usedRag
        }
      ]);

      setCurrentIntent(intentDetected);

      if (ragContext.trim() !== '') {
        setSystemLog(
          `[MODEL_ROUTER_RESULT]\n` +
          `Selected model: ${modelLabel}\n` +
          `Model used: ${usedModelLabel}\n` +
          `Intent: ${intentDetected}\n` +
          `Used RAG: ${usedRag ? 'YES' : 'NO'}\n\n` +
          `[CONTEXT]\n${ragContext}`
        );
      } else {
        setSystemLog(
          `[MODEL_ROUTER_RESULT]\n` +
          `Selected model: ${modelLabel}\n` +
          `Model used: ${usedModelLabel}\n` +
          `Intent: ${intentDetected}\n` +
          `Used RAG: ${usedRag ? 'YES' : 'NO'}\n\n` +
          `No retrieved context.`
        );
      }

      fetchHistory();
    } catch (error) {
      console.error('Lỗi:', error);

      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          text: 'Connection error! Please check the server.',
          isNew: true
        }
      ]);

      setSystemLog(
        `[ERROR]\n` +
        `Failed to connect to backend API.\n` +
        `Selected model: ${modelLabel}`
      );

      setCurrentIntent('ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="main-wrapper">
        {/* ================= CỘT TRÁI: SIDEBAR ================= */}
        <div className="left-sidebar">
          <div className="panel-box telemetry-panel">
            <div className="panel-header">
              <h3>System Telemetry</h3>
            </div>

            <div className="panel-content">
              <div className="telemetry-row">
                <span>NODE_API</span>
                <span className="telemetry-value online">[ ONLINE ]</span>
              </div>

              <div className="telemetry-row">
                <span>MONGODB</span>
                <span className="telemetry-value online">[ CONNECTED ]</span>
              </div>

              <div className="telemetry-row">
                <span>MODEL_ROUTER</span>
                <span className="telemetry-value online">[ ACTIVE ]</span>
              </div>
            </div>
          </div>

          <div className="panel-box history-panel">
            <div className="panel-header">
              <h3>Recent Queries</h3>
            </div>

            <div className="panel-content">
              {chatHistory.length === 0 ? (
                <span>No history found.</span>
              ) : (
                chatHistory.map((chat, idx) => (
                  <div key={idx} className="history-item">
                    <div className="history-intent">[{chat.intent}]</div>
                    <div className="history-item-text">{chat.userMessage}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ================= CỘT GIỮA: KHUNG CHAT ================= */}
        <div className="chat-section">
          <div className="chat-header">
            <h2>Belle</h2>

            <div className="chat-header-right">
              <select
                className="model-selector"
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                disabled={isLoading}
              >
                <option value="belle-1">Belle-1 RNN</option>
                <option value="belle-2">Belle-2 GPT-2</option>
                <option value="belle-3">Belle-3 Qwen RAG</option>
              </select>

              <span className="status-badge">SYSTEM ONLINE</span>
            </div>
          </div>

          <div className="chat-content">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={index}
                  className={`message-wrapper ${isUser ? 'user' : 'bot'}`}
                >
                  <span className="sender-name">
                    {isUser ? (
                      'You'
                    ) : (
                      <>
                        Belle
                        {msg.modelUsed && (
                          <span className={`message-model-badge ${msg.modelUsed}`}>
                            {MODEL_LABELS[msg.modelUsed] || msg.modelUsed}
                          </span>
                        )}
                      </>
                    )}
                  </span>

                  <div className={`chat-bubble ${isUser ? 'user' : 'bot'}`}>
                    {isUser ? (
                      msg.text
                    ) : (
                      <TypewriterText
                        text={msg.text}
                        animate={msg.isNew}
                        scrollRef={messagesEndRef}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="message-wrapper bot">
                <span className="sender-name">Belle</span>
                <div className="typing-indicator">[PROCESSING_DATA...]</div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <input
              type="text"
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleSend();
                }
              }}
              placeholder="[Nhập lệnh hoặc câu hỏi...]"
              disabled={isLoading}
            />

            <button
              className="send-button"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
            >
              Gửi
            </button>
          </div>
        </div>

        {/* ================= CỘT PHẢI: LOG & INTENT ================= */}
        <div className="right-sidebar">
          <div className="panel-box intent-panel">
            <div className="panel-header">
              <h3>Intent Analysis</h3>
            </div>

            <div className="panel-content" style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: '#71717a' }}>
                DETECTED INTENT
              </span>

              <div className="intent-data">{currentIntent}</div>
            </div>
          </div>

          <div className="panel-box log-panel">
            <div className="panel-header">
              <h3>RAG Retrieval Log</h3>
            </div>

            <div className="panel-content">
              <pre className="log-pre">{systemLog}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;