/* cspell:disable */
// frontend/src/components/Speaking.tsx
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Mic, Square, Volume2, Loader2 } from "lucide-react";

// --- [Web Speech API 타입 정의] ---
interface ISpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ISpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: ISpeechRecognitionAlternative;
  length: number;
}

interface ISpeechRecognitionResultList {
  length: number;
  item(index: number): ISpeechRecognitionResult;
  [index: number]: ISpeechRecognitionResult;
}

interface ISpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: ISpeechRecognitionResultList;
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: (event: ISpeechRecognitionEvent) => void;
  onerror: (event: ISpeechRecognitionErrorEvent) => void;
  onspeechend: () => void;
}

interface IWindow extends Window {
  webkitSpeechRecognition?: {
    new (): ISpeechRecognition;
  };
  SpeechRecognition?: {
    new (): ISpeechRecognition;
  };
}
// -------------------------------

const SILENCE_TIMEOUT_MS = 1000;

function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[.,!?'"]/g, "")
    .replace(/\b(i|you|he|she|it|we|they)m\b/g, "$1 am")
    .replace(/\b(i|you|he|she|it|we|they)re\b/g, "$1 are")
    .replace(/\b(i|you|he|she|it|we|they)ve\b/g, "$1 have")
    .replace(/\b(i|you|he|she|it|we|they)ll\b/g, "$1 will")
    .replace(/\b(i|you|he|she|it|we|they)d\b/g, "$1 would")
    .replace(/\bcant\b/g, "cannot")
    .replace(/\bdont\b/g, "do not")
    .replace(/\bdoesnt\b/g, "does not")
    .replace(/\bdidnt\b/g, "did not")
    .replace(/\bwont\b/g, "will not")
    .replace(/\bisnt\b/g, "is not")
    .replace(/\barent\b/g, "are not")
    .replace(/\bwasnt\b/g, "was not")
    .replace(/\bwerent\b/g, "were not")
    .replace(/\blets\b/g, "let us")
    .replace(/\s+/g, " ")
    .trim();
}

interface Props {
  prompt: string;
  onRecord: (audioBlob: Blob) => void;
  serverTranscript?: string | null;
}

