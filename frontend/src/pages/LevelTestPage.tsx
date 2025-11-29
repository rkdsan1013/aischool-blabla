// frontend/src/pages/LevelTestPage.tsx
// cspell:ignore CEFR Cefr
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  Loader2,
  X,
  Ear,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAITalkRecorder } from "../hooks/useAITalkRecorder";
import { useProfile } from "../hooks/useProfile";

// --- 상수: CEFR 레벨 정보 ---
const CEFR_LEVELS = [
  { level: "A1", label: "입문", desc: "단어 위주 소통" },
  { level: "A2", label: "초급", desc: "간단한 일상 대화" },
  { level: "B1", label: "중급", desc: "여행/직무 기초 회화" },
  { level: "B2", label: "중상급", desc: "자연스러운 토론" },
  { level: "C1", label: "상급", desc: "전문적인 업무 회화" },
  { level: "C2", label: "최상급", desc: "원어민 수준 유창성" },
];

const DUMMY_AI_AUDIO_DURATION = 3000;
const MAX_TURNS = 1;

const LevelTestPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, isProfileLoading } = useProfile();
  const isLoggedIn = !!profile;
  const isGuestMode = !isLoggedIn;

  const turnCountRef = useRef(0);
  const isProcessingRef = useRef(false);
  const isAISpeakingRef = useRef(false);
  const isUnmountedRef = useRef(false);

  const [testStep, setTestStep] = useState<"selection" | "test">("selection");
  const [selectedCefr, setSelectedCefr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isConversationEnded, setIsConversationEnded] = useState(false);
  const [statusText, setStatusText] = useState("테스트 준비 중...");
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    if (isProfileLoading) return;
    if (isLoggedIn) {
      setTestStep("test");
    } else {
      setTestStep("selection");
    }
  }, [isProfileLoading, isLoggedIn]);

  const simulateAISpeaking = useCallback(() => {
    isAISpeakingRef.current = true;
    setStatusText("AI가 질문하고 있습니다...");
    setIsAISpeaking(true);

    setTimeout(() => {
      if (isUnmountedRef.current) return;
      isAISpeakingRef.current = false;
      setIsAISpeaking(false);
      setStatusText("답변을 말씀해주세요");
    }, DUMMY_AI_AUDIO_DURATION);
  }, []);

  const handleSendAudio = useCallback(async () => {
    if (
      isUnmountedRef.current ||
      isProcessingRef.current ||
      isAISpeakingRef.current ||
      isConversationEnded ||
      testStep === "selection"
    ) {
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    setStatusText("답변을 분석 중입니다...");

    setTimeout(() => {
      if (isUnmountedRef.current) return;
      isProcessingRef.current = false;
      setIsProcessing(false);

      turnCountRef.current += 1;
      const currentTurn = turnCountRef.current;

      if (currentTurn >= MAX_TURNS) {
        setIsConversationEnded(true);
        setStatusText("대화 종료. 분석 중...");
        setTimeout(() => {
          const dummyResult = {
            level: selectedCefr || "A1",
            prevProgress: 0,
            currentProgress: 10,
            isGuest: isGuestMode,
            selectedBaseLevel: selectedCefr,
          };
          navigate("/ai-talk/level-test/result", { state: dummyResult });
        }, 2000);
      } else {
        setTimeout(() => simulateAISpeaking(), 500);
      }
    }, 2000);
  }, [
    navigate,
    simulateAISpeaking,
    isConversationEnded,
    isGuestMode,
    testStep,
    selectedCefr,
  ]);

  const {
    start: startRecording,
    stop: stopRecording,
    isTalking,
  } = useAITalkRecorder(handleSendAudio);

  useEffect(() => {
    if (
      testStep === "test" &&
      !isConversationEnded &&
      !isProcessing &&
      !isAISpeaking &&
      !isLoading
    ) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [
    testStep,
    isConversationEnded,
    isProcessing,
    isAISpeaking,
    isLoading,
    startRecording,
    stopRecording,
  ]);

  useEffect(() => {
    if (testStep !== "test") return;
    isUnmountedRef.current = false;
    const startTestSequence = () => {
      setIsLoading(true);
      setStatusText("AI와 연결 중입니다...");
      setTimeout(() => {
        setIsLoading(false);
        simulateAISpeaking();
      }, 1500);
    };
    startTestSequence();
    return () => {
      isUnmountedRef.current = true;
      stopRecording();
    };
  }, [testStep, simulateAISpeaking, stopRecording]);

  const handleLevelSelect = (level: string) => {
    setSelectedCefr(level);
  };

  const handleStartTest = () => {
    if (!selectedCefr) return;
    setTestStep("test");
  };

  const handleExitRequest = () => {
    setShowExitModal(true);
  };

  const handleConfirmExit = () => {
    stopRecording();
    navigate("/");
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  if (isProfileLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-gray-900 flex flex-col relative">
      {/* --- 배경 레이어 (파동 관련 스타일 및 요소 모두 제거됨) --- */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-200/40 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-3xl opacity-60" />
      </div>

      {/* --- 헤더 --- */}
      <header className="sticky top-0 left-0 w-full z-50">
        <div className="max-w-5xl mx-auto h-14 px-4 sm:px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="bg-white/80 border border-white/50 shadow-sm px-3 py-1 rounded-full text-xs font-bold text-rose-500 backdrop-blur-md">
              LEVEL TEST
            </span>
          </div>
          <button
            onClick={handleExitRequest}
            className="p-2 -mr-2 rounded-full hover:bg-white/20 transition-colors text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
      </header>

      {/* --- 메인 컨텐츠 --- */}
      <main className="relative z-10 w-full flex-1 flex flex-col max-w-5xl mx-auto px-4 sm:px-6">
        {/* Step 1: 레벨 선택 */}
        {testStep === "selection" && (
          <>
            <div className="flex-1 pt-8 pb-32">
              <div className="flex flex-col items-center animate-fade-in max-w-4xl mx-auto">
                <div className="text-center mb-10">
                  <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-3">
                    예상 레벨을 선택해주세요
                  </h2>
                  <p className="text-gray-500 text-sm sm:text-lg">
                    가장 가깝다고 생각되는 단계를 골라주세요.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full">
                  {CEFR_LEVELS.map((item) => (
                    <button
                      key={item.level}
                      onClick={() => handleLevelSelect(item.level)}
                      className={`group relative flex flex-col items-start p-5 sm:p-6 rounded-3xl border-2 transition-all duration-300 text-left hover:shadow-xl active:scale-95 ${
                        selectedCefr === item.level
                          ? "border-rose-500 bg-white/90 ring-2 ring-rose-200 scale-[1.02] shadow-lg z-10"
                          : "border-transparent bg-white/60 hover:bg-white hover:border-rose-100"
                      }`}
                    >
                      <div className="flex justify-between items-start w-full mb-3">
                        <span
                          className={`text-xl sm:text-3xl font-black ${
                            selectedCefr === item.level
                              ? "text-rose-600"
                              : "text-gray-400 group-hover:text-rose-300"
                          }`}
                        >
                          {item.level}
                        </span>
                        {selectedCefr === item.level && (
                          <div className="bg-rose-500 text-white rounded-full p-1 animate-scale-in shadow-sm">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                      </div>

                      <h3 className="font-bold text-base sm:text-xl text-gray-900 mb-1">
                        {item.label}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 break-keep leading-relaxed opacity-90">
                        {item.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full p-6 z-50 flex justify-center pointer-events-none">
              <div className="w-full max-w-5xl pointer-events-auto">
                <div className="flex justify-center">
                  <button
                    onClick={handleStartTest}
                    disabled={!selectedCefr}
                    className={`w-full sm:w-auto sm:px-16 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl flex items-center justify-center gap-2 transform active:scale-[0.98] backdrop-blur-sm ${
                      selectedCefr
                        ? "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200"
                        : "bg-white/50 text-gray-400 border border-white/20 cursor-not-allowed"
                    }`}
                  >
                    <span>테스트 시작하기</span>
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 2: 테스트 진행 */}
        {testStep === "test" && (
          <div className="flex-1 flex flex-col justify-center items-center py-10 animate-fade-in relative w-full overflow-hidden">
            <div className="flex-none flex flex-col items-center justify-center mb-10 text-center">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-3">
                {isLoading
                  ? "연결 중..."
                  : isConversationEnded
                  ? "테스트 완료"
                  : isAISpeaking
                  ? "잘 들어보세요"
                  : "말씀해주세요"}
              </h2>
              <p className="text-gray-500 text-base sm:text-xl font-medium animate-pulse">
                {statusText}
              </p>
            </div>

            {/* 중앙 컨트롤 (파동 관련 요소 및 스타일 모두 제거) */}
            <div
              className={`relative flex items-center justify-center`}
              style={{ minHeight: 380 }}
            >
              <div
                className={`control-center relative w-40 h-40 sm:w-60 sm:h-60 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 border-[6px] sm:border-8 ${
                  isProcessing
                    ? "bg-white/80 border-gray-200"
                    : isAISpeaking
                    ? "bg-indigo-500 border-indigo-300 shadow-indigo-500/40 scale-105"
                    : isTalking
                    ? "bg-rose-500 border-rose-300 scale-110 shadow-rose-500/50"
                    : "bg-white/80 border-white/50"
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-16 h-16 sm:w-24 sm:h-24 text-gray-400 animate-spin" />
                ) : isAISpeaking ? (
                  <Ear className="w-16 h-16 sm:w-24 sm:h-24 text-white animate-pulse" />
                ) : (
                  <Mic
                    className={`w-16 h-16 sm:w-24 sm:h-24 transition-transform duration-100 ${
                      isTalking ? "text-white scale-110" : "text-gray-300"
                    }`}
                  />
                )}
              </div>
            </div>

            <div className="mt-16 w-full flex justify-center pointer-events-none">
              {!isConversationEnded && (
                <div className="flex items-center gap-2 text-gray-600 bg-white/60 px-5 py-2.5 rounded-full backdrop-blur-md border border-white/40 shadow-sm animate-pulse">
                  <HelpCircle size={16} />
                  <span className="text-sm font-medium">
                    자유롭게 답변해주세요
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Exit modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCancelExit}
          />

          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={28} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                테스트를 중단할까요?
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed break-keep">
                지금 나가시면 현재까지 진행된
                <br />
                테스트 내용은 저장되지 않습니다.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirmExit}
                className="w-full py-3.5 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 active:scale-[0.98] transition-all"
              >
                네, 중단할게요
              </button>
              <button
                onClick={handleCancelExit}
                className="w-full py-3.5 bg-white text-gray-600 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                계속 진행하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LevelTestPage;
