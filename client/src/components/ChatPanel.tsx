import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, ModelMode } from '../types';
import ScreenCapture, { ScreenCaptureHandle } from './ScreenCapture';

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  mode: ModelMode;
  useMemory: boolean;
  onModeChange: (m: ModelMode) => void;
  onUseMemoryChange: (v: boolean) => void;
  onSend: (text: string, image?: string) => void;
  
  // Companion controls
  isSpeakerActive: boolean;
  onToggleSpeaker: () => void;
  isScreenShareActive: boolean;
  onToggleScreenShare: () => void;
  speakText: (text: string) => void;
}

export default function ChatPanel({
  messages, isStreaming, mode, useMemory,
  onModeChange, onUseMemoryChange, onSend,
  isSpeakerActive, onToggleSpeaker, isScreenShareActive, onToggleScreenShare,
  speakText,
}: Props) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<ScreenCaptureHandle>(null);
  const recognitionRef = useRef<any>(null);
  const wakeRecognitionRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');

  const onSendRef = useRef(onSend);
  const isScreenShareActiveRef = useRef(isScreenShareActive);
  const isStreamingRef = useRef(isStreaming);

  useEffect(() => {
    onSendRef.current = onSend;
    isScreenShareActiveRef.current = isScreenShareActive;
    isStreamingRef.current = isStreaming;
  }, [onSend, isScreenShareActive, isStreaming]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const triggerSubmit = useCallback((textToSend: string) => {
    const text = textToSend.trim();
    if (!text || isStreamingRef.current) return;
    
    let screenshot: string | undefined = undefined;
    if (isScreenShareActiveRef.current && screenRef.current) {
      const frame = screenRef.current.captureFrame();
      if (frame) screenshot = frame;
    }

    setInput('');
    onSendRef.current(text, screenshot);
  }, []);

  // active speech synthesis voice toggle helper
  function triggerActiveVoiceListening() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  }

  // 1. Wake Word Monitor Listener ("Hey Jarvis" trigger)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && isWakeWordActive) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.toLowerCase();
          if (
            transcript.includes('jarvis') ||
            transcript.includes('orion') ||
            transcript.includes('hey jarvis') ||
            transcript.includes('hey orion')
          ) {
            // Wake word detected! Close wake listener, chime user verbally and start voice commands
            rec.stop();
            setIsWakeWordActive(false);

            speakText("Yes, Namir. I am listening.");
            
            setTimeout(() => {
              triggerActiveVoiceListening();
            }, 1400);
            break;
          }
        }
      };

      rec.onerror = (e: any) => {
        console.error('Wake word listener error:', e);
      };

      rec.onend = () => {
        if (isWakeWordActive) {
          try { rec.start(); } catch (err) {}
        }
      };

      try {
        rec.start();
      } catch (e) {
        console.error(e);
      }

      wakeRecognitionRef.current = rec;

      return () => {
        rec.onend = null;
        rec.stop();
      };
    }
  }, [isWakeWordActive, speakText]);

  // 2. Speech to Text (SpeechRecognition API) for Chat input
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        latestTranscriptRef.current = '';
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          setInput((prev) => (prev ? prev + ' ' + text : text));
          latestTranscriptRef.current = text;
        }
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
        const speechContent = latestTranscriptRef.current.trim();
        if (speechContent) {
          latestTranscriptRef.current = '';
          triggerSubmit(speechContent);
        }
      };

      recognitionRef.current = rec;
    }
  }, [triggerSubmit]);

  function toggleListening() {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    // Turn off wake word if turning on active mic
    if (isWakeWordActive) {
      setIsWakeWordActive(false);
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  }

  function submit() {
    triggerSubmit(input);
  }

  return (
    <div className="chat-panel">
      <div className="chat-toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">Mode</span>
          {(['fast', 'balanced', 'deep'] as ModelMode[]).map((m) => (
            <button
              key={m}
              className={`mode-btn ${mode === m ? 'active' : ''}`}
              onClick={() => onModeChange(m)}
            >{m}</button>
          ))}
        </div>
        <div className="toolbar-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={useMemory}
              onChange={(e) => onUseMemoryChange(e.target.checked)}
            />
            Memory
          </label>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Orion</p>
            <p className="chat-empty-sub">
              {isWakeWordActive 
                ? '🎙️ Standing by... Say "Hey Orion" to activate.' 
                : 'Your cognitive workspace companion. Speak or type to begin.'}
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isStreaming && (
          <div className="streaming-indicator" aria-label="Orion is thinking">
            <span /><span /><span />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Embedded Live Screen sharing stream */}
      <ScreenCapture
        ref={screenRef}
        isActive={isScreenShareActive}
        onInactive={onToggleScreenShare}
      />

      <div className="chat-input-row">
        <div className="media-controls">
          {/* Microphone trigger (STT) */}
          <button
            className={`control-btn ${isListening ? 'active-listening' : ''}`}
            onClick={toggleListening}
            title={isListening ? 'Stop listening' : 'Start voice command'}
          >
            {isListening ? '🎙️' : '🎙️'}
          </button>

          {/* Wake Word Monitor toggle */}
          <button
            className={`control-btn ${isWakeWordActive ? 'active-wake' : ''}`}
            onClick={() => setIsWakeWordActive(prev => !prev)}
            title={isWakeWordActive ? 'Jarvis Wake Listener Active' : 'Enable Wake Word ("Hey Jarvis")'}
          >
            🛎️
          </button>
          
          {/* Speaker feedback toggle (TTS) */}
          <button
            className={`control-btn ${isSpeakerActive ? 'active-speaker' : ''}`}
            onClick={onToggleSpeaker}
            title={isSpeakerActive ? 'Mute Speech' : 'Unmute Speech'}
          >
            {isSpeakerActive ? '🔊' : '🔇'}
          </button>
          
          {/* Screen Share toggle (Vision) */}
          <button
            className={`control-btn ${isScreenShareActive ? 'active-vision' : ''}`}
            onClick={onToggleScreenShare}
            title={isScreenShareActive ? 'Stop Vision' : 'Share Screen (Vision)'}
          >
            🖥️
          </button>
        </div>

        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={isListening ? 'Listening for voice prompt…' : isWakeWordActive ? 'Orion is standing by...' : 'Message Orion…'}
          rows={1}
          disabled={isStreaming}
        />
        <button
          className={`send-btn ${isStreaming || !input.trim() ? 'disabled' : ''}`}
          onClick={submit}
          disabled={isStreaming || !input.trim()}
          aria-label="Send"
        >
          {isStreaming ? '…' : '↑'}
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage; key?: string }) {
  const [showCtx, setShowCtx] = useState(false);

  return (
    <article className={`message message--${message.role}`}>
      <div className="message-content">
        {message.content || (
          message.role === 'assistant'
            ? <span className="typing-cursor" aria-hidden="true">▋</span>
            : null
        )}
      </div>

      {message.memoryContext && message.memoryContext.length > 0 && (
        <div className="memory-transparency">
          <button
            className="mem-toggle"
            onClick={() => setShowCtx((v) => !v)}
          >
            {showCtx ? '▼' : '▶'} {message.memoryContext.length} memor{message.memoryContext.length === 1 ? 'y' : 'ies'} retrieved
          </button>
          {showCtx && (
            <ul className="mem-context-list">
              {message.memoryContext.map((m) => (
                <li key={m.id}>{m.content}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <time className="message-time">
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        {message.mode && <span className="message-mode"> · {message.mode}</span>}
      </time>
    </article>
  );
}
