// frontend/src/pages/TrainingResult.tsx
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Trophy, CheckCircle, Home, RotateCcw } from "lucide-react";

interface ResultState {
  correctCount: number;
  totalCount: number;
  trainingType?: string;
  earnedScore: number;
}

const TRAINING_TYPE_LABELS: Record<string, string> = {
  vocabulary: "단어",
  sentence: "문장",
  blank: "빈칸 채우기",
  writing: "작문",
  speaking: "말하기",
};

const TrainingResult: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as ResultState;

  useEffect(() => {
    if (!state || typeof state.correctCount !== "number") {
      navigate("/home", { replace: true });
    }
  }, [state, navigate]);

  if (!state) return null;

  const { correctCount, totalCount, trainingType, earnedScore } = state;
  const percentage =
    totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  const koreanType = trainingType
    ? TRAINING_TYPE_LABELS[trainingType] ?? trainingType
    : "";

  const handleRetry = () => {
    if (trainingType) {
      navigate("/training", {
        state: { startType: trainingType },
        replace: true,
      });
    } else {
      navigate("/home");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <style>{`
        @keyframes soft-glow {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1.2);
          }
          50% {
            opacity: 1;
            transform: scale(1.6);
          }
        }
      `}</style>

      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="relative inline-block z-0">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(250, 204, 21, 0.6) 0%, rgba(253, 224, 71, 0.3) 60%, rgba(255, 255, 255, 0) 100%)",
                zIndex: 0,
                animation: "soft-glow 3s ease-in-out infinite",
                filter: "blur(12px)",
              }}
            />
            <div className="relative bg-yellow-50 p-6 rounded-full border-4 border-yellow-100 z-10">
              <Trophy className="w-16 h-16 text-yellow-500" />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">학습 완료!</h1>
            <p className="text-gray-500 mt-2 text-lg">
              {koreanType
                ? `${koreanType} 학습을 완료했습니다.`
                : "오늘의 학습을 성공적으로 마쳤습니다."}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-3xl p-8 space-y-6 shadow-sm">
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              획득 점수
            </div>
            <div className="text-5xl font-black text-rose-500 tracking-tight">
              +{earnedScore} 점
            </div>
          </div>

          <div className="h-px bg-gray-200 w-full" />

          <div className="flex items-center justify-between px-4">
            <div className="flex flex-col items-center">
              <span className="text-gray-400 text-sm font-medium mb-1">
                정답 개수
              </span>
              <span className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                {correctCount} / {totalCount}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-gray-400 text-sm font-medium mb-1">
                정확도
              </span>
              <span className="text-2xl font-bold text-gray-900">
                {percentage}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4">
          <button
            onClick={() => navigate("/home")}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl border-2 border-gray-100 text-gray-600 font-bold hover:bg-gray-50 hover:border-gray-200 transition-all active:scale-95"
          >
            <Home className="w-5 h-5" />
            홈으로
          </button>

          <button
            onClick={handleRetry}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-rose-500 text-white font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all active:scale-95"
          >
            <RotateCcw className="w-5 h-5" />
            다시 하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainingResult;
