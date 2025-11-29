import React, {
  useMemo,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Loader2,
  Trophy,
  MessageCircle,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  X,
} from "lucide-react";

// API 서비스 import
import {
  getConversationDetail,
  type ConversationDetailResponse,
} from "../services/userService";

// --- FloatingFeedbackCard.tsx 로직 통합 시작 ---

// 타입 정의
export type ErrorType = "word" | "grammar" | "spelling" | "style";

export type FeedbackError = {
  index: number | null;
  word: string | null;
  type: ErrorType;
  message: string;
};

export type FeedbackPayload = {
  errors: FeedbackError[];
  explanation: string;
  suggestion: string;
};

type FloatingCardProps = {
  show: boolean;
  top: number;
  left: number;
  width: number; // 호환성을 위해 유지
  onClose: () => void;
  mobile: boolean;
  feedback?: FeedbackPayload;
  activeWordIndexes: number[];
  isAbove?: boolean;
};

function FloatingFeedbackCard({
  show,
  top,
  left,
  onClose,
  mobile,
  feedback,
  activeWordIndexes,
  isAbove = false,
}: FloatingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isStyleOnly = activeWordIndexes.length === 0;

  // [데스크톱] 화면 밖으로 나가는 것 방지 및 위치 보정
  useEffect(() => {
    if (show && cardRef.current && !mobile) {
      const rect = cardRef.current.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const headerHeight = 80;

      // 1. 상단 침범 시 -> 헤더 아래로 강제 이동 (주로 isAbove가 false일 때)
      if (rect.top < headerHeight) {
        // 보조 로직 (주석 처리된 상태로 유지)
      }

      // 2. 하단 침범 시 -> 뷰포트 위로 올림 (주로 isAbove가 false일 때)
      if (rect.bottom > viewportH - 20) {
        // 보조 로직 (주석 처리된 상태로 유지)
      }
    }
  }, [show, top, mobile, isAbove]);

  function onCardClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  const cardStyle: React.CSSProperties = mobile
    ? {
        // 모바일: 중앙 정렬
        top: "50%",
        left: "50%",
        width: "92vw",
        maxWidth: "92vw",
        maxHeight: "70vh",
        transform: "translate(-50%, -50%)",
        overflowY: "auto",
      }
    : {
        // 데스크톱: 절대 좌표
        top: top,
        left: left,
        width: "360px",
        maxWidth: "92vw",
        maxHeight: "60vh",
        overflowY: "auto",
        transform: isAbove ? "translateY(-100%)" : "none",
      };

  if (!show) return null;

  return (
    <>
      {/* 모바일 배경 오버레이 (투명, 클릭 시 닫기 기능만 유지) */}
      {mobile && (
        <div
          className="fixed inset-0 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* 피드백 카드 */}
      <div
        ref={cardRef}
        className="fixed z-50 animate-in fade-in zoom-in-95 duration-200"
        style={cardStyle}
        onClick={onCardClick}
      >
        <div className="relative rounded-3xl border border-rose-100 bg-white shadow-2xl shadow-rose-100/50 p-5 overflow-hidden">
          {/* 장식용 배경 */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

          {/* 헤더 */}
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-full ${
                  isStyleOnly
                    ? "bg-amber-100 text-amber-600"
                    : "bg-rose-100 text-rose-600"
                }`}
              >
                {isStyleOnly ? (
                  <Lightbulb size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
              </div>
              <span className="font-bold text-gray-900 text-sm">
                {isStyleOnly ? "표현 개선 제안" : "단어/문법 피드백"}
              </span>
            </div>

            {/* 닫기 버튼 (모바일에서만 표시) */}
            {mobile && (
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                type="button"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {!feedback ? (
            <div className="text-sm text-gray-500 py-4 text-center">
              피드백 정보를 불러올 수 없습니다.
            </div>
          ) : (
            <div className="space-y-4 relative z-10">
              {isStyleOnly ? (
                <>
                  <div className="text-[15px] text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    {feedback.errors.find((e) => e.type === "style")?.message}
                  </div>

                  {feedback.suggestion && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5">
                      <div className="flex items-start gap-3">
                        <div className="bg-emerald-100 p-1 rounded-full mt-0.5 shrink-0">
                          <CheckCircle2
                            className="text-emerald-600"
                            size={14}
                          />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-emerald-700 block mb-1">
                            더 자연스러운 표현
                          </span>
                          <p className="text-[15px] font-medium text-gray-800">
                            {feedback.suggestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {feedback.explanation && (
                    <div className="flex gap-3 pl-1">
                      <div className="w-0.5 bg-gray-200 rounded-full" />
                      <p className="text-sm text-gray-500 leading-relaxed">
                        {feedback.explanation}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {activeWordIndexes.map((wIdx) => {
                    const errs = feedback.errors.filter(
                      (e) => e.index === wIdx
                    );
                    return (
                      <div key={`tip-${wIdx}`} className="space-y-4">
                        {errs.map((e, j) => (
                          <div
                            key={`err-${wIdx}-${j}`}
                            className="bg-rose-50 rounded-2xl p-3.5 border border-rose-100"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-white text-rose-600 px-2 py-0.5 rounded-full border border-rose-100">
                                {e.type}
                              </span>
                              {typeof e.word === "string" && (
                                <span className="text-sm font-bold text-rose-800">
                                  "{e.word}"
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 ml-1">
                              {e.message}
                            </p>
                          </div>
                        ))}

                        {feedback.suggestion && (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5">
                            <div className="flex items-start gap-3">
                              <div className="bg-emerald-100 p-1 rounded-full mt-0.5 shrink-0">
                                <CheckCircle2
                                  className="text-emerald-600"
                                  size={14}
                                />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-emerald-700 block mb-1">
                                  올바른 표현
                                </span>
                                <p className="text-[15px] font-medium text-gray-800">
                                  {feedback.suggestion}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {feedback.explanation && (
                          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-2xl leading-relaxed">
                            💡 {feedback.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
// --- FloatingFeedbackCard.tsx 로직 통합 종료 ---

// --- HistoryAI.tsx 로직 통합 시작 ---

// --- 타입 정의 ---
export interface ConversationMessage {
  id: string | number;
  role: "user" | "ai" | "assistant";
  content: string;
  timestamp?: string | Date;
  feedback?: string | FeedbackPayload;
  audioUrl?: string;
}

// --- 토큰 타입 정의 ---
interface Token {
  token: string;
  index: number;
}

// 메시지 처리 후의 타입 정의
interface ProcessedMessage extends ConversationMessage {
  feedbackObj?: FeedbackPayload;
  tokens: Token[];
  isUser: boolean;
  roleStr: "User" | "AI" | "assistant";
}

// 💡 푸터 높이를 변수로 정의
const FOOTER_HEIGHT = "60px";

// --- 유틸리티: 텍스트 토큰화 ---
function tokenizeWithIndices(text: string): Token[] {
  const parts = text.split(/(\s+)/);
  const tokens: Token[] = [];
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

/* -----------------------------
   날짜 포맷 유틸 (HistoryTraining과 동일한 스타일)
   ----------------------------- */
const formatDateKorean = (iso: string | Date | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

/**
 * AI 컴포넌트의 렌더링 로직을 HistoryAI 페이지 내부 함수로 통합 (AIRenderer)
 */
interface AIRenderProps {
  processedMessages: ProcessedMessage[];
  generalFeedback?: string;
  isMobile: boolean;
  handleWordInteraction: (
    rect: DOMRect,
    msgId: string,
    index: number,
    feedback?: FeedbackPayload
  ) => void;
  handleSentenceInteraction: (
    rect: DOMRect,
    msgId: string,
    feedback?: FeedbackPayload
  ) => void;
  handleMouseLeave: () => void;
}

function AIRenderer({
  processedMessages,
  generalFeedback,
  isMobile,
  handleWordInteraction,
  handleSentenceInteraction,
  handleMouseLeave,
}: AIRenderProps) {
  return (
    <div className="flex flex-col gap-6 pb-4">
      {processedMessages.map((m) => {
        const styleError = m.feedbackObj?.errors?.find(
          (e) => e.type === "style"
        );

        // 웹(데스크톱) 환경에서만 호버/리브 이벤트를 사용
        const useHoverForStyle = !isMobile && styleError && m.isUser;
        const useClickForStyle = isMobile && styleError && m.isUser;

        return (
          <div
            key={m.id}
            className={`relative flex items-end gap-2 ${
              m.isUser ? "justify-end" : "justify-start"
            }`}
          >
            {/* AI Avatar */}
            {!m.isUser && (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mb-1 border border-indigo-200">
                <span className="text-xs font-bold text-indigo-600">AI</span>
              </div>
            )}

            <div
              className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                m.isUser ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`rounded-2xl px-4 py-3 text-[15px] sm:text-base leading-relaxed shadow-sm
                  ${
                    m.isUser
                      ? "bg-rose-500 text-white"
                      : "bg-white text-gray-800 border border-gray-200"
                  } 
                  ${
                    styleError && m.isUser
                      ? "ring-2 ring-yellow-300 " +
                        (useHoverForStyle || useClickForStyle
                          ? "cursor-pointer"
                          : "")
                      : ""
                  }`}
                // 1. 문장(Style Error) 상호작용 - 마우스가 버블에 들어왔을 때 (웹 호버)
                onMouseEnter={(e) => {
                  if (useHoverForStyle) {
                    handleSentenceInteraction(
                      e.currentTarget.getBoundingClientRect(),
                      String(m.id),
                      m.feedbackObj
                    );
                  }
                }}
                // 2. 문장/단어 상호작용 - 마우스가 버블에서 나갔을 때 (툴팁 닫기)
                onMouseLeave={handleMouseLeave}
                // 3. 모바일 문장(Style Error) 상호작용 - 클릭 시
                onClick={(e) => {
                  if (useClickForStyle) {
                    handleSentenceInteraction(
                      e.currentTarget.getBoundingClientRect(),
                      String(m.id),
                      m.feedbackObj
                    );
                  }
                }}
              >
                <div
                  className={`whitespace-pre-wrap wrap-break-word ${
                    styleError && m.isUser
                      ? "bg-yellow-400/20 rounded px-1 -mx-1"
                      : ""
                  }`}
                >
                  {m.isUser ? (
                    <span>
                      {m.tokens.map(({ token, index }: Token, i: number) => {
                        if (index === -1) return <span key={i}>{token}</span>;

                        const err = m.feedbackObj?.errors?.find(
                          (e) => e.index === index && e.type !== "style"
                        );

                        let cls =
                          "inline-block rounded px-0.5 transition-colors ";

                        if (err) {
                          cls += !isMobile
                            ? "cursor-pointer "
                            : "cursor-pointer ";
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
                              if (err && !isMobile) {
                                // ⭐️ [핵심 수정] 단어 호버 시 버블 onMouseEnter 방지
                                e.stopPropagation();
                                handleWordInteraction(
                                  e.currentTarget.getBoundingClientRect(),
                                  String(m.id),
                                  index,
                                  m.feedbackObj
                                );
                              }
                            }}
                            onClick={(e) => {
                              if (err && isMobile) {
                                e.stopPropagation();
                                handleWordInteraction(
                                  e.currentTarget.getBoundingClientRect(),
                                  String(m.id),
                                  index,
                                  m.feedbackObj
                                );
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

              {/* Style Feedback Indicator */}
              {styleError && m.isUser && (
                <div className="mt-1 mr-1 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                  <AlertCircle size={12} />
                  <span className="font-medium">표현 개선 제안</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* 전체 총평 (General Feedback) */}
      {generalFeedback && (
        <div className="mt-6 mx-4 p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
            💡 AI 총평
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {generalFeedback}
          </p>
        </div>
      )}
    </div>
  );
}

// --- HistoryAI 페이지 컴포넌트 ---

export default function HistoryAI() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  // 데이터 상태
  const [data, setData] = useState<ConversationDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 툴팁 상태 관리
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

  // 모바일 감지
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // 툴팁 닫기
  const closeTooltip = useCallback(() => {
    setActiveTooltipMsgId(null);
    setActiveTooltipWordIndexes([]);
  }, []);

  // 마우스 리브 핸들러: 툴팁을 닫습니다. (웹 호버 기능용)
  const handleMouseLeave = () => {
    if (!isMobile) {
      closeTooltip();
    }
  };

  // 데이터 fetch
  useEffect(() => {
    async function fetchConversation() {
      if (!sessionId) return;
      setIsLoading(true);
      try {
        const response = await getConversationDetail(sessionId);
        setData(response);
      } catch (error) {
        console.error("데이터 로딩 중 에러 발생:", error);
      } finally {
        if (!isUnmountedRef.current) setIsLoading(false);
      }
    }

    const isUnmountedRef = { current: false };
    fetchConversation();

    return () => {
      isUnmountedRef.current = true;
    };
  }, [sessionId]);

  // DB 데이터를 UI 포맷으로 변환 및 가공
  const uiMessages: ProcessedMessage[] = useMemo(() => {
    if (!data) return [];

    // DB 데이터를 UI 포맷의 메시지 배열로 변환
    // NOTE: ConversationMessageDetail 타입에 'timestamp' 프로퍼티가 없다는 TS 오류를 피하기 위해
    // 직접 존재하는 필드(createdAt 등)만 사용하거나 timestamp를 포함하지 않습니다.
    const baseMessages: ConversationMessage[] = data.messages.map((msg) => ({
      id: String(msg.messageId),
      role: msg.role === "ai" ? "ai" : "user",
      content: msg.content,
      feedback: msg.feedback ? JSON.stringify(msg.feedback) : undefined,
      // timestamp 필드를 직접 매핑하지 않음 (타입 정의에 존재하지 않음)
    }));

    // AI 컴포넌트의 useMemo 로직을 여기에 통합하여 최종 처리된 메시지 목록 생성
    return baseMessages.map((msg) => {
      let feedbackObj: FeedbackPayload | undefined = undefined;
      if (typeof msg.feedback === "string") {
        try {
          feedbackObj = JSON.parse(msg.feedback);
        } catch (e) {
          /* ignore */
        }
      } else {
        feedbackObj = msg.feedback as FeedbackPayload | undefined;
      }

      const isUser = msg.role === "user";
      // 유저 메시지만 토큰화 진행
      const tokens = isUser
        ? tokenizeWithIndices(msg.content)
        : [{ token: msg.content, index: -1 }];

      const roleStr: ProcessedMessage["roleStr"] = isUser ? "User" : "AI";

      return {
        ...msg,
        feedbackObj,
        tokens,
        isUser,
        roleStr,
      } as ProcessedMessage;
    });
  }, [data]);

  // 툴팁 위치 계산 (AITalkPageDetail 로직 참고)
  const updateCardPosition = useCallback((rect: DOMRect) => {
    const viewportW = window.innerWidth;

    // 툴팁의 너비를 메시지 버블 너비에 맞추거나, 뷰포트 너비의 92%로 제한
    const desiredWidth = Math.min(rect.width, viewportW * 0.92);
    // 툴팁의 너비를 고정된 값(360px)과 비교하여 작은 값으로 제한 (FloatingFeedbackCard의 스타일과 맞춤)
    const effectiveWidth = Math.min(desiredWidth, 360);

    const center = rect.left + rect.width / 2;
    let left = center - effectiveWidth / 2;
    // 뷰포트 경계를 벗어나지 않도록 조정 (8px 패딩)
    left = Math.max(8, Math.min(left, viewportW - effectiveWidth - 8));

    const estimatedCardHeight = 260;
    const headerHeight = 64;
    const TOOLTIP_GAP_ABOVE = 6;

    const spaceAbove = rect.top - headerHeight;

    // 툴팁을 위에 배치할지 결정
    const preferAbove = spaceAbove >= estimatedCardHeight + TOOLTIP_GAP_ABOVE;

    let top;
    if (preferAbove) {
      top = rect.top - TOOLTIP_GAP_ABOVE;
    } else {
      const TOOLTIP_GAP_BELOW = 12;
      top = rect.bottom + TOOLTIP_GAP_BELOW;
    }

    setCardPos({
      top,
      left,
      width: effectiveWidth, // 고정값으로 전달
      preferAbove,
    });
  }, []);

  // 단어 클릭/호버 핸들러
  const handleWordClick = useCallback(
    (
      rect: DOMRect,
      msgId: string,
      wordIndex: number,
      _feedback?: FeedbackPayload
    ) => {
      setActiveTooltipMsgId(msgId);
      setActiveTooltipWordIndexes([wordIndex]);
      if (!isMobile) updateCardPosition(rect);
      else {
        // 모바일은 위치 고정 방식이므로 좌표를 0으로
        setCardPos({ top: 0, left: 0, width: 0, preferAbove: false });
      }
    },
    [isMobile, updateCardPosition]
  );

  // 문장 클릭/호버 핸들러
  const handleSentenceClick = useCallback(
    (rect: DOMRect, msgId: string, _feedback?: FeedbackPayload) => {
      setActiveTooltipMsgId(msgId);
      setActiveTooltipWordIndexes([]); // 빈 배열은 전체 문장(스타일 오류)을 의미
      if (!isMobile) updateCardPosition(rect);
      else {
        // 모바일은 위치 고정 방식이므로 좌표를 0으로
        setCardPos({ top: 0, left: 0, width: 0, preferAbove: false });
      }
    },
    [isMobile, updateCardPosition]
  );

  // 뒤로가기 핸들러 (HistoryTraining과 동일한 동작)
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/my/history");
    }
  };

  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
      </div>
    );
  }

  // 데이터 없음 상태 처리
  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">대화 기록을 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate("/my/history")}
            className="text-rose-500 font-bold hover:underline"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const displayDate = data.completedAt || data.startedAt;

  // 현재 활성화된 툴팁의 피드백 데이터 찾기
  const activeMessage = uiMessages.find((m) => m.id === activeTooltipMsgId);
  const parsedActiveFeedback = activeMessage?.feedbackObj;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header: HistoryTraining과 동일한 레이아웃/스타일 적용 */}
      <header className="w-full bg-white/80 backdrop-blur-md shrink-0 border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
              aria-label="뒤로가기"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                회화 기록 상세
              </h1>
              <p className="text-xs text-gray-500">
                {formatDateKorean(displayDate)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 pt-6 pb-20 mb-2.0">
        {/* 요약 정보 카드 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none opacity-60" />

          <div className="relative z-10">
            <div className="flex flex-col gap-1 mb-4">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                TOPIC
              </span>
              <h2 className="text-2xl font-black text-gray-900 leading-tight">
                {data.topic}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {data.scenarioDescription}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100">
              {data.overallScore !== undefined &&
                data.overallScore !== null && (
                  <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-amber-700">
                      {data.overallScore}점
                    </span>
                  </div>
                )}

              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <MessageCircle className="w-4 h-4" />
                <span>총 {data.totalMessages}마디</span>
              </div>

              {/* 날짜 정보 제거: TOPIC 카드에서 날짜 표시를 제거했습니다 */}
            </div>
          </div>
        </div>

        {/* 대화 내용 (AI 컴포넌트 로직) */}
        <AIRenderer
          processedMessages={uiMessages}
          generalFeedback={data.generalFeedback}
          isMobile={isMobile}
          handleWordInteraction={handleWordClick}
          handleSentenceInteraction={handleSentenceClick}
          handleMouseLeave={handleMouseLeave}
        />
      </main>

      {/* Floating Feedback Card */}
      <FloatingFeedbackCard
        show={Boolean(activeTooltipMsgId)}
        top={cardPos.top}
        left={cardPos.left}
        width={cardPos.width}
        onClose={closeTooltip}
        mobile={isMobile}
        feedback={parsedActiveFeedback}
        activeWordIndexes={activeTooltipWordIndexes}
        isAbove={cardPos.preferAbove}
      />

      {/* Footer 컴포넌트 */}
      <footer
        className="w-full bg-white border-t border-gray-200 shrink-0 fixed bottom-0 left-0 right-0 z-20 shadow-lg"
        style={{ height: FOOTER_HEIGHT }}
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-full flex items-center justify-center">
          <p className="text-sm text-gray-500 text-center">
            이 대화는 과거 학습 기록입니다. 피드백을 확인해보세요.
          </p>
        </div>
      </footer>
    </div>
  );
}
