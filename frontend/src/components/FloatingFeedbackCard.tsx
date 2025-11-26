// frontend/src/components/FloatingFeedbackCard.tsx
import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

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
  width: number; // ✅ 부모 컴포넌트 호환성을 위해 타입은 유지 (실제 사용은 안 함)
  onClose: () => void;
  mobile: boolean;
  feedback?: FeedbackPayload;
  activeWordIndexes: number[]; // [] => sentence-level(style) feedback
  isAbove?: boolean;
};

export default function FloatingFeedbackCard({
  show,
  top,
  left,
  // width, // ✅ [수정] 사용하지 않는 변수 제거 (ESLint 에러 해결)
  onClose,
  mobile,
  feedback,
  activeWordIndexes,
  isAbove = false,
}: Props) {
  const isStyleOnly = activeWordIndexes.length === 0;

  function onCardClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  // 스타일 계산 로직
  const cardStyle: React.CSSProperties = {
    top,
    left: mobile ? "50%" : left, // 모바일은 중앙 정렬
    width: mobile ? "92vw" : "auto", // 모바일은 꽉 차게, 데스크탑은 auto
    minWidth: mobile ? "unset" : "320px", // 데스크탑 최소 너비 보장
    maxWidth: "92vw",
    // 모바일이면 X축 중앙 정렬(-50%), 위쪽 배치면 Y축 위로(-100%)
    transform: `translate(${mobile ? "-50%" : "0"}, ${
      isAbove ? "-100%" : "0"
    })`,
  };

  return (
    <>
      {/* 모바일 배경 오버레이 (터치 시 닫기) */}
      {mobile && show && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* 피드백 카드 */}
      <div
        className={`fixed z-50 transition-opacity duration-150 ${
          show ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={cardStyle}
        onClick={onCardClick}
      >
        <div className="relative rounded-lg border border-gray-200 bg-white shadow-xl px-4 py-3">
          {!feedback ? null : (
            <div className="space-y-3">
              {isStyleOnly ? (
                // 문장 전체 스타일 피드백
                <>
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      className="text-yellow-500 shrink-0 mt-0.5"
                      size={20}
                    />
                    <div className="text-[15px] text-gray-800 leading-snug">
                      <div className="font-bold mb-1">STYLE: 문장 전체</div>
                      <div className="text-gray-700">
                        {
                          feedback.errors.find((e) => e.type === "style")
                            ?.message
                        }
                      </div>
                    </div>
                  </div>
                  {feedback.suggestion && (
                    <div className="flex items-start gap-3 bg-emerald-50/50 p-2 rounded-md">
                      <CheckCircle2
                        className="text-emerald-600 shrink-0 mt-0.5"
                        size={20}
                      />
                      <div className="text-[15px]">
                        <span className="font-bold text-gray-900 block mb-1">
                          교정 문장
                        </span>
                        <span className="text-gray-800">
                          {feedback.suggestion}
                        </span>
                      </div>
                    </div>
                  )}
                  {feedback.explanation && (
                    <div className="text-[13px] text-gray-500 pl-8 border-l-2 border-gray-100">
                      {feedback.explanation}
                    </div>
                  )}
                </>
              ) : (
                // 단어별 피드백
                <>
                  {activeWordIndexes.map((wIdx) => {
                    const errs = feedback.errors.filter(
                      (e) => e.index === wIdx
                    );
                    return (
                      <div key={`tip-${wIdx}`} className="space-y-3">
                        {errs.map((e, j) => (
                          <div
                            key={`err-${wIdx}-${j}`}
                            className="flex items-start gap-3"
                          >
                            <AlertCircle
                              className="text-rose-500 shrink-0 mt-0.5"
                              size={20}
                            />
                            <div className="text-[15px] text-gray-800 leading-snug">
                              <div className="font-bold mb-1">
                                {e.type.toUpperCase()}
                                {typeof e.word === "string"
                                  ? `: ${e.word}`
                                  : ""}
                              </div>
                              <div className="text-gray-700">{e.message}</div>
                            </div>
                          </div>
                        ))}
                        {feedback.suggestion && (
                          <div className="flex items-start gap-3 bg-emerald-50/50 p-2 rounded-md">
                            <CheckCircle2
                              className="text-emerald-600 shrink-0 mt-0.5"
                              size={20}
                            />
                            <div className="text-[15px]">
                              <span className="font-bold text-gray-900 block mb-1">
                                교정 제안
                              </span>
                              <span className="text-gray-800">
                                {feedback.suggestion}
                              </span>
                            </div>
                          </div>
                        )}
                        {feedback.explanation && (
                          <div className="text-[13px] text-gray-500 pl-8 border-l-2 border-gray-100">
                            {feedback.explanation}
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
