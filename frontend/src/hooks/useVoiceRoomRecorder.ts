// frontend/src/hooks/useVoiceRoomRecorder.ts
import { useRef, useState, useCallback } from "react";
import { AudioVADEngine } from "../utils/audio/AudioVADEngine";

// --- Web Speech API 타입 정의 ---
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type SafariWindow = Window &
  typeof globalThis & {
    webkitSpeechRecognition?: new () => ISpeechRecognition;
    SpeechRecognition?: new () => ISpeechRecognition;
  };

function makeId() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

interface VoiceRoomRecorderProps {
  onInterimResult: (text: string, id: string) => void;
  onFinalResult: (text: string, id: string) => void;
  onAudioCaptured: (blob: Blob, id: string) => void;
}

export function useVoiceRoomRecorder({
  onInterimResult,
  onFinalResult,
  onAudioCaptured,
}: VoiceRoomRecorderProps) {
  const vadRef = useRef<AudioVADEngine | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const currentIdRef = useRef<string>(makeId());

  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false);
  // ✅ [핵심] onresult 내부에서 동기적으로 상태를 확인하기 위한 Ref
  const isMicrophoneOnRef = useRef(false);

  const stopAndSendAudio = useCallback(
    (targetId: string) => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state === "recording") {
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          if (blob.size > 1000) {
            onAudioCaptured(blob, targetId);
          }
          chunksRef.current = [];
        };
        recorder.stop();
      }
    },
    [onAudioCaptured]
  );

  const start = useCallback(async () => {
    if (isMicrophoneOnRef.current) return;

    // 1. Web Speech API 설정
    const win = window as unknown as SafariWindow;
    const RecognitionClass =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (RecognitionClass) {
      const recognition = new RecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // ✅ [수정] 마이크가 꺼졌다면(stop 호출 이후라면) 잔여 이벤트 무시 -> 좀비 스크립트 방지
        if (!isMicrophoneOnRef.current) return;

        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcript = result[0].transcript;

          if (result.isFinal) {
            const fixedId = currentIdRef.current;

            onFinalResult(transcript, fixedId);
            stopAndSendAudio(fixedId);

            currentIdRef.current = makeId();

            if (mediaRecorderRef.current?.state === "inactive") {
              mediaRecorderRef.current.start();
            }
          } else {
            interim += transcript;
          }
        }
        if (interim) {
          onInterimResult(interim, currentIdRef.current);
        }
      };

      recognition.onend = () => {
        if (isMicrophoneOnRef.current) {
          try {
            recognition.start();
          } catch {
            /* ignore */
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    }

    // 2. VAD & MediaRecorder 설정
    try {
      const vad = new AudioVADEngine({
        silenceDuration: 1200,
        minVolumeThreshold: 0.02,
        onSpeechStart: () => {
          if (mediaRecorderRef.current?.state === "inactive") {
            mediaRecorderRef.current.start();
          }
        },
        onSpeechEnd: () => {
          // VAD 종료 로직은 Web Speech API가 주도하므로 생략
        },
      });

      await vad.start();
      vadRef.current = vad;

      const stream = vad.getStream();
      if (stream) {
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.start();
      }

      setIsMicrophoneOn(true);
      isMicrophoneOnRef.current = true; // Ref 동기화
    } catch (e) {
      console.error("Voice Room Recorder Error:", e);
    }
  }, [onFinalResult, onInterimResult, stopAndSendAudio]);

  const stop = useCallback(() => {
    // ✅ [핵심] 정지 시그널을 가장 먼저 보냄
    isMicrophoneOnRef.current = false;
    setIsMicrophoneOn(false);

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
    if (vadRef.current) vadRef.current.stop();

    // 녹음 중이었다면 강제 종료 및 전송 (현재 ID 사용)
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      const closingId = currentIdRef.current;

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 1000) {
          onAudioCaptured(blob, closingId);
        }
        chunksRef.current = [];
      };
      mediaRecorderRef.current.stop();
    } else if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    // 다음 발화를 위해 ID 초기화
    currentIdRef.current = makeId();
  }, [onAudioCaptured]);

  return { isMicrophoneOn, start, stop };
}
