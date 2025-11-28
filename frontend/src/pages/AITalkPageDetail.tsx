// frontend/src/pages/AITalkPageDetail.tsx
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import {
  Mic,
  Volume2,
  Loader2,
  AlertCircle,
  ChevronLeft,
  AlertTriangle,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import FloatingFeedbackCard, {
  type FeedbackPayload,
} from "../components/FloatingFeedbackCard";
import { aiTalkService, type AIMessage } from "../services/aiTalkService";
import { useAITalkRecorder } from "../hooks/useAITalkRecorder";

// --- 타입 정의 ---
type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  audioUrl?: string;
  feedback?: FeedbackPayload;
};

// --- 유틸리티 ---
function tokenizeWithIndices(text: string): { token: string; index: number }[] {
  const parts = text.split(/(\s+)/);
  const tokens: { token: string; index: number }[] = [];
  let wordIndex = 0;
  for (const part of parts) {
    if (/\s+/.test(part)) {
      tokens.push({ token: part, index: -1 });
    } else {
      tokens.push({ token: part, index: wordIndex });
      wordIndex++;
    }
  }
  return tokens;
}

function isMobileUA(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(
    ua
  );
}

// --- 상수 설정 ---
const FOOTER_HEIGHT = 100;
const LAST_MESSAGE_SPACING = 24;
const TOOLTIP_GAP_BELOW = 12;
const TOOLTIP_GAP_ABOVE = 6;

