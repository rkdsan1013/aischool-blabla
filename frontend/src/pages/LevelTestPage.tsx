// frontend/src/pages/LevelTestPage.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Loader2, X, Ear } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAITalkRecorder } from "../hooks/useAITalkRecorder";

// --- 더미 데이터 및 상수 ---
const DUMMY_AI_AUDIO_DURATION = 3000;
const MAX_TURNS = 3; // 더미 테스트: 3번 대화 후 종료 (사용자에게는 보이지 않음)

const LevelTestPage: React.FC = () => {
  const navigate = useNavigate();

  // --- 상태 관리 ---
  const [turnCount, setTurnCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isConversationEnded, setIsConversationEnded] = useState(false);
  const [statusText, setStatusText] = useState("테스트 준비 중...");

  const isGuestMode = true;
  const isUnmountedRef = useRef(false);

  // [DEBUG] 턴 진행 상황 콘솔 출력 (turnCount 미사용 경고 방지 및 디버깅)
  useEffect(() => {
    console.log(`Current Turn: ${turnCount} (Hidden from UI)`);
  }, [turnCount]);

  // -----------------------------------------------------------------------
  // [1] 더미 AI 발화 시뮬레이션
  // -----------------------------------------------------------------------
  const simulateAISpeaking = useCallback(() => {
    setStatusText("AI가 질문하고 있습니다...");
    setIsAISpeaking(true);

    setTimeout(() => {
      if (isUnmountedRef.current) return;
      setIsAISpeaking(false);
      setStatusText("답변을 말씀해주세요");
    }, DUMMY_AI_AUDIO_DURATION);
  }, []);

  // -----------------------------------------------------------------------
  // [2] 더미 메시지 전송 핸들러
  // -----------------------------------------------------------------------
  const handleSendAudio = useCallback(async () => {
    if (isUnmountedRef.current || isProcessing || isAISpeaking) return;

    setIsProcessing(true);
    setStatusText("답변을 분석 중입니다...");

    // 2초간 분석 시뮬레이션
    setTimeout(() => {
      if (isUnmountedRef.current) return;
      setIsProcessing(false);

      setTurnCount((prev) => {
        const nextTurn = prev + 1;

        // 더미 로직: 일정 횟수 이상이면 AI가 종료 판단을 내린 것으로 간주
        if (nextTurn >= MAX_TURNS) {
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

          return nextTurn;
        } else {
          // 대화 계속 진행
          setTimeout(() => {
            simulateAISpeaking();
          }, 500);
          return nextTurn;
        }
      });
    }, 2000);
  }, [isProcessing, isAISpeaking, navigate, simulateAISpeaking, isGuestMode]);

  // -----------------------------------------------------------------------
  // [3] 녹음 훅
  // -----------------------------------------------------------------------
  const {
    start: startRecording,
    stop: stopRecording,
    isRecording,
    isTalking,
  } = useAITalkRecorder(handleSendAudio);

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
  // [4] 초기화
  // -----------------------------------------------------------------------
  useEffect(() => {
    isUnmountedRef.current = false;
    const initTest = () => {
      setIsLoading(true);
      setStatusText("AI와 연결 중입니다...");
      setTimeout(() => {
        setIsLoading(false);
        simulateAISpeaking();
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
          {/* ✅ 수정: 고정된 카운트 표시(Question X/Y) 제거 */}

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
          {/* AI 말하기 상태: 파란색/보라색 파동 */}
          {isAISpeaking && (
            <>
              <div
                className="absolute w-48 h-48 sm:w-64 sm:h-64 bg-indigo-500/10 rounded-full animate-ping"
                style={{ animationDuration: "2s" }}
              />
              <div className="absolute w-40 h-40 sm:w-56 sm:h-56 bg-indigo-500/20 rounded-full animate-pulse" />
            </>
          )}

          {/* 유저 말하기 상태: 붉은색 파동 */}
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

          {/* 중앙 원형 컨테이너 */}
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
