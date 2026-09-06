'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const voiceError = (code: string) => {
  if (code === 'aborted') return '';
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'Microphone or speech recognition permission is blocked. On iPhone, open Emberwild in Safari and allow Microphone access.';
  if (code === 'network') return 'The browser speech service could not connect. On iPhone, open this page in Safari instead of an in-app browser, then try again.';
  if (code === 'audio-capture') return 'No microphone input was detected. Check microphone permission and try again.';
  if (code === 'no-speech') return 'I did not hear any speech. Tap the microphone and try again.';
  if (code === 'language-not-supported' || code === 'language-unavailable') return 'English speech recognition is not available in this browser.';
  return `Voice input error: ${code}`;
};

export function useVoiceChat(onTranscript: (text: string) => void) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef(onTranscript);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { transcriptRef.current = onTranscript; }, [onTranscript]);

  useEffect(() => {
    const w = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    setSupported(!!Ctor);
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event: any) => {
      let finalText = '';
      for (let i = event.resultIndex ?? 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      }
      if (finalText.trim()) transcriptRef.current(finalText.trim());
    };
    recognition.onerror = (event: any) => {
      const code = String(event?.error ?? 'unknown');
      const message = voiceError(code);
      if (message) setError(message);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  const start = useCallback(async () => {
    if (!window.isSecureContext) {
      setError('Microphone input requires HTTPS. Open the secure Emberwild preview and try again.');
      return;
    }
    if (!recognitionRef.current) {
      setError('Voice recognition is not available here. On iPhone, open Emberwild directly in Safari and use the microphone there.');
      return;
    }

    setError('');
    window.speechSynthesis?.cancel();

    // Prime microphone permission explicitly. This gives mobile Safari a clear
    // user gesture and produces a useful permission error before recognition.
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err: any) {
      const name = String(err?.name ?? '');
      if (/NotAllowed|PermissionDenied/i.test(name)) {
        setError('Microphone permission was denied. On iPhone: open in Safari → aA/Page Settings → Microphone → Allow.');
      } else {
        setError('The microphone could not be opened. Check browser microphone permission and try again.');
      }
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (err: any) {
      if (String(err?.name ?? '') !== 'InvalidStateError') {
        setError('Voice recognition could not start. On iPhone, open the game directly in Safari and try again.');
      }
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window) || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = .96;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => /en(-|_)(GB|US)/i.test(v.lang) && /samantha|daniel|alex|ava|serena/i.test(v.name)) ?? voices.find(v => /^en/i.test(v.lang));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  }, []);

  return { supported, listening, error, start, stop, speak };
}
