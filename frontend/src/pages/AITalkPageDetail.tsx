// frontend/src/pages/AITalkPageDetail.tsx
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { Mic, Volume2, Languages, Loader2, AlertCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import FloatingFeedbackCard, {
  type FeedbackPayload,
} from "../components/FloatingFeedbackCard";
import { aiTalkService, type AIMessage } from "../services/aiTalkService";
import { useAITalkRecorder } from "../hooks/useAITalkRecorder"; // ✅ 커스텀 훅 Import

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
const FOOTER_HEIGHT = 96;
const LAST_MESSAGE_SPACING = 16;
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

      // 오디오가 없으면 녹음 시작 (훅 제어는 아래 useEffect에서 처리)
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
    console.log("AI 발화 종료");
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
        content: "🎤 ...",
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
  // [3] ✅ 커스텀 훅 사용 (녹음/VAD 로직 대체)
  // -----------------------------------------------------------------------
  const {
    start: startRecording,
    stop: stopRecording,
    isRecording,
    isTalking,
  } = useAITalkRecorder(handleSendAudio);

  // 상태에 따른 녹음기 제어 (Auto Start)
  useEffect(() => {
    // 대화 종료, 처리 중, AI 말하는 중, 로딩 중이 아니면 녹음 시작
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
      stopRecording(); // 언마운트 시 확실히 종료
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, navigate]);

  // 스크롤 자동 이동
  useEffect(() => {
    const el = listRef.current;
    if (el) {
      setTimeout(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }, 100);
    }
  }, [messages, isProcessing, isTalking]);

  const handleEndConversation = async () => {
    stopRecording();
    isUnmountedRef.current = true;
    if (sessionId) await aiTalkService.endSession(sessionId);
    navigate("/ai-talk");
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

  // --- 툴팁 로직 ---
  const updateCardPosition = useCallback((msgId: string) => {
    const node = bubbleRefs.current[msgId];
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const desiredWidth = Math.min(rect.width, viewportW * 0.92);
    const center = rect.left + rect.width / 2;
    let left = center - desiredWidth / 2;
    left = Math.max(8, Math.min(left, viewportW - desiredWidth - 8));
    const estimatedCardHeight = 180;
    const safeBottom = FOOTER_HEIGHT + 8;
    const spaceBelow = viewportH - rect.bottom - safeBottom;
    const spaceAbove = rect.top;

    const preferAbove = spaceAbove >= estimatedCardHeight + TOOLTIP_GAP_ABOVE;

    if (!preferAbove && spaceBelow < estimatedCardHeight + TOOLTIP_GAP_BELOW) {
      const maxAllowedTop = Math.max(
        8,
        viewportH -
          safeBottom -
          Math.min(estimatedCardHeight, Math.max(0, spaceBelow))
      );
      setCardPos({
        top: Math.min(rect.bottom + TOOLTIP_GAP_BELOW, maxAllowedTop),
        left,
        width: desiredWidth,
        preferAbove: false,
      });
    } else {
      const top = preferAbove
        ? rect.top - TOOLTIP_GAP_ABOVE
        : rect.bottom + TOOLTIP_GAP_BELOW;
      setCardPos({ top, left, width: desiredWidth, preferAbove });
    }
  }, []);

  function onWordInteract(
    msgId: string,
    wordIndex: number,
    feedback?: FeedbackPayload
  ) {
    if (!feedback?.errors?.find((e) => e.index === wordIndex)) return;
    setActiveTooltipMsgId(msgId);
    setActiveTooltipWordIndexes([wordIndex]);
    requestAnimationFrame(() => updateCardPosition(msgId));
  }

  function onSentenceInteract(msgId: string, feedback?: FeedbackPayload) {
    if (!feedback?.errors?.find((e) => e.type === "style")) return;
    setActiveTooltipMsgId(msgId);
    setActiveTooltipWordIndexes([]);
    requestAnimationFrame(() => updateCardPosition(msgId));
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
    <div className="h-screen flex flex-col bg-white">
      <audio
        ref={audioPlayerRef}
        className="hidden"
        onEnded={handleAIThinkingEnd}
      />

      <header
        ref={headerRef}
        className="w-full bg-white shrink-0 border-b border-gray-100"
      >
        <div className="max-w-5xl mx-auto flex items-center gap-4 px-4 sm:px-6 py-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-[19px] sm:text-[22px] font-semibold text-gray-900 truncate">
              {isLoading ? (
                <span className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  준비 중...
                </span>
              ) : (
                scenarioTitle
              )}
            </h1>
          </div>
          <button
            onClick={handleEndConversation}
            className="ml-3 inline-flex items-center gap-2 rounded-md bg-rose-50 text-rose-700 px-3 py-2 text-sm font-medium hover:bg-rose-100 shadow-sm"
          >
            대화 종료
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden" aria-live="polite">
        <div
          ref={listRef}
          className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 overflow-y-auto flex flex-col gap-6"
          style={{
            minHeight: 0,
            height: listHeight,
            paddingBottom: LAST_MESSAGE_SPACING,
          }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
              <p>AI가 대화를 준비하고 있어요...</p>
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
                    className={`relative flex items-start ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div className="flex-1 max-w-[88%] sm:max-w-[70%]">
                      <div
                        ref={(el) => {
                          bubbleRefs.current[m.id] = el;
                        }}
                        className={`rounded-xl px-3 py-2 text-[15px] sm:text-[18px] leading-snug wrap-break-word 
                        ${
                          isUser
                            ? "bg-rose-500 text-white"
                            : "bg-gray-100 text-gray-800"
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
                            styleError && isUser ? "bg-yellow-50/20" : ""
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

                                let cls = "rounded-sm px-0.5 inline-block ";
                                if (err) {
                                  cls += "cursor-pointer ";
                                  if (err.type === "word")
                                    cls +=
                                      "bg-blue-600/30 underline decoration-2 ";
                                  else if (err.type === "grammar")
                                    cls +=
                                      "bg-purple-600/30 underline decoration-dotted ";
                                  else if (err.type === "spelling")
                                    cls +=
                                      "bg-orange-500/30 underline decoration-wavy ";
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

                        {m.role === "ai" && (
                          <div className="flex gap-3 mt-2">
                            <button
                              onClick={() => playAudioData(null)}
                              className="inline-flex items-center text-gray-400 hover:text-gray-600"
                            >
                              <Volume2 size={18} />
                            </button>
                            <button
                              onClick={() => console.log(m.content)}
                              className="inline-flex items-center text-gray-400 hover:text-gray-600"
                            >
                              <Languages size={18} />
                            </button>
                          </div>
                        )}

                        {styleError && isUser && (
                          <div className="mt-2 flex items-center gap-2 text-yellow-900">
                            <AlertCircle size={16} />
                            <span className="text-[14px]">
                              문장 전체 스타일 개선 필요
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isProcessing && !isAISpeaking && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-xl px-4 py-3 text-gray-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>생각하는 중...</span>
                  </div>
                </div>
              )}

              {isConversationEnded && (
                <div className="flex justify-center my-6">
                  <span className="bg-gray-200 text-gray-600 px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                    대화가 종료되었습니다.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer
        className="fixed inset-x-0 bottom-0 bg-white/95 backdrop-blur-sm z-40"
        style={{ height: FOOTER_HEIGHT }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="h-full flex items-center justify-center gap-4">
            <div
              className={`relative w-16 h-16 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-300
                ${
                  isRecording
                    ? isTalking
                      ? "bg-rose-500 ring-4 ring-rose-300 ring-offset-2 scale-110"
                      : "bg-rose-400 ring-2 ring-rose-200"
                    : isProcessing
                    ? "bg-gray-400"
                    : isAISpeaking
                    ? "bg-blue-400"
                    : "bg-gray-300"
                }
              `}
            >
              {isRecording ? (
                <Mic size={30} className={isTalking ? "animate-pulse" : ""} />
              ) : isProcessing ? (
                <Loader2 size={30} className="animate-spin" />
              ) : isAISpeaking ? (
                <Volume2 size={30} className="animate-pulse" />
              ) : (
                <Mic size={30} />
              )}
            </div>
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
    </div>
  );
};

export default AITalkPageDetail;
