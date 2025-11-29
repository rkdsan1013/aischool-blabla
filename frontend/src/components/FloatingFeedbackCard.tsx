// frontend/src/components/FloatingFeedbackCard.tsx
import React, { useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Lightbulb, X } from "lucide-react";

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

type Props = {
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

export default function FloatingFeedbackCard({
  show,
  top,
  left,
  onClose,
  mobile,
  feedback,
  activeWordIndexes,
  isAbove = false,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isStyleOnly = activeWordIndexes.length === 0;

  // [데스크톱] 화면 밖으로 나가는 것 방지
  useEffect(() => {
    if (show && cardRef.current && !mobile) {
      const rect = cardRef.current.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const headerHeight = 80;

      // 1. 상단 침범 시 -> 헤더 아래로 강제 이동
      if (rect.top < headerHeight) {
        if (isAbove) {
          cardRef.current.style.top = `${headerHeight + rect.height}px`;
        } else {
          cardRef.current.style.top = `${headerHeight}px`;
        }
      }

      // 2. 하단 침범 시 -> 뷰포트 위로 올림
      if (rect.bottom > viewportH - 20) {
        if (!isAbove) {
          cardRef.current.style.top = `${viewportH - 20 - rect.height}px`;
        }
      }
    }
  }, [show, top, mobile, isAbove]);

  function onCardClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
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
