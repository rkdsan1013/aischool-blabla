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
  width: number;
  onClose: () => void;
  mobile: boolean;
  feedback?: FeedbackPayload;
  activeWordIndexes: number[]; // [] => sentence-level(style) feedback
  isAbove?: boolean; // ✅ [추가] 카드가 말풍선 위에 있는지 여부
};

export default function FloatingFeedbackCard({
  show,
  top,
  left,
  width,
  onClose,
  mobile,
  feedback,
  activeWordIndexes,
  isAbove = false, // ✅ [추가] 기본값 false
}: Props) {
  const isStyleOnly = activeWordIndexes.length === 0;

  function onCardClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

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
        style={{
          top,
          left,
          width,
          maxWidth: "92vw",
          // ✅ [수정] 위쪽 배치일 경우(isAbove=true), 현재 top 위치(말풍선 바로 위)를 기준으로
          // 자신의 높이만큼 위로(-100%) 이동시킵니다. 이렇게 하면 카드 높이가 유동적이어도 딱 붙습니다.
          transform: isAbove ? "translateY(-100%)" : "none",
        }}
        onClick={onCardClick}
      >
        <div className="relative rounded-lg border border-gray-200 bg-white shadow-md px-3 py-2">
          {mobile && (
            <button
              type="button"
              aria-label="닫기"
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          )}

          {!feedback ? null : (
            <div className="space-y-2">
              {isStyleOnly ? (
                <>
                  <div className="flex items-start gap-2">
                    <AlertCircle
                      className="text-yellow-500 flex-shrink-0"
                      size={18}
                    />
                    <div className="text-[14px] text-gray-800">
                      <div className="font-semibold">STYLE: 문장 전체</div>
                      <div className="text-gray-700">
                        {
                          feedback.errors.find((e) => e.type === "style")
                            ?.message
                        }
                      </div>
                    </div>
                  </div>
                  {feedback.suggestion && (
                    <div className="flex items-start gap-2">
                      <CheckCircle2
                        className="text-emerald-600 flex-shrink-0"
                        size={18}
                      />
                      <div className="text-[14px]">
                        <span className="font-semibold text-gray-800">
                          교정 문장:{" "}
                        </span>
                        <span className="text-gray-700">
                          {feedback.suggestion}
                        </span>
                      </div>
                    </div>
                  )}
                  {feedback.explanation && (
                    <div className="text-[13px] text-gray-600">
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
                      <div key={`tip-${wIdx}`} className="space-y-2">
                        {errs.map((e, j) => (
                          <div
                            key={`err-${wIdx}-${j}`}
                            className="flex items-start gap-2"
                          >
                            <AlertCircle
                              className="text-rose-500 flex-shrink-0"
                              size={18}
                            />
                            <div className="text-[14px] text-gray-800">
                              <div className="font-semibold">
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
                          <div className="flex items-start gap-2">
                            <CheckCircle2
                              className="text-emerald-600 flex-shrink-0"
                              size={18}
                            />
                            <div className="text-[14px]">
                              <span className="font-semibold text-gray-800">
                                교정 문장:{" "}
                              </span>
                              <span className="text-gray-700">
                                {feedback.suggestion}
                              </span>
                            </div>
                          </div>
                        )}
                        {feedback.explanation && (
                          <div className="text-[13px] text-gray-600">
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
