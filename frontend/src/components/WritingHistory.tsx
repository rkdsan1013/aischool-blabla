// src/components/WritingHistory.tsx
// import React from "react";
import { Check, X } from "lucide-react";

interface Props {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export default function WritingHistory({
  question,
  userAnswer,
  correctAnswer,
  isCorrect,
}: Props) {
  return (
    <div className="w-full flex flex-col space-y-4 sm:space-y-5">
      {/* 원문 카드 */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 sm:p-6">
        <div className="text-sm font-semibold text-muted-foreground mb-2">
          원문 (한국어)
        </div>
        <div className="text-lg sm:text-xl font-medium text-foreground whitespace-pre-wrap">
          {question}
        </div>
      </div>

      {/* 내가 작성한 답 */}
      <div>
        <p className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
          내가 작성한 답
          {isCorrect ? (
            <span className="text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" />
              정답
            </span>
          ) : (
            <span className="text-rose-600 flex items-center gap-1">
              <X className="w-4 h-4" />
            </span>
          )}
        </p>
        <div
          className={`w-full p-4 sm:p-5 rounded-2xl border-2 ${
            isCorrect
              ? "border-green-500 bg-green-50"
              : "border-rose-500 bg-rose-50"
          }`}
        >
          <div
            className={`text-base whitespace-pre-wrap ${
              isCorrect ? "text-green-700" : "text-rose-700"
            }`}
          >
            {userAnswer}
          </div>
        </div>
      </div>

      {/* 정답 */}
      {!isCorrect && (
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
            정답
            <span className="text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" />
            </span>
          </p>
          <div className="w-full p-4 sm:p-5 rounded-2xl border-2 border-green-500 bg-green-50">
            <div className="text-base text-green-700 whitespace-pre-wrap">
              {correctAnswer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
