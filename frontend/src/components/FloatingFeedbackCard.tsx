import React from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

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
  width: number; // 이 값은 이제 position 계산의 참조용으로만 사용하거나 무시합니다.
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

  // ✅ [수정] 스타일 계산 로직 분리
  // 1. 데스크탑: 말풍선 위치(left)를 따르되, 최소 너비(320px)를 보장합니다.
  // 2. 모바일: 말풍선 너비와 상관없이 화면 중앙에 넓게(92vw) 띄웁니다.
  const cardStyle: React.CSSProperties = {
    top,
    left: mobile ? "50%" : left, // 모바일은 무조건 중앙 정렬
    width: mobile ? "92vw" : "auto", // 모바일은 꽉 차게, 데스크탑은 내용물에 맞게
    minWidth: mobile ? "unset" : "320px", // ✅ [핵심] 데스크탑에서 최소 너비 보장 (짧은 스크립트 대응)
    maxWidth: "92vw", // 화면 밖으로 나가는 것 방지

    // Transform 로직:
    // - isAbove가 true면 Y축 -100% (위로 올림)
    // - mobile이면 X축 -50% (중앙 정렬 보정)
    transform: `translate(${mobile ? "-50%" : "0"}, ${
      isAbove ? "-100%" : "0"
    })`,
  };

  return (
    <>
      {mobile && show && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed z-50 transition-opacity duration-150 ${
          show ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={cardStyle}
        onClick={onCardClick}
      >
        <div className="relative rounded-lg border border-gray-200 bg-white shadow-xl px-4 py-3">
          {mobile && (
            <button
              type="button"
              aria-label="닫기"
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 z-50"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          )}

          {!feedback ? null : (
            <div className="space-y-3">
              {isStyleOnly ? (
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
