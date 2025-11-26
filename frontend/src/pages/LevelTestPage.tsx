// frontend/src/pages/LevelTestPage.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Loader2, X, Ear } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAITalkRecorder } from "../hooks/useAITalkRecorder";

// --- 더미 데이터 및 상수 ---
const DUMMY_AI_AUDIO_DURATION = 3000;
const MAX_TURNS = 3;

const LevelTestPage: React.FC = () => {
  const navigate = useNavigate();

  // --- [1] 로직 제어용 Ref (값이 바뀌어도 리렌더링 안됨, 함수 재생성 방지) ---
  const turnCountRef = useRef(0);
  const isProcessingRef = useRef(false);
  const isAISpeakingRef = useRef(false);
  const isUnmountedRef = useRef(false);

  // --- [2] UI 렌더링용 State ---
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isConversationEnded, setIsConversationEnded] = useState(false);
  const [statusText, setStatusText] = useState("테스트 준비 중...");

  // 게스트 모드 여부 (테스트용)
  const isGuestMode = false;

  // -----------------------------------------------------------------------
  // [3] AI 발화 시뮬레이션 (Ref 사용)
  // -----------------------------------------------------------------------
  const simulateAISpeaking = useCallback(() => {
    // 로직 상태 업데이트
    isAISpeakingRef.current = true;

    // UI 업데이트
    setStatusText("AI가 질문하고 있습니다...");
    setIsAISpeaking(true);

    setTimeout(() => {
      if (isUnmountedRef.current) return;

      // 로직 상태 해제
      isAISpeakingRef.current = false;

      // UI 업데이트
      setIsAISpeaking(false);
      setStatusText("답변을 말씀해주세요");
    }, DUMMY_AI_AUDIO_DURATION);
  }, []);

  // -----------------------------------------------------------------------
  // [4] 더미 메시지 전송 핸들러 (Ref 기반 로직 판별)
  // -----------------------------------------------------------------------
  // 의존성 배열을 비워 함수가 절대 재생성되지 않도록 함 -> 녹음 훅 끊김 방지
  const handleSendAudio = useCallback(
    async () => {
      // 1. Ref 값을 통해 현재 상태를 즉시 확인 (Stale Closure 방지)
      if (
        isUnmountedRef.current ||
        isProcessingRef.current ||
        isAISpeakingRef.current ||
        isConversationEnded // 이미 끝났으면 무시
      ) {
        return;
      }

      // 2. 처리 중 상태로 변경
      isProcessingRef.current = true;
      setIsProcessing(true); // UI 반영
      setStatusText("답변을 분석 중입니다...");

      // 2초간 분석 시뮬레이션
      setTimeout(() => {
        if (isUnmountedRef.current) return;

        // 처리 완료
        isProcessingRef.current = false;
        setIsProcessing(false); // UI 반영

        // 턴 증가 (Ref 사용)
        turnCountRef.current += 1;
        const currentTurn = turnCountRef.current;
        console.log(`Turn Completed: ${currentTurn} / ${MAX_TURNS}`);

        // 종료 조건 체크
        if (currentTurn >= MAX_TURNS) {
          setIsConversationEnded(true);
          setStatusText("AI가 대화를 종료했습니다. 결과를 분석 중입니다...");

          setTimeout(() => {
            const dummyResult = {
              level: "B1",
              prevProgress: 40,
              currentProgress: 75,
              score: 850,
              isGuest: isGuestMode,
            };
            navigate("/ai-talk/level-test/result", { state: dummyResult });
          }, 2000);
        } else {
          // 다음 턴 AI 발화 시작
          setTimeout(() => {
            simulateAISpeaking();
          }, 500);
        }
      }, 2000);
    },
    // 의존성을 비워둠: 내부에서 Ref를 쓰므로 외부 값이 변해도 로직은 최신 값을 참조함
    [navigate, simulateAISpeaking, isConversationEnded, isGuestMode]
  );

  // -----------------------------------------------------------------------
  // [5] 녹음 훅
  // -----------------------------------------------------------------------
  const {
    start: startRecording,
    stop: stopRecording,
    isRecording,
    isTalking,
  } = useAITalkRecorder(handleSendAudio);

  // -----------------------------------------------------------------------
  // [6] 자동 녹음 제어 (State 변경에 따라 반응)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isConversationEnded && !isProcessing && !isAISpeaking && !isLoading) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [
    isConversationEnded,
    isProcessing,
    isAISpeaking,
    isLoading,
    startRecording,
    stopRecording,
  ]);

  // -----------------------------------------------------------------------
  // [7] 초기화
  // -----------------------------------------------------------------------
  useEffect(() => {
    isUnmountedRef.current = false;

    const initTest = () => {
      setIsLoading(true);
      setStatusText("AI와 연결 중입니다...");

      setTimeout(() => {
        setIsLoading(false);
        simulateAISpeaking(); // 첫 턴 시작
      }, 1500);
    };

    initTest();

    return () => {
      isUnmountedRef.current = true;
      stopRecording();
    };
  }, [simulateAISpeaking, stopRecording]);

  const handleExit = () => {
    if (window.confirm("테스트를 중단하시겠습니까?")) {
      navigate("/");
    }
  };

  // --- 렌더링 ---
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-rose-100/60 rounded-full blur-3xl pointer-events-none opacity-70" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-100/60 rounded-full blur-3xl pointer-events-none opacity-70" />

      {/* 헤더 */}
      <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <span className="bg-white/80 border border-gray-200 shadow-sm px-3 py-1 rounded-full text-xs font-bold text-rose-500 backdrop-blur-md">
            LEVEL TEST (DUMMY)
          </span>
        </div>
        <button
          onClick={handleExit}
          className="p-2.5 rounded-full bg-white/50 border border-gray-100 hover:bg-gray-100 transition shadow-sm text-gray-500 hover:text-gray-900 cursor-pointer"
        >
          <X size={24} />
        </button>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 relative">
        <div className="mb-12 sm:mb-20 text-center space-y-3 h-24 flex flex-col justify-end pb-4">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900 animate-fade-in">
            {isLoading
              ? "Loading..."
              : isConversationEnded
              ? "Test Completed"
              : isAISpeaking
              ? "Listening..."
              : "Your Turn"}
          </h2>
          <p className="text-gray-500 text-sm sm:text-lg font-medium transition-all duration-500 ease-in-out">
            {statusText}
          </p>
        </div>

        {/* 비주얼라이저 */}
        <div className="relative flex items-center justify-center">
          {isAISpeaking && (
            <>
              <div
                className="absolute w-48 h-48 sm:w-64 sm:h-64 bg-indigo-500/10 rounded-full animate-ping"
                style={{ animationDuration: "2s" }}
              />
              <div className="absolute w-40 h-40 sm:w-56 sm:h-56 bg-indigo-500/20 rounded-full animate-pulse" />
            </>
          )}

          {isRecording && !isAISpeaking && !isProcessing && (
            <>
              <div
                className={`absolute bg-rose-500/20 rounded-full transition-all duration-100 ease-out ${
                  isTalking
                    ? "w-52 h-52 sm:w-72 sm:h-72 opacity-100"
                    : "w-32 h-32 sm:w-40 sm:h-40 opacity-0"
                }`}
              />
              <div
                className={`absolute bg-rose-500/10 rounded-full transition-all duration-200 delay-75 ease-out ${
                  isTalking
                    ? "w-64 h-64 sm:w-80 sm:h-80 opacity-100"
                    : "w-32 h-32 sm:w-40 sm:h-40 opacity-0"
                }`}
              />
            </>
          )}

          <div
            className={`relative w-32 h-32 sm:w-44 sm:h-44 rounded-full flex items-center justify-center shadow-xl transition-all duration-500 border-4 
            ${
              isProcessing
                ? "bg-gray-100 border-gray-200"
                : isAISpeaking
                ? "bg-indigo-500 border-indigo-200 shadow-indigo-500/30 scale-105"
                : isTalking
                ? "bg-rose-500 border-rose-200 scale-110 shadow-rose-500/40"
                : "bg-white border-gray-100"
            }`}
          >
            {isProcessing ? (
              <Loader2 size={48} className="text-gray-400 animate-spin" />
            ) : isAISpeaking ? (
              <Ear size={48} className="text-white animate-pulse" />
            ) : (
              <Mic
                size={48}
                className={`transition-transform duration-100 ${
                  isTalking ? "text-white scale-110" : "text-gray-300"
                }`}
              />
            )}
          </div>
        </div>

        <div className="mt-20 text-center h-16">
          {!isAISpeaking &&
            !isProcessing &&
            !isLoading &&
            !isConversationEnded && (
              <p className="text-gray-400 text-sm animate-pulse">
                자유롭게 답변해주세요 (자동으로 감지합니다)
              </p>
            )}
        </div>
      </main>
    </div>
  );
};

export default LevelTestPage;
