/* cspell:disable */
// frontend/src/components/Speaking.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Mic, Square, Volume2, Loader2 } from "lucide-react";
import { useVoiceRoomRecorder } from "../hooks/useVoiceRoomRecorder"; // ✅ 커스텀 훅 Import

// --- [유틸리티] ---
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
  const [transcript, setTranscript] = useState("");

  // ---------------------------------------------------------------------------
  // [1] 핸들러 정의 (useVoiceRoomRecorder에 전달)
  // ---------------------------------------------------------------------------

  // 말하는 도중 (회색 텍스트)
  const onInterimResult = useCallback((text: string) => {
    setTranscript(text);
  }, []);

  // 문장 확정 시
  const onFinalResult = useCallback((text: string) => {
    // 기존 텍스트에 이어서 붙일지, 교체할지 결정.
    // Speaking 컴포넌트는 보통 한 문장 단위 연습이므로 교체하거나 누적.
    // 여기서는 자연스러운 인식을 위해 누적보다는 최신 인식 결과를 보여주는게 보통 유리하나,
    // 끊어서 말하는 경우를 위해 누적 업데이트 방식을 사용.
    setTranscript((prev) => {
      // 너무 길어지면 리셋하는 로직이 필요할 수도 있지만, 연습용 문장이므로 덧붙임
      return prev ? `${prev} ${text}` : text;
    });
  }, []);

  // 오디오 캡처 완료 (VAD 침묵 감지 or 수동 종료 시 호출됨)
  const onAudioCaptured = useCallback(
    (blob: Blob) => {
      onRecord(blob);
    },
    [onRecord]
  );

  // ---------------------------------------------------------------------------
  // [2] 커스텀 훅 사용 (녹음, STT, VAD, 잡음 제거 통합)
  // ---------------------------------------------------------------------------
  const {
    start: startRecording,
    stop: stopRecording,
    isMicrophoneOn: isRecording, // 훅의 상태를 isRecording으로 매핑
  } = useVoiceRoomRecorder({
    onInterimResult,
    onFinalResult,
    onAudioCaptured,
  });

  // ---------------------------------------------------------------------------
  // [3] 로직 및 UI 상태 관리
  // ---------------------------------------------------------------------------

  // Prompt 변경 시 초기화
  useEffect(() => {
    setTranscript("");
    stopRecording(); // 프롬프트 바뀌면 녹음 중지
    window.speechSynthesis.cancel();
  }, [prompt, stopRecording]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopRecording();
      window.speechSynthesis.cancel();
    };
  }, [stopRecording]);

  // 단어 매칭 로직 (UI 표시용)
  const promptWords = useMemo(() => prompt.split(" "), [prompt]);
  const spokenWords = useMemo(() => {
    const sourceText = serverTranscript || transcript;
    const normalized = normalizeText(sourceText);
    return normalized.split(" ").filter((s) => s !== "");
  }, [transcript, serverTranscript]);

  const matchStatuses = useMemo(() => {
    let currentSpokenIndex = 0;
    return promptWords.map((word) => {
      const normTargetParts = normalizeText(word).split(" ");
      let tempIndex = currentSpokenIndex;
      let allPartsFound = true;

      for (const part of normTargetParts) {
        const foundIndex = spokenWords.indexOf(part, tempIndex);
        if (foundIndex !== -1) {
          tempIndex = foundIndex + 1;
        } else {
          allPartsFound = false;
          break;
        }
      }

      if (allPartsFound) {
        currentSpokenIndex = tempIndex;
        return true;
      }
      return false;
    });
  }, [promptWords, spokenWords]);

  // 자동 완료 로직: 문장의 80% 이상이 일치하면 1초 뒤 자동 종료
  useEffect(() => {
    if (!isRecording || serverTranscript) return;

    const matchedCount = matchStatuses.filter((s) => s).length;

    if (matchedCount >= promptWords.length * 0.8 && promptWords.length > 0) {
      const timer = setTimeout(() => {
        if (isRecording) {
          console.log("✅ 문장 완성 감지 -> 녹음 종료");
          stopRecording(); // 훅의 stop 호출 -> onAudioCaptured 트리거됨
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [
    isRecording,
    promptWords,
    matchStatuses,
    stopRecording,
    serverTranscript,
  ]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      setTranscript(""); // 재시작 시 텍스트 초기화
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

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
