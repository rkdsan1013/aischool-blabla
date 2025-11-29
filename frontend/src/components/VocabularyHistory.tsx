// src/components/VocabularyHistory.tsx
import React from "react";
import { Check, X } from "lucide-react";

interface Props {
  question: string;
  options: string[];
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export default function VocabularyHistory({
  question,
  options,
  userAnswer,
  correctAnswer,
  isCorrect,
}: Props) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="w-full">
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 sm:p-6 min-h-[120px] flex items-center justify-center gap-3">
          <span className="text-3xl sm:text-4xl font-bold text-foreground text-center">
            {question}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {options.map((option, index) => {
          const isUserSelected = userAnswer === option;
          const isCorrectOption = correctAnswer === option;

          let bgColor = "bg-white border-gray-200";
          let textColor = "text-foreground";
          let iconElement: React.ReactNode = null;

          if (isCorrectOption) {
            bgColor = "bg-green-50 border-green-500";
            textColor = "text-green-700";
            iconElement = <Check className="w-5 h-5 text-green-600" />;
          } else if (isUserSelected && !isCorrect) {
            bgColor = "bg-rose-50 border-rose-500";
            textColor = "text-rose-700";
            iconElement = <X className="w-5 h-5 text-rose-600" />;
          }

          return (
            <div
              key={index}
              className={`w-full rounded-2xl text-left p-4 sm:p-5 transition-all duration-300 border-2 ${bgColor}`}
            >
              <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold shrink-0 transition-colors ${
                    isCorrectOption
                      ? "bg-green-100 text-green-700"
                      : isUserSelected && !isCorrect
                      ? "bg-rose-100 text-rose-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {iconElement || index + 1}
                </div>

                <div className={`text-base font-medium ${textColor}`}>
                  {option}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
