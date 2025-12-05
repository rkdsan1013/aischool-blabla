// frontend/src/pages/LevelTestResultPage.tsx
import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown, // 아래 그래프에서 아이콘으로 사용되므로 import 유지
  UserPlus,
  Home,
  ArrowRight,
  X,
  Share2,
  Sparkles,
} from "lucide-react";
import { updateUserLevel } from "../services/userService";
import { useProfile } from "../hooks/useProfile";

// --- 타입 정의 ---
type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface ResultState {
  level: Level;
  prevProgress: number;
  currentProgress: number;
  isGuest: boolean;
  selectedBaseLevel?: string;
}

const LEVEL_ORDER: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

const LevelTestResultPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [result, setResult] = useState<ResultState | null>(null);
  const isSavedRef = useRef(false);
  const { refreshProfile } = useProfile();

  useEffect(() => {
    if (location.state) {
      setResult(location.state as ResultState);
    } else {
      navigate("/");
    }
  }, [location, navigate]);

  useEffect(() => {
    const saveLevel = async () => {
      if (result && !result.isGuest && !isSavedRef.current) {
        isSavedRef.current = true;
        try {
          await updateUserLevel(result.level, result.currentProgress);
          await refreshProfile();
        } catch (err) {
          console.error("❌ [LevelResult] 저장 실패:", err);
          isSavedRef.current = false;
        }
      }
    };
    saveLevel();
  }, [result, refreshProfile]);

  if (!result) return null;

  const getLevelDescription = (level: Level) => {
    switch (level) {
      case "A1":
        return "기초적인 단어와 문장으로 소통해요.";
      case "A2":
        return "일상적인 주제로 간단히 대화해요.";
      case "B1":
        return "여행 상황을 스스로 해결할 수 있어요.";
      case "B2":
        return "다양한 주제로 구체적인 토론이 가능해요.";
      case "C1":
        return "복잡한 주제도 유연하게 대처해요.";
      case "C2":
        return "원어민 수준의 정교한 구사력이에요.";
      default:
        return "";
    }
  };

  // 이전 레벨 인덱스
  const prevLevelIndex =
    !result.isGuest &&
      result.selectedBaseLevel &&
      LEVEL_ORDER.includes(result.selectedBaseLevel as Level)
      ? LEVEL_ORDER.indexOf(result.selectedBaseLevel as Level)
      : LEVEL_ORDER.indexOf(result.level);
  const resultLevelIndex = LEVEL_ORDER.indexOf(result.level);

  // 레벨 변화
  const levelChange = resultLevelIndex - prevLevelIndex;

  const computeEffectiveDiff = (
    prevProg: number,
    currProg: number,
    levelChangeValue: number
  ) => {
    const prev = clamp(prevProg);
    const curr = clamp(currProg);

    if (levelChangeValue > 0) {
      const steps = levelChangeValue;
      const middleFulls = Math.max(0, steps - 1);
      return 100 - prev + middleFulls * 100 + curr;
    }
    if (levelChangeValue < 0) {
      const steps = Math.abs(levelChangeValue);
      const middleFulls = Math.max(0, steps - 1);
      return -1 * (prev + middleFulls * 100 + (100 - curr));
    }
    return curr - prev;
  };

  const effectiveDiff = computeEffectiveDiff(
    result.prevProgress,
    result.currentProgress,
    levelChange
  );

  const isLevelUp =
    levelChange > 0 ||
    (levelChange === 0 && result.currentProgress > result.prevProgress);

  // [수정됨] isLevelDown 삭제 (사용하지 않음)
  // const isLevelDown = ... 삭제

  const progressDiffDisplay =
    effectiveDiff >= 0 ? `+${effectiveDiff}` : `${effectiveDiff}`;

  const handleExit = () => {
    navigate("/");
  };

  const handleShare = () => {
    alert("결과 이미지 저장/공유 기능이 실행됩니다.");
  };

  // [수정됨] prevLevelLabel, levelChanged 삭제 (상단 바 삭제로 인해 사용하지 않음)

  const prevBar = clamp(result.prevProgress);
  const currBar = clamp(result.currentProgress);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-gray-900 flex flex-col relative">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-200/40 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-3xl opacity-60" />
      </div>

      <header className="sticky top-0 left-0 w-full z-50">
        <div className="max-w-5xl mx-auto h-14 sm:h-16 px-4 sm:px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="bg-white/80 border border-white/50 shadow-sm px-3 py-1 rounded-full text-xs font-bold text-rose-500 backdrop-blur-md">
              RESULT
            </span>
          </div>
          <button
            onClick={handleExit}
            className="p-2 -mr-2 rounded-full hover:bg-white/20 transition-colors text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
      </header>

      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-md flex flex-col items-center gap-6 sm:gap-8 animate-fade-in">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-green-100/90 text-green-700 px-3 py-1 rounded-full text-xs font-bold mb-2 shadow-sm border border-green-200">
              <CheckCircle2 size={14} />
              <span>분석 완료</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900">
              당신의 레벨은{" "}
              <span className="text-rose-500">{result.level}</span> 입니다
            </h1>
            <p className="text-gray-500 text-sm sm:text-base">
              AI가 발음, 문법, 표현력을 분석했습니다.
            </p>
          </div>

          <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 relative overflow-hidden">
            {!result.isGuest && (
              <button
                onClick={handleShare}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-50 text-gray-400 hover:text-rose-500 transition"
                aria-label="결과 공유하기"
              >
                <Share2 size={20} />
              </button>
            )}

            <div className="flex flex-col items-center text-center mt-2">
              <div className="relative mb-5">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-50 border-4 border-white ring-1 ring-gray-100 shadow-inner flex items-center justify-center">
                  <span className="text-4xl sm:text-5xl font-black text-rose-500 tracking-tighter">
                    {result.level}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-yellow-400 p-2 rounded-full text-white shadow-md animate-bounce">
                  <Sparkles size={16} fill="white" />
                </div>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                {result.level} Level
              </h2>
              <p className="text-gray-500 text-sm break-keep leading-relaxed px-4">
                {getLevelDescription(result.level)}
              </p>
            </div>

            {!result.isGuest && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500">
                    레벨 달성도
                  </span>
                  <div
                    className={`flex items-center gap-1 text-xs font-bold ${isLevelUp ? "text-green-600" : "text-rose-500"
                      }`}
                  >
                    {isLevelUp ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    )}
                    <span>{progressDiffDisplay}%</span>
                  </div>
                </div>

                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-gray-300"
                    style={{ width: `${prevBar}%` }}
                  />
                  <div
                    className="absolute top-0 left-0 h-full bg-linear-to-r from-rose-400 to-rose-500 transition-all duration-1000 mix-blend-multiply"
                    style={{ width: `${currBar}%` }}
                  />
                </div>

                <div className="flex justify-between mt-1.5 text-[10px] text-gray-400 font-medium">
                  <span>이전: {clamp(result.prevProgress)}%</span>
                  <span className="text-rose-500">
                    현재: {clamp(result.currentProgress)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="w-full flex flex-col gap-3 mb-6">
            {result.isGuest ? (
              <>
                <button
                  onClick={() =>
                    navigate("/auth?mode=signup", {
                      state: { level: result.level },
                    })
                  }
                  className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold text-lg shadow-md hover:bg-rose-600 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <UserPlus size={20} />
                  <span>결과 저장하고 시작하기</span>
                </button>

                <button
                  onClick={() => navigate("/")}
                  className="w-full py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all active:scale-[0.98]"
                >
                  그냥 홈으로 갈게요
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate("/home")}
                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold text-lg shadow-md hover:bg-rose-600 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Home size={20} />
                <span>홈으로 이동</span>
                <ArrowRight size={18} className="opacity-70" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LevelTestResultPage;