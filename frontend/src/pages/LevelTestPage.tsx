// frontend/src/pages/LevelTestPage.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Loader2, X, Ear } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { aiTalkService } from "../services/aiTalkService";
import { useAITalkRecorder } from "../hooks/useAITalkRecorder";

// --- 상수 설정 ---
const DEFAULT_LEVEL_TEST_SCENARIO_ID = 17;

const LevelTestPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const scenarioId =
    (location.state?.scenarioId as number) || DEFAULT_LEVEL_TEST_SCENARIO_ID;

  // --- UI Refs ---
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const isUnmountedRef = useRef(false);

  // --- 상태 관리 ---
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isConversationEnded, setIsConversationEnded] = useState(false);

  // 테스트 진행 상태 텍스트
  const [statusText, setStatusText] = useState("테스트 준비 중...");

  // -----------------------------------------------------------------------
  // [1] 오디오 재생 (AI)
  // -----------------------------------------------------------------------
  const playAudioData = useCallback(
    (base64Audio: string | null | undefined) => {
      if (isUnmountedRef.current) return;

      if (!base64Audio || !audioPlayerRef.current) {
        setIsAISpeaking(false);
        return;
      }

      try {
        const player = audioPlayerRef.current;
        player.src = `data:audio/mp3;base64,${base64Audio}`;

        setStatusText("AI가 질문하고 있습니다...");
        setIsAISpeaking(true);

        player.play().catch((e) => {
          console.error("Autoplay blocked:", e);
          setIsAISpeaking(false);
        });
      } catch (error) {
        console.error("Failed to play audio:", error);
        setIsAISpeaking(false);
      }
    },
    []
  );

  const handleAIThinkingEnd = () => {
    if (isUnmountedRef.current) return;
    setIsAISpeaking(false);
    setStatusText("답변을 말씀해주세요");
  };

  // -----------------------------------------------------------------------
  // [2] 메시지 전송 핸들러
  // -----------------------------------------------------------------------
  const handleSendAudio = useCallback(
    async (audioBlob: Blob) => {
      if (!sessionId || isUnmountedRef.current || isProcessing) return;

      setIsProcessing(true);
      setStatusText("답변을 분석 중입니다...");

      try {
        const { audioData, ended } = await aiTalkService.sendAudioMessage(
          sessionId,
          audioBlob
        );

        if (isUnmountedRef.current) return;

        if (ended) {
          setIsConversationEnded(true);
          setStatusText("테스트가 종료되었습니다.");
          if (audioData) playAudioData(audioData);
        } else {
          if (audioData) {
            playAudioData(audioData);
          } else {
            setIsProcessing(false);
            setStatusText("답변을 말씀해주세요");
          }
        }
      } catch (error) {
        console.error("음성 전송 실패:", error);
        setStatusText("오류가 발생했습니다. 다시 말씀해주세요.");
      } finally {
        if (!isUnmountedRef.current) setIsProcessing(false);
      }
    },
    [sessionId, playAudioData, isProcessing]
  );

  // -----------------------------------------------------------------------
  // [3] 커스텀 훅 사용 (녹음/VAD)
  // -----------------------------------------------------------------------
  const {
    start: startRecording,
    stop: stopRecording,
    isRecording,
    isTalking,
  } = useAITalkRecorder(handleSendAudio);

  useEffect(() => {
    if (
      !isConversationEnded &&
      !isProcessing &&
      !isAISpeaking &&
      !isLoading &&
      sessionId
    ) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [
    isConversationEnded,
    isProcessing,
    isAISpeaking,
    isLoading,
    sessionId,
    startRecording,
    stopRecording,
  ]);

  // -----------------------------------------------------------------------
  // [4] 초기화
  // -----------------------------------------------------------------------
  useEffect(() => {
    isUnmountedRef.current = false;

    const initTest = async () => {
      try {
        setIsLoading(true);
        setStatusText("AI와 연결 중입니다...");

        const { session, audioData } = await aiTalkService.startSession(
          scenarioId
        );
        setSessionId(session.session_id);

        if (audioData) {
          playAudioData(audioData);
        } else {
          setStatusText("답변을 말씀해주세요");
        }
      } catch (error) {
        console.error(error);
        alert("레벨 테스트를 시작할 수 없습니다.");
        navigate("/");
      } finally {
        if (!isUnmountedRef.current) setIsLoading(false);
      }
    };

    initTest();

    return () => {
      isUnmountedRef.current = true;
      stopRecording();
      if (sessionId) {
        aiTalkService.endSession(sessionId).catch(console.error);
      }
    };
  }, [scenarioId, navigate, sessionId, stopRecording, playAudioData]);

  const handleExit = () => {
    if (
      window.confirm(
        "테스트를 중단하시겠습니까? 결과가 저장되지 않을 수 있습니다."
      )
    ) {
      stopRecording();
      // 루트로 이동 (라우터 설정에 따라 게스트->랜딩, 유저->홈 으로 이동됨)
      navigate("/");
    }
  };

  // --- 렌더링 ---
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col relative overflow-hidden">
      {/* 배경 장식 (밝은 톤의 은은한 그라데이션) */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-rose-100/60 rounded-full blur-3xl pointer-events-none opacity-70" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-100/60 rounded-full blur-3xl pointer-events-none opacity-70" />

      {/* 오디오 엘리먼트 (숨김) */}
      <audio
        ref={audioPlayerRef}
        className="hidden"
        onEnded={handleAIThinkingEnd}
      />

      {/* 헤더 */}
      <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <span className="bg-white/80 border border-gray-200 shadow-sm px-3 py-1 rounded-full text-xs font-bold text-rose-500 backdrop-blur-md">
            LEVEL TEST
          </span>
        </div>
        {/* X 버튼: z-index 확보 및 클릭 영역 보장 */}
        <button
          onClick={handleExit}
          className="p-2.5 rounded-full bg-white/50 border border-gray-100 hover:bg-gray-100 transition shadow-sm text-gray-500 hover:text-gray-900 cursor-pointer"
          aria-label="나가기"
        >
          <X size={24} />
        </button>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 relative">
        {/* 상태 메시지 */}
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

        {/* 중앙 마이크 비주얼라이저 */}
        <div className="relative flex items-center justify-center">
          {/* 1. AI 말할 때: 파란색/보라색 파동 */}
          {isAISpeaking && (
            <>
              <div
                className="absolute w-48 h-48 sm:w-64 sm:h-64 bg-indigo-500/10 rounded-full animate-ping"
                style={{ animationDuration: "2s" }}
              />
              <div className="absolute w-40 h-40 sm:w-56 sm:h-56 bg-indigo-500/20 rounded-full animate-pulse" />
            </>
          )}

          {/* 2. 유저 녹음 중 (VAD 감지 시): 붉은색(Rose) 파동 */}
          {isRecording && !isAISpeaking && !isProcessing && (
            <>
              <div
                className={`absolute bg-rose-500/20 rounded-full transition-all duration-100 ease-out
                  ${
                    isTalking
                      ? "w-52 h-52 sm:w-72 sm:h-72 opacity-100"
                      : "w-32 h-32 sm:w-40 sm:h-40 opacity-0"
                  }
                `}
              />
              <div
                className={`absolute bg-rose-500/10 rounded-full transition-all duration-200 delay-75 ease-out
                  ${
                    isTalking
                      ? "w-64 h-64 sm:w-80 sm:h-80 opacity-100"
                      : "w-32 h-32 sm:w-40 sm:h-40 opacity-0"
                  }
                `}
              />
            </>
          )}

          {/* 메인 원형 컨테이너 */}
          <div
            className={`relative w-32 h-32 sm:w-44 sm:h-44 rounded-full flex items-center justify-center shadow-xl transition-all duration-500 border-4 
              ${
                isProcessing
                  ? "bg-gray-100 border-gray-200"
                  : isAISpeaking
                  ? "bg-indigo-500 border-indigo-200 shadow-indigo-500/30 scale-105"
                  : isTalking
                  ? "bg-rose-500 border-rose-200 scale-110 shadow-rose-500/40"
                  : "bg-white border-gray-100" // 대기 상태
              }
            `}
          >
            {/* 아이콘 표시 */}
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

        {/* 하단 보조 텍스트 / 버튼 */}
        <div className="mt-20 text-center h-16">
          {!isAISpeaking &&
            !isProcessing &&
            !isLoading &&
            !isConversationEnded && (
              <p className="text-gray-400 text-sm animate-pulse">
                자유롭게 답변해주세요 (자동으로 감지합니다)
              </p>
            )}
          {isConversationEnded && (
            <button
              onClick={() => navigate("/")}
              className="mt-2 bg-rose-500 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-rose-600 transition shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
              결과 확인하러 가기
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default LevelTestPage;