const AITalkPageDetail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId as number | undefined;

  // --- UI Refs ---
  const headerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const bubbleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // --- 상태 관리 ---
  const [scenarioTitle, setScenarioTitle] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isConversationEnded, setIsConversationEnded] = useState(false);

  // 종료 확인 모달 상태
  const [showExitModal, setShowExitModal] = useState(false);

  const isUnmountedRef = useRef(false);
  const isMobile = isMobileUA();

  // --- 툴팁 상태 ---
  const [activeTooltipMsgId, setActiveTooltipMsgId] = useState<string | null>(
    null
  );
  const [activeTooltipWordIndexes, setActiveTooltipWordIndexes] = useState<
    number[]
  >([]);
  const [cardPos, setCardPos] = useState({
    top: 0,
    left: 0,
    width: 0,
    preferAbove: false,
  });

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
  };

  // -----------------------------------------------------------------------
  // [2] 메시지 전송 핸들러
  // -----------------------------------------------------------------------
  const handleSendAudio = useCallback(
    async (audioBlob: Blob) => {
      if (!sessionId || isUnmountedRef.current || isProcessing) return;

      setIsProcessing(true);

      const tempUserMsgId = `temp-${Date.now()}`;
      const newUserMsg: Message = {
        id: tempUserMsgId,
        role: "user",
        content: "🎤 음성 인식 중...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newUserMsg]);

      try {
        const { userMessage, aiMessage, audioData, ended } =
          await aiTalkService.sendAudioMessage(sessionId, audioBlob);

        if (isUnmountedRef.current) return;

        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMsgId);
          return [
            ...filtered,
            {
              id: String(userMessage.message_id),
              role: userMessage.sender_role,
              content: userMessage.content,
              timestamp: new Date(userMessage.created_at),
              feedback: userMessage.feedback as FeedbackPayload | undefined,
            },
            {
              id: String(aiMessage.message_id),
              role: aiMessage.sender_role,
              content: aiMessage.content,
              timestamp: new Date(aiMessage.created_at),
            },
          ];
        });

        if (ended) {
          setIsConversationEnded(true);
          if (audioData) playAudioData(audioData);
        } else {
          if (audioData) {
            playAudioData(audioData);
          } else {
            setIsProcessing(false);
          }
        }
      } catch (error) {
        console.error("음성 전송 실패:", error);
        if (!isUnmountedRef.current) {
          setMessages((prev) => prev.filter((m) => m.id !== tempUserMsgId));
        }
      } finally {
        if (!isUnmountedRef.current) setIsProcessing(false);
      }
    },
    [sessionId, playAudioData, isProcessing]
  );

  // -----------------------------------------------------------------------
  // [3] 커스텀 훅 사용
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

    if (!scenarioId) {
      alert("잘못된 접근입니다.");
      navigate("/ai-talk", { replace: true });
      return;
    }

    const initConversation = async () => {
      try {
        setIsLoading(true);
        const scenarioData = await aiTalkService.getScenarioById(scenarioId);
        setScenarioTitle(scenarioData.title);

        const { session, initialMessages, audioData } =
          await aiTalkService.startSession(scenarioId);
        setSessionId(session.session_id);

        const formatted = initialMessages.map((m: AIMessage) => ({
          id: String(m.message_id),
          role: m.sender_role,
          content: m.content,
          timestamp: new Date(m.created_at),
          feedback: m.feedback as FeedbackPayload | undefined,
        }));
        setMessages(formatted);

        if (audioData) {
          playAudioData(audioData);
        }
      } catch (error) {
        console.error(error);
        navigate("/ai-talk");
      } finally {
        if (!isUnmountedRef.current) setIsLoading(false);
      }
    };

    initConversation();

    return () => {
      isUnmountedRef.current = true;
      stopRecording();
    };
    // [수정됨] 의존성 배열에 playAudioData, stopRecording 추가
  }, [scenarioId, navigate, playAudioData, stopRecording]);

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      setTimeout(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }, 100);
    }
  }, [messages, isProcessing, isTalking]);

  // 뒤로가기 핸들러
  const handleBackClick = () => {
    if (isConversationEnded) {
      navigate(-1);
      return;
    }
    setShowExitModal(true);
  };

  // 모달 확인 핸들러
  const handleConfirmExit = async () => {
    stopRecording();
    isUnmountedRef.current = true;
    if (sessionId) {
      try {
        await aiTalkService.endSession(sessionId);
      } catch (error) {
        console.error("세션 종료 중 오류:", error);
      }
    }
    navigate(-1);
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  // --- 레이아웃/UI ---
  const getHeaderHeight = useCallback(() => {
    if (headerRef.current)
      return headerRef.current.getBoundingClientRect().height;
    return 64;
  }, []);

  const [listHeight, setListHeight] = useState("calc(100vh - 160px)");
  const adjustLayout = useCallback(() => {
    setListHeight(`calc(100vh - ${getHeaderHeight() + FOOTER_HEIGHT}px)`);
  }, [getHeaderHeight]);

  useEffect(() => {
    adjustLayout();
    window.addEventListener("resize", adjustLayout);
    return () => window.removeEventListener("resize", adjustLayout);
  }, [adjustLayout]);

  // --- 툴팁 위치 로직 (데스크톱 전용) ---
  const updateCardPosition = useCallback((msgId: string) => {
    const node = bubbleRefs.current[msgId];
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const viewportW = window.innerWidth;
    // const viewportH = window.innerHeight; // [수정됨] spaceBelow 제거로 미사용

    const desiredWidth = Math.min(rect.width, viewportW * 0.92);
    const center = rect.left + rect.width / 2;
    let left = center - desiredWidth / 2;
    left = Math.max(8, Math.min(left, viewportW - desiredWidth - 8));

    const estimatedCardHeight = 260;
    const headerHeight = 80;
    // const safeBottom = FOOTER_HEIGHT + 8; // [수정됨] spaceBelow 제거로 미사용

    // const spaceBelow = viewportH - rect.bottom - safeBottom; // [수정됨] 제거
    const spaceAbove = rect.top - headerHeight;

    const preferAbove = spaceAbove >= estimatedCardHeight + TOOLTIP_GAP_ABOVE;

    let top;
    if (preferAbove) {
      top = rect.top - TOOLTIP_GAP_ABOVE;
    } else {
      top = rect.bottom + TOOLTIP_GAP_BELOW;
    }

    setCardPos({
      top,
      left,
      width: desiredWidth,
      preferAbove,
    });
  }, []);

  function onWordInteract(
    msgId: string,
    wordIndex: number,
    feedback?: FeedbackPayload
  ) {
    if (!feedback?.errors?.find((e) => e.index === wordIndex)) return;
    setActiveTooltipMsgId(msgId);
    setActiveTooltipWordIndexes([wordIndex]);
    if (!isMobile) requestAnimationFrame(() => updateCardPosition(msgId));
  }

  function onSentenceInteract(msgId: string, feedback?: FeedbackPayload) {
    if (!feedback?.errors?.find((e) => e.type === "style")) return;
    setActiveTooltipMsgId(msgId);
    setActiveTooltipWordIndexes([]);
    if (!isMobile) requestAnimationFrame(() => updateCardPosition(msgId));
  }

  function closeTooltip() {
    setActiveTooltipMsgId(null);
    setActiveTooltipWordIndexes([]);
  }

  const memoizedTokens = useMemo(() => {
    const map: Record<string, { token: string; index: number }[]> = {};
    for (const m of messages) {
      if (m.role === "user") map[m.id] = tokenizeWithIndices(m.content);
      else map[m.id] = [{ token: m.content, index: -1 }];
    }
    return map;
  }, [messages]);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <audio
        ref={audioPlayerRef}
        className="hidden"
        onEnded={handleAIThinkingEnd}
      />

      {/* Header */}
      <header
        ref={headerRef}
        className="w-full bg-white/80 backdrop-blur-md shrink-0 border-b border-gray-200 sticky top-0 z-30"
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleBackClick}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
              aria-label="뒤로 가기"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {isLoading ? "연결 중..." : scenarioTitle}
            </h1>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-hidden relative" aria-live="polite">
        <div
          ref={listRef}
          className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 overflow-y-auto flex flex-col gap-6 scrollbar-hide"
          style={{
            minHeight: 0,
            height: listHeight,
            paddingBottom: LAST_MESSAGE_SPACING,
          }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center animate-pulse">
                  <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
                </div>
              </div>
              <p className="text-sm font-medium">
                AI가 대화를 준비하고 있어요...
              </p>
            </div>
          ) : (
            <>
              {messages.map((m) => {
                const isUser = m.role === "user";
                const tokens = memoizedTokens[m.id];
                const styleError = m.feedback?.errors?.find(
                  (e) => e.type === "style"
                );

                return (
                  <div
                    key={m.id}
                    className={`relative flex items-end gap-2 ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mb-1 border border-indigo-200">
                        <span className="text-xs font-bold text-indigo-600">
                          AI
                        </span>
                      </div>
                    )}

                    <div
                      className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                        isUser ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        ref={(el) => {
                          bubbleRefs.current[m.id] = el;
                        }}
                        className={`rounded-2xl px-4 py-3 text-[15px] sm:text-base leading-relaxed shadow-sm
                        ${
                          isUser
                            ? "bg-rose-500 text-white rounded-tr-none"
                            : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                        } 
                        ${
                          styleError && isUser
                            ? "ring-2 ring-yellow-300 cursor-pointer"
                            : ""
                        }`}
                        onMouseEnter={() => {
                          if (!isMobile && styleError && isUser)
                            onSentenceInteract(m.id, m.feedback);
                        }}
                        onMouseLeave={() => {
                          if (!isMobile) closeTooltip();
                        }}
                        onClick={() => {
                          if (isMobile && styleError && isUser)
                            onSentenceInteract(m.id, m.feedback);
                        }}
                      >
                        <div
                          className={`whitespace-pre-wrap wrap-break-word ${
                            styleError && isUser
                              ? "bg-yellow-400/20 rounded px-1 -mx-1"
                              : ""
                          }`}
                        >
                          {isUser ? (
                            <span>
                              {tokens.map(({ token, index }, i) => {
                                if (index === -1)
                                  return <span key={i}>{token}</span>;

                                const err = m.feedback?.errors?.find(
                                  (e) => e.index === index && e.type !== "style"
                                );

                                let cls =
                                  "inline-block rounded px-0.5 transition-colors ";
                                if (err) {
                                  cls += "cursor-pointer ";
                                  if (err.type === "word")
                                    cls +=
                                      "bg-red-400/40 underline decoration-red-200 decoration-2";
                                  else if (err.type === "grammar")
                                    cls +=
                                      "bg-yellow-400/40 underline decoration-yellow-200 decoration-2";
                                  else if (err.type === "spelling")
                                    cls +=
                                      "bg-orange-400/40 underline decoration-orange-200 decoration-2";
                                }
                                return (
                                  <span
                                    key={i}
                                    className={cls}
                                    onMouseEnter={(e) => {
                                      if (err) {
                                        e.stopPropagation();
                                        if (!isMobile)
                                          onWordInteract(
                                            m.id,
                                            index,
                                            m.feedback
                                          );
                                      }
                                    }}
                                    onClick={(e) => {
                                      if (err && isMobile) {
                                        e.stopPropagation();
                                        onWordInteract(m.id, index, m.feedback);
                                      }
                                    }}
                                  >
                                    {token}
                                  </span>
                                );
                              })}
                            </span>
                          ) : (
                            <span>{m.content}</span>
                          )}
                        </div>
                      </div>

                      {/* AI Message Controls */}
                      {m.role === "ai" && (
                        <div className="flex gap-2 mt-1 ml-1">
                          <button
                            onClick={() => playAudioData(null)}
                            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-indigo-500 transition-colors"
                            title="다시 듣기"
                          >
                            <Volume2 size={16} />
                          </button>
                        </div>
                      )}

                      {/* User Style Feedback Indicator */}
                      {styleError && isUser && (
                        <div className="mt-1 mr-1 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                          <AlertCircle size={12} />
                          <span className="font-medium">표현 개선 제안</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isProcessing && !isAISpeaking && (
                <div className="flex justify-start items-end gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mb-1 border border-indigo-200">
                    <span className="text-xs font-bold text-indigo-600">
                      AI
                    </span>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                </div>
              )}

              {isConversationEnded && (
                <div className="flex justify-center my-6">
                  <span className="bg-gray-100 text-gray-500 px-4 py-2 rounded-full text-xs font-medium border border-gray-200">
                    대화가 종료되었습니다.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer
        className="fixed inset-x-0 bottom-0 z-40 pointer-events-none"
        style={{ height: FOOTER_HEIGHT }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-white via-white/90 to-transparent pointer-events-none" />

        <div className="relative h-full max-w-2xl mx-auto px-4 sm:px-6 flex items-center justify-center pb-4 pointer-events-auto">
          <div
            className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer
              ${
                isRecording
                  ? isTalking
                    ? "bg-rose-500 scale-110 shadow-rose-500/40 ring-4 ring-rose-200"
                    : "bg-rose-400 shadow-rose-400/30"
                  : isProcessing
                  ? "bg-white border-2 border-gray-100 shadow-sm"
                  : isAISpeaking
                  ? "bg-indigo-500 shadow-indigo-500/40 ring-4 ring-indigo-200"
                  : "bg-white border border-gray-200 shadow-md hover:shadow-lg hover:border-rose-200 group"
              }
            `}
            onClick={() => {
              if (!isRecording && !isProcessing && !isAISpeaking) {
                startRecording();
              } else if (isRecording) {
                stopRecording();
              }
            }}
          >
            {isRecording ? (
              <Mic
                size={32}
                className={`text-white ${isTalking ? "animate-pulse" : ""}`}
              />
            ) : isProcessing ? (
              <Loader2 size={32} className="text-rose-500 animate-spin" />
            ) : isAISpeaking ? (
              <Volume2 size={32} className="text-white animate-pulse" />
            ) : (
              <Mic
                size={32}
                className="text-gray-400 group-hover:text-rose-500 transition-colors"
              />
            )}

            {isRecording && isTalking && (
              <span className="absolute inset-0 rounded-full animate-ping bg-rose-400 opacity-20"></span>
            )}
          </div>
        </div>
      </footer>

      <FloatingFeedbackCard
        show={Boolean(activeTooltipMsgId)}
        top={cardPos.top}
        left={cardPos.left}
        width={cardPos.width}
        onClose={closeTooltip}
        mobile={isMobile}
        feedback={messages.find((mm) => mm.id === activeTooltipMsgId)?.feedback}
        activeWordIndexes={activeTooltipWordIndexes}
        isAbove={cardPos.preferAbove}
      />

      {/* 종료 확인 모달 */}
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
                대화를 종료하시겠습니까?
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed break-keep">
                지금 나가시면 대화가 저장되지 않을 수 있습니다.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirmExit}
                className="w-full py-3.5 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 active:scale-95 transition-all"
              >
                종료하고 나가기
              </button>
              <button
                onClick={handleCancelExit}
                className="w-full py-3.5 bg-white text-gray-600 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 active:scale-95 transition-all"
              >
                계속 대화하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITalkPageDetail;
