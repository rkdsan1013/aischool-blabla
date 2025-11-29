// src/components/SpeakingHistory.tsx
import React from "react";
import { Check, XCircle, Volume2 } from "lucide-react";

interface Props {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export default function SpeakingHistory({
  question,
  userAnswer,
  correctAnswer,
  isCorrect,
}: Props) {
  const playTTS = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const promptWords = question.split(/\s+/);
  const spokenWords = userAnswer.toLowerCase().split(/\s+/);

  const matchStatuses = promptWords.map((word) => {
    const normalizedWord = word.toLowerCase().replace(/[.,!?'"]/g, "");
    return spokenWords.includes(normalizedWord);
  });

  return (
    <div className="space-y-6 py-4">
      <div className="text-left">
        <h1 className="text-2xl font-bold text-gray-900">말하기 연습</h1>
        <p className="text-gray-500 mt-1">마이크를 켜고 문장을 읽으세요.</p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[200px] relative">
        <button
          onClick={() => playTTS(question)}
          className="absolute top-3 right-3 p-2 rounded-full transition-colors text-gray-400 hover:text-rose-500 hover:bg-gray-100"
          title="듣기"
        >
          <Volume2 className="w-6 h-6" />
        </button>

        <div className="w-full text-left text-2xl sm:text-3xl font-semibold text-gray-800 leading-relaxed flex flex-wrap justify-start gap-x-2 pt-6">
          {promptWords.map((word, i) => {
            const isMatched = matchStatuses[i];
            return (
              <span
                key={i}
                className={`transition-colors duration-500 ${
                  isMatched ? "text-green-600" : "text-rose-400"
                }`}
              >
                {word}
              </span>
            );
          })}
        </div>

        <div className="w-full mt-6 text-sm font-medium text-gray-500 h-6 flex items-center gap-2 justify-center">
          {isCorrect ? (
            <span className="text-green-600 flex items-center gap-2">
              <Check className="w-4 h-4" />
              정답
            </span>
          ) : (
            <span className="text-rose-600 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              오답
            </span>
          )}
        </div>
      </div>

      {/* 내가 말한 문장 */}
      <div>
        <p className="text-sm font-semibold text-gray-600 mb-2">
          내가 말한 문장
        </p>
        <div
          className={`w-full p-4 rounded-2xl border-2 ${
            isCorrect
              ? "border-green-500 bg-green-50"
              : "border-rose-500 bg-rose-50"
          }`}
        >
          <div
            className={`text-base ${
              isCorrect ? "text-green-700" : "text-rose-700"
            }`}
          >
            {userAnswer}
          </div>
        </div>
      </div>
    </div>
  );
}
