// src/components/SentenceHistory.tsx
import React from "react";
import { Check, XCircle } from "lucide-react";

interface Props {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export default function SentenceHistory({
  question,
  userAnswer,
  correctAnswer,
  isCorrect,
}: Props) {
  const userWords = userAnswer.trim().split(/\s+/);
  const correctWords = correctAnswer.trim().split(/\s+/);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 space-y-2 pb-4">
        <h1 className="text-xl font-bold text-foreground">문장 배열하기</h1>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <span className="text-lg font-medium text-foreground break-keep">
            {question}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* 내가 배열한 답 */}
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
            내가 배열한 답
            {isCorrect ? (
              <span className="text-green-600 flex items-center gap-1">
                <Check className="w-4 h-4" />
                정답
              </span>
            ) : (
              <span className="text-rose-600 flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                오답
              </span>
            )}
          </p>
          <div
            className={`bg-white border-2 rounded-xl p-3 ${
              isCorrect
                ? "border-green-500 bg-green-50"
                : "border-rose-500 bg-rose-50"
            }`}
          >
            <div className="flex flex-wrap gap-2">
              {userWords.map((word, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border px-3 py-2 text-base font-medium ${
                    isCorrect
                      ? "bg-green-100 border-green-300 text-green-800"
                      : "bg-rose-100 border-rose-300 text-rose-800"
                  }`}
                >
                  {word}
                </div>
              ))}
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
            <div className="bg-white border-2 border-green-500 bg-green-50 rounded-xl p-3">
              <div className="flex flex-wrap gap-2">
                {correctWords.map((word, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-green-100 border border-green-300 text-green-800 px-3 py-2 text-base font-medium"
                  >
                    {word}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