const Speaking: React.FC<Props> = ({ prompt, onRecord, serverTranscript }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpokenRef = useRef(false);

  // 컴포넌트 언마운트 시 TTS 중단
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Prompt 변경 시 상태 초기화
  useEffect(() => {
    setTranscript("");
    setIsRecording(false);
    hasSpokenRef.current = false;

    window.speechSynthesis.cancel();

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, [prompt]);

  const promptWords = useMemo(() => prompt.split(" "), [prompt]);

  const spokenWords = useMemo(() => {
    const sourceText = serverTranscript || transcript;
    const normalized = normalizeText(sourceText);
    return normalized.split(" ").filter((s) => s !== "");
  }, [transcript, serverTranscript]);

  // [수정됨] 순차적 매칭 로직 (Sequential Matching Logic)
  const matchStatuses = useMemo(() => {
    // 현재까지 매칭된 spokenWords의 인덱스 위치를 추적합니다.
    let currentSpokenIndex = 0;

    return promptWords.map((word) => {
      // I'm -> ["i", "am"] 처럼 분리될 수 있음
      const normTargetParts = normalizeText(word).split(" ");

      let tempIndex = currentSpokenIndex;
      let allPartsFound = true;

      // 분리된 단어 파트들이 '순서대로' 존재하는지 확인
      for (const part of normTargetParts) {
        // tempIndex(이전 단어가 찾은 위치) 이후부터 검색
        const foundIndex = spokenWords.indexOf(part, tempIndex);

        if (foundIndex !== -1) {
          // 찾았으면 다음 파트는 그 뒤에서부터 찾도록 인덱스 업데이트
          tempIndex = foundIndex + 1;
        } else {
          allPartsFound = false;
          break;
        }
      }

      if (allPartsFound) {
        // 해당 단어(혹은 구)가 순서대로 발견되었다면,
        // 다음 promptWord는 이 단어가 끝난 지점 이후부터 찾도록 main 포인터 업데이트
        currentSpokenIndex = tempIndex;
        return true;
      }

      // 찾지 못했으면 currentSpokenIndex를 업데이트하지 않음 (건너뛰고 다음 단어 매칭 시도 가능)
      return false;
    });
  }, [promptWords, spokenWords]);

  const stopRecordingProcess = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  const stopAndSubmit = useCallback(() => {
    stopRecordingProcess();
    setIsRecording(false);
  }, [stopRecordingProcess]);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    if (hasSpokenRef.current) {
      silenceTimerRef.current = setTimeout(() => {
        console.log("침묵 감지(1초): 녹음 자동 종료");
        stopAndSubmit();
      }, SILENCE_TIMEOUT_MS);
    }
  }, [stopAndSubmit]);

  useEffect(() => {
    return () => stopRecordingProcess();
  }, [stopRecordingProcess]);

  const startRecording = useCallback(async () => {
    try {
      window.speechSynthesis.cancel();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const options = { mimeType };
      const recorder = new MediaRecorder(stream, options);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(chunksRef.current, { type: mimeType });
        onRecord(fullBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();

      const currentWindow = window as unknown as IWindow;
      const SpeechRecognitionAPI =
        currentWindow.SpeechRecognition ||
        currentWindow.webkitSpeechRecognition;

      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.lang = "en-US";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: ISpeechRecognitionEvent) => {
          hasSpokenRef.current = true;
          resetSilenceTimer();

          const resultsArray = Array.from(
            event.results
          ) as ISpeechRecognitionResult[];
          const currentTranscript = resultsArray
            .map((result) => result[0].transcript)
            .join("");
          setTranscript(currentTranscript);
        };

        recognition.onspeechend = () => {
          // 종료 감지
        };

        recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
          if (event.error === "no-speech") return;
          console.warn("Speech Recognition Error:", event.error);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        console.warn("Web Speech API not supported in this browser.");
      }

      setIsRecording(true);
      setTranscript("");
      hasSpokenRef.current = false;
    } catch (err) {
      console.error("Mic Error:", err);
      alert("마이크 권한이 필요하거나 지원하지 않는 브라우저입니다.");
    }
  }, [onRecord, resetSilenceTimer]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopAndSubmit();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopAndSubmit]);

  // 자동 완료 로직
  useEffect(() => {
    if (!isRecording || serverTranscript) return;

    const matchedCount = matchStatuses.filter((s) => s).length;

    if (matchedCount >= promptWords.length * 0.8 && promptWords.length > 0) {
      const timer = setTimeout(() => {
        if (isRecording) stopAndSubmit();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [
    transcript,
    isRecording,
    promptWords,
    matchStatuses,
    stopAndSubmit,
    serverTranscript,
  ]);

  const playTTS = () => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(prompt);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="space-y-6 py-4">
      <div className="text-left">
        <h1 className="text-2xl font-bold text-gray-900">말하기 연습</h1>
        <p className="text-gray-500 mt-1">
          마이크를 켜고 문장을 읽으세요. 문장이 완성되거나 말이 멈추면
          제출됩니다.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[200px] relative">
        <button
          onClick={playTTS}
          disabled={isRecording}
          className={`absolute top-3 right-3 p-2 rounded-full transition-colors z-10 ${
            isRecording
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-400 hover:text-rose-500 hover:bg-gray-100"
          }`}
          title="듣기"
        >
          <Volume2 className="w-6 h-6" />
        </button>

        <div className="w-full text-left text-2xl sm:text-3xl font-semibold text-gray-800 leading-relaxed flex flex-wrap justify-start gap-x-2 pt-6">
          {promptWords.map((word, i) => {
            const isMatched = matchStatuses[i];

            return (
              <span
                key={i}
                className={`transition-colors duration-500 ${
                  isMatched ? "text-green-600 scale-105" : "text-gray-400"
                }`}
              >
                {word}
              </span>
            );
          })}
        </div>

        <div className="w-full mt-6 text-sm font-medium text-gray-500 h-6 flex items-center gap-2 justify-center">
          {isRecording && <Loader2 className="w-3 h-3 animate-spin" />}
          {isRecording ? "듣고 있습니다..." : "대기 중"}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6">
        <button
          onClick={toggleRecording}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
            isRecording
              ? "bg-red-500 text-white ring-4 ring-red-200 scale-110 animate-pulse"
              : "bg-rose-500 text-white hover:bg-rose-600 hover:scale-105"
          }`}
        >
          {isRecording ? (
            <Square className="w-10 h-10 fill-current" />
          ) : (
            <Mic className="w-10 h-10" />
          )}
        </button>
      </div>
    </div>
  );
};

export default Speaking;
