import { useState, useEffect, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import {
  getHealth, streamChat, getMemories, addMemory, deleteMemory,
} from './api/client';
import type { ChatMessage, HealthData, MemoryRecord, ModelMode } from './types';
import ChatPanel from './components/ChatPanel';
import MemoryPanel from './components/MemoryPanel';
import SettingsPanel from './components/SettingsPanel';
import StatusBar from './components/StatusBar';
import AssistantOrb from './components/AssistantOrb';

const SESSION_ID = uuid();

export default function App() {
  const [health, setHealth]       = useState<HealthData | null>(null);
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [memories, setMemories]   = useState<MemoryRecord[]>([]);
  const [mode, setMode]           = useState<ModelMode>('balanced');
  const [useMemory, setUseMemory] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Navigation & Views
  const [activeView, setActiveView]  = useState<'chat' | 'memory' | 'settings'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Companion controls & themes
  const [isSpeakerActive, setIsSpeakerActive] = useState(true);
  const [isScreenShareActive, setIsScreenShareActive] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [theme, setTheme] = useState<string>('slate');
  const [agentUpdates, setAgentUpdates] = useState<{ agent: string; status: string; message: string; timestamp: string }[]>([]);
  const [worldState, setWorldState] = useState<any>(null);
  const [cognitiveState, setCognitiveState] = useState<any>(null);

  useEffect(() => {
    // Open EventSource to retrieve live telemetry and unified WorldState
    const ev = new EventSource('/api/events/stream');
    ev.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'world_state') {
          setWorldState(payload.data);
        } else if (payload.type === 'cognitive_state') {
          setCognitiveState(payload.data);
        }
      } catch (err) {
        console.error('Error parsing world state stream payload:', err);
      }
    };
    return () => ev.close();
  }, []);

  useEffect(() => {
    getHealth().then(setHealth).catch(console.error);
    getMemories().then(setMemories).catch(console.error);

    const savedTheme = localStorage.getItem('nexus_workspace_theme') || 'slate';
    setTheme(savedTheme);
  }, []);

  const changeTheme = useCallback((newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('nexus_workspace_theme', newTheme);
  }, []);

  const refreshMemories = useCallback(async () => {
    const m = await getMemories();
    setMemories(m);
  }, []);

  const speakText = useCallback((text: string) => {
    if (!isSpeakerActive || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const cleaned = text
        .replace(/[*_#`\-]/g, ' ')
        .replace(/\[MEMORY CONTEXT.*?\]/gi, '')
        .trim();

      if (!cleaned) return;

      const utterance = new SpeechSynthesisUtterance(cleaned);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                            voices.find(v => v.lang.startsWith('en') && v.name.includes('Microsoft')) ||
                            voices.find(v => v.lang.startsWith('en'));

      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speech synthesis error:', e);
    }
  }, [isSpeakerActive]);

  useEffect(() => {
    if (!isSpeakerActive && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isSpeakerActive]);

  const handleSend = useCallback(async (text: string, image?: string) => {
    if (isStreaming || !text.trim()) return;

    const userMsgId = uuid();
    const userMsg: ChatMessage = {
      id: userMsgId, role: 'user', content: text,
      timestamp: new Date().toISOString(),
    };

    const assistantId = uuid();
    const assistantMsg: ChatMessage = {
      id: assistantId, role: 'assistant', content: '',
      timestamp: new Date().toISOString(), mode,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    setAgentUpdates([]); // Clear previous agent trace

    let accumulatedText = '';

    await streamChat(SESSION_ID, text, mode, useMemory, {
      onAgentState: (update) => {
        setAgentUpdates((prev) => [...prev, update].slice(-4));
      },
      onToken: (token) => {
        accumulatedText += token;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + token } : m,
          ),
        );
      },
      onMemoryContext: (mems) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, memoryContext: mems } : m,
          ),
        );
      },
      onMemoryWrite: () => { void refreshMemories(); },
      onDone: () => {
        setIsStreaming(false);
        void refreshMemories();
        speakText(accumulatedText);
      },
      onError: (msg) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `[Error: ${msg}]` }
              : m,
          ),
        );
        setIsStreaming(false);
      },
    }, image);
  }, [isStreaming, mode, useMemory, refreshMemories, speakText]);

  const handleAddMemory = useCallback(async (content: string) => {
    await addMemory(content, ['manual']);
    await refreshMemories();
  }, [refreshMemories]);

  const handleDeleteMemory = useCallback(async (id: string) => {
    await deleteMemory(id);
    await refreshMemories();
  }, [refreshMemories]);

  return (
    <div className={`app-shell theme-${theme} ${isCompact ? 'compact-companion' : ''} ${isSidebarOpen && !isCompact ? 'sidebar-open' : 'sidebar-closed'}`}>
      
      {/* Left Sidebar (Only visible in full view) */}
      {!isCompact && (
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="logo-group">
              <AssistantOrb 
                isActive={isStreaming} 
                confidence={cognitiveState ? cognitiveState.predictionState.confidence * 100 : 95}
                trustScore={cognitiveState ? cognitiveState.trustScore : 98}
                isDeepReasoning={mode === 'deep' && isStreaming}
              />
              <div className="logo-details">
                <h1 className="logo-text">ORION</h1>
                <p className="logo-sub">Private Co-Founder</p>
              </div>
            </div>
            <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? '◀' : '▶'}
            </button>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`sidebar-nav-item ${activeView === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveView('chat')}
            >
              <span className="nav-icon">💬</span> {isSidebarOpen && 'Chat Workspace'}
            </button>
            <button
              className={`sidebar-nav-item ${activeView === 'memory' ? 'active' : ''}`}
              onClick={() => setActiveView('memory')}
            >
              <span className="nav-icon">🧠</span> {isSidebarOpen && `Memory Bank (${memories.length})`}
            </button>
            <button
              className={`sidebar-nav-item ${activeView === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveView('settings')}
            >
              <span className="nav-icon">⚙️</span> {isSidebarOpen && 'Settings'}
            </button>
          </nav>

          {/* Collapsible Cockpit Widgets */}
          {isSidebarOpen && (
            <div className="sidebar-widgets">
              <div className="sidebar-widget identity-widget">
                <div className="widget-header">
                  <span className="widget-icon">👤</span> Operator Profile
                </div>
                <div className="identity-content">
                  <div className="identity-name">Namir</div>
                  <div className="identity-meta">ORION Administrator</div>
                  <div className="identity-tags">
                    <span className="id-tag">ADMIN</span>
                    <span className="id-tag">LOCAL RAG</span>
                    <span className="id-tag">ONLINE</span>
                  </div>
                </div>
              </div>

              <div className="sidebar-widget monitor-widget">
                <div className="widget-header">
                  <span className="widget-icon">📊</span> Cognitive Monitor
                </div>
                <div className="monitor-stats">
                  <div className="stat-row">
                    <span>Recall Bank</span>
                    <span>{memories.length} / 1k</span>
                  </div>
                  <div className="stat-row">
                    <span>Vector Dim</span>
                    <span>768</span>
                  </div>
                  <div className="stat-row">
                    <span>Cognition</span>
                    <span>{mode === 'deep' ? '0.2 (Low Temp)' : mode === 'balanced' ? '0.7 (Med Temp)' : '1.0 (High Temp)'}</span>
                  </div>
                  
                  {worldState && (
                    <>
                      <div className="stat-row">
                        <span>System CPU</span>
                        <span>{worldState.telemetry.cpuLoad}%</span>
                      </div>
                      <div className="stat-row">
                        <span>Active RAM</span>
                        <span>{worldState.telemetry.memoryUsage} MB</span>
                      </div>
                      <div className="stat-row">
                        <span>Query Count</span>
                        <span>{worldState.telemetry.queryCount}</span>
                      </div>
                      <div className="stat-row">
                        <span>Cognitive Mood</span>
                        <span>{worldState.emotionalState.sentiment}</span>
                      </div>
                    </>
                  )}

                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${Math.min(memories.length * 2.5, 100)}%` }}></div>
                  </div>
                </div>
              </div>

              {agentUpdates.length > 0 && (
                <div className="sidebar-widget telemetry-widget">
                  <div className="widget-header">
                    <span className="widget-icon">⚡</span> Agent Telemetry HUD
                  </div>
                  <div className="telemetry-logs">
                    {agentUpdates.map((up, i) => (
                      <div key={i} className={`telemetry-row status-${up.status}`}>
                        <span className="telemetry-agent">[{up.agent}]</span>
                        <span className="telemetry-msg">{up.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(isStreaming || isScreenShareActive) && (
                <div className="sidebar-widget wave-widget">
                  <div className="voice-wave">
                    <span className="wave-bar"></span>
                    <span className="wave-bar"></span>
                    <span className="wave-bar"></span>
                    <span className="wave-bar"></span>
                    <span className="wave-bar"></span>
                  </div>
                  <div className="wave-label">ORION Link Active</div>
                </div>
              )}
            </div>
          )}

          {isSidebarOpen && (
            <div className="sidebar-footer">
              <StatusBar health={health} />
            </div>
          )}
        </aside>
      )}

      {/* Main Content Area */}
      <div className="main-layout">
        {/* Compact Mode Header Fallback */}
        {isCompact && (
          <header className="compact-header">
            <div className="logo-group">
              <AssistantOrb isActive={isStreaming} />
              <div>
                <h1 className="logo-text">ORION</h1>
                <p className="logo-sub">Buddy Mode</p>
              </div>
            </div>
            <button
              className="layout-toggle compact-active"
              onClick={() => setIsCompact(false)}
            >
              💻 Expand
            </button>
          </header>
        )}

        {/* Floating Top Menu (Full view only) */}
        {!isCompact && (
          <header className="top-navbar">
            <div className="top-nav-left">
              {!isSidebarOpen && (
                <button className="sidebar-trigger" onClick={() => setIsSidebarOpen(true)}>
                  ☰ ORION
                </button>
              )}
            </div>
            <div className="top-nav-right">
              <button
                className="layout-toggle"
                onClick={() => {
                  setIsCompact(true);
                  setActiveView('chat');
                }}
                title="Snap Companion Widget"
              >
                📱 Snap Buddy
              </button>
            </div>
          </header>
        )}

        {/* Dynamic Panels with transitions */}
        <main className="app-main">
          {activeView === 'chat' && (
            <div className="panel-container fade-in">
              <ChatPanel
                messages={messages}
                isStreaming={isStreaming}
                mode={mode}
                useMemory={useMemory}
                onModeChange={setMode}
                onUseMemoryChange={setUseMemory}
                onSend={handleSend}
                
                isSpeakerActive={isSpeakerActive}
                onToggleSpeaker={() => setIsSpeakerActive((s) => !s)}
                isScreenShareActive={isScreenShareActive}
                onToggleScreenShare={() => setIsScreenShareActive((s) => !s)}
                speakText={speakText}
              />
            </div>
          )}

          {activeView === 'memory' && (
            <div className="panel-container fade-in">
              <MemoryPanel
                memories={memories}
                onAdd={handleAddMemory}
                onDelete={handleDeleteMemory}
              />
            </div>
          )}

          {activeView === 'settings' && (
            <div className="panel-container fade-in">
              <SettingsPanel
                onThemeChange={changeTheme}
                currentTheme={theme}
                memories={memories}
                onRefreshMemories={refreshMemories}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
