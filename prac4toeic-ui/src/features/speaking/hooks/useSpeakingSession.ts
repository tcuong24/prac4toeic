import { useRef, useState, useCallback, useEffect } from 'react';

export type MessageRole = 'user' | 'assistant';

export interface TranscriptEntry {
  role: MessageRole;
  text: string;
}

export interface SessionFeedback {
  type: 'SESSION_FEEDBACK';
  pronunciationFeedback: string;
  grammarFeedback: string;
  vocabularyFeedback: string;
  overallScore: number;
  encouragement: string;
  pronunciationFeedbackVi: string;
  grammarFeedbackVi: string;
  vocabularyFeedbackVi: string;
  encouragementVi: string;
}

export type SessionState = 'idle' | 'connecting' | 'ready' | 'ended' | 'feedback';

const WS_URL = 'ws://localhost:4756/ws/speaking/conversation';
const MAX_RECONNECT_ATTEMPTS = 2;
const RECONNECT_BASE_DELAY_MS = 1000;

// Web Speech API interfaces for TypeScript
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

/**
 * Manages the full lifecycle of a TOEIC Speaking session:
 * - Real-time Web Speech API Speech Recognition (STT)
 * - Browser SpeechSynthesis Text-to-Speech (TTS)
 * - WebSocket connection to Spring Boot backend
 * - Automatic transcript accumulation and post-session TOEIC feedback
 * - Auto-reconnect with backoff when the backend drops the socket
 *   unexpectedly (e.g. upstream Gemini 503)
 */
export function useSpeakingSession() {
  const [state, setState] = useState<SessionState>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isMicActiveRef = useRef(false);
  const stateRef = useRef<SessionState>('idle');
  const currentTopicRef = useRef<string>('');
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReconnectingRef = useRef(false);
  const connectRef = useRef<((topic: string, isReconnect: boolean) => void) | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Web Speech API STT ───────────────────────────────────────────────────

  const stopMic = useCallback(() => {
    isMicActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (ignored) {
        console.log(ignored);
      }
    }
    setIsMicActive(false);
  }, []);

  const startMic = useCallback(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setError('Web Speech API is not supported in this browser. Please use Google Chrome or MS Edge.');
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {
        console.log(e);
      }
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const spokenText = event.results[i][0].transcript.trim();
          if (spokenText && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'USER_MESSAGE', text: spokenText }));
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech') {
        console.warn('Speech recognition warning/error:', event.error);
      }
    };

    recognition.onend = () => {
      if (isMicActiveRef.current && recognitionRef.current === recognition) {
        try { recognition.start(); } catch (e) {
          console.log(e);
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      isMicActiveRef.current = true;
      setIsMicActive(true);
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
    }
  }, []);

  // ── Speech Synthesis (TTS) ────────────────────────────────────────────────

  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop any active speech

    // Đọc từ ref, không phải state — tránh closure đóng băng giá trị cũ
    const wasMicActive = isMicActiveRef.current;
    if (wasMicActive) stopMic();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95; // Moderate pace suitable for TOEIC learners

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Karen'))
    ) || voices.find(v => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (wasMicActive) startMic();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      if (wasMicActive) startMic(); // trước đây thiếu, khiến mic kẹt tắt nếu TTS lỗi
    };

    window.speechSynthesis.speak(utterance);
  }, [stopMic, startMic]);

  // ── Cleanup ───────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (ignored) {
        console.log(ignored);
      }
      recognitionRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    isMicActiveRef.current = false;
    setIsMicActive(false);
    setIsSpeaking(false);
  }, []);

  useEffect(() => () => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    cleanup();
  }, [cleanup]);

  // ── Send user message (text or speech) ───────────────────────────────────

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'USER_MESSAGE', text: text.trim() }));
  }, []);

  // ── WebSocket management ──────────────────────────────────────────────────

  const connect = useCallback((topic: string, isReconnect: boolean) => {
    currentTopicRef.current = topic;
    isReconnectingRef.current = isReconnect;

    setState('connecting');
    if (!isReconnect) {
      // Reconnect thì giữ transcript cũ lại, không xóa
      setTranscript([]);
      setFeedback(null);
    }
    setError(isReconnect ? `Mất kết nối, đang thử lại (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...` : null);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'START_SESSION', topic }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'SESSION_READY':
            // Kết nối thành công → reset bộ đếm reconnect
            reconnectAttemptsRef.current = 0;
            setError(null);
            setState('ready');
            startMic();
            break;

          case 'AI_RESPONSE':
          case 'AUDIO_RESPONSE':
            break;

          case 'TRANSCRIPT':
            setTranscript(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === msg.role && last.text === msg.text) {
                return prev;
              }
              return [...prev, { role: msg.role as MessageRole, text: msg.text }];
            });

            if (msg.role === 'assistant' && msg.text) {
              speakText(msg.text);
            }
            break;

          case 'SESSION_FEEDBACK':
            setFeedback(msg as SessionFeedback);
            setState('feedback');
            break;

          case 'ERROR':
            setError(msg.message);
            setState('idle');
            break;
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    ws.onerror = () => {
      // onclose sẽ luôn được gọi ngay sau onerror, nên xử lý reconnect ở đó.
      // Ở đây chỉ log, tránh set error 2 lần chồng nhau.
      console.warn('WebSocket error, waiting for close event to decide reconnect.');
    };

    ws.onclose = (event) => {
      wsRef.current = null;

      // Trường hợp 1: user chủ động kết thúc → không làm gì thêm
      if (stateRef.current === 'ended' || stateRef.current === 'feedback') {
        return;
      }

      // Trường hợp 2 & 3: đóng bất thường (code !== 1000, ví dụ do Gemini 503
      // làm backend đóng socket) → thử reconnect với backoff trước khi bỏ cuộc
      const isAbnormalClose = event.code !== 1000;

      if (isAbnormalClose && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current += 1;
        const attempt = reconnectAttemptsRef.current;
        const delay = RECONNECT_BASE_DELAY_MS * attempt; // backoff tuyến tính: 1s, 2s

        setError(`Mất kết nối với AI service, đang thử lại (${attempt}/${MAX_RECONNECT_ATTEMPTS})...`);
        setState('connecting');
        stopMic();

        reconnectTimerRef.current = setTimeout(() => {
          connectRef.current?.(currentTopicRef.current, true);
        }, delay);
        return;
      }

      // Hết số lần thử hoặc đóng "normal" ngoài dự kiến → báo lỗi, dừng hẳn
      setError(
        reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS
          ? 'Không thể kết nối lại với AI service sau nhiều lần thử. Vui lòng thử lại sau.'
          : 'Kết nối đã đóng ngoài dự kiến.'
      );
      setState('idle');
      reconnectAttemptsRef.current = 0;
      cleanup();
    };
  }, [startMic, stopMic, speakText, cleanup]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const startSession = useCallback(async (topic: string) => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    connect(topic, false);
  }, [connect]);

  const endSession = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    setState('ended');
    stopMic();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'END_SESSION' }));
    }
  }, [stopMic]);

  const toggleMic = useCallback(() => {
    if (isMicActive) {
      stopMic();
    } else {
      startMic();
    }
  }, [isMicActive, startMic, stopMic]);

  const resetSession = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    cleanup();
    setState('idle');
    setTranscript([]);
    setFeedback(null);
    setError(null);
  }, [cleanup]);

  return {
    state,
    transcript,
    feedback,
    isMicActive,
    isSpeaking,
    error,
    startSession,
    endSession,
    toggleMic,
    sendMessage,
    resetSession,
  };
}