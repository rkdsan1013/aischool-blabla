// frontend/src/pages/LevelTestResultPage.tsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Home,
  Sparkles,
  ArrowRight,
} from "lucide-react";

type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface ResultState {
  level: Level;
  prevProgress: number;
  currentProgress: number;
  score: number;
  isGuest: boolean;
}

const LevelTestResultPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [result, setResult] = useState<ResultState | null>(null);

  useEffect(() => {
    if (location.state) {
      setResult(location.state as ResultState);
    } else {
      navigate("/home");
    }
  }, [location, navigate]);

  if (!result) return null;

  const getLevelDescription = (level: Level) => {
    switch (level) {
      case "A1":
        return "기초적인 단어와 문장으로 소통할 수 있는 단계입니다.";
      case "A2":
        return "일상적인 주제에 대해 간단한 대화가 가능한 단계입니다.";
      case "B1":
        return "친숙한 주제에 대해 문장을 만들어 대화할 수 있는 단계입니다.";
      case "B2":
        return "다양한 주제에 대해 구체적이고 유창하게 대화할 수 있습니다.";
      case "C1":
        return "복잡한 주제에 대해서도 유연하고 효과적으로 대처합니다.";
      case "C2":
        return "원어민 수준의 자연스럽고 정확한 구사 능력을 갖췄습니다.";
      default:
        return "";
    }
  };

  const isLevelUp = result.currentProgress >= result.prevProgress;
  const progressDiff = result.currentProgress - result.prevProgress;

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center py-12 px-4 sm:px-6 animate-fade-in">
      {/* 상단 타이틀 */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
          <CheckCircle2 size={18} />
          <span>분석 완료</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          당신의 회화 레벨 분석 결과
        </h1>
        <p className="text-gray-500">
          AI가 발음, 문법, 표현력을 종합적으로 분석했습니다.
        </p>
      </div>

      <div className="w-full max-w-lg space-y-6">
        {/* 1. 레벨 카드 (공통) */}
        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-xl shadow-gray-100 text-center relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          {/* ✅ Tailwind 수정: bg-gradient -> bg-linear */}
          <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-violet-500 to-indigo-500" />

          {/* ✅ Tailwind 수정: bg-gradient -> bg-linear */}
          <div className="mb-4 inline-flex items-center justify-center w-24 h-24 rounded-full bg-linear-to-br from-violet-100 to-indigo-100 text-indigo-600 shadow-inner">
            <span className="text-4xl font-black tracking-tighter">
              {result.level}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {result.level} Level
          </h2>
          <p className="text-gray-600 text-sm sm:text-base mb-4 text-pretty break-keep">
            {getLevelDescription(result.level)}
          </p>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Sparkles
                key={star}
                className={`w-5 h-5 ${
                  star <= 3
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* 2. 분기 처리: 게스트 vs 유저 */}
        {result.isGuest ? (
          /* --- 게스트용 화면: 회원가입 유도 --- */
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center">
            <h3 className="text-lg font-bold text-rose-900 mb-2">
              이 결과를 저장하고 싶으신가요?
            </h3>
            <p className="text-rose-700/80 text-sm mb-6 break-keep">
              회원가입하고 학습 진척도를 관리하세요.
              <br />
              나만의 맞춤형 시나리오도 추천받을 수 있습니다.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() =>
                  navigate("/auth?mode=signup", {
                    state: { level: result.level, score: result.score },
                  })
                }
                className="w-full py-3.5 bg-rose-500 text-white rounded-xl font-semibold shadow-md hover:bg-rose-600 hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={20} />
                <span>결과 저장하고 회원가입</span>
              </button>

              <button
                onClick={() => navigate("/")}
                className="w-full py-3.5 bg-white text-gray-500 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition"
              >
                괜찮아요, 홈으로 갈게요
              </button>
            </div>
          </div>
        ) : (
          /* --- 유저용 화면: 진척도 표시 --- */
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Level Progress</h3>
              <div
                className={`flex items-center gap-1 text-sm font-semibold ${
                  isLevelUp ? "text-green-600" : "text-red-500"
                }`}
              >
                {isLevelUp ? (
                  <TrendingUp size={16} />
                ) : (
                  <TrendingDown size={16} />
                )}
                <span>
                  {progressDiff > 0 ? "+" : ""}
                  {progressDiff}%
                </span>
              </div>
            </div>

            {/* 프로그레스 바 */}
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden mb-2">
              {/* 이전 진척도 (배경처럼 깔림) */}
              <div
                className="absolute top-0 left-0 h-full bg-gray-300 transition-all duration-1000"
                style={{ width: `${result.prevProgress}%` }}
              />
              {/* 현재 진척도 (메인) */}
              <div
                className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out ${
                  isLevelUp ? "bg-indigo-500" : "bg-rose-500"
                }`}
                style={{ width: `${result.currentProgress}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-500 font-medium mb-6">
              <span>Previous: {result.prevProgress}%</span>
              <span className={isLevelUp ? "text-indigo-600" : "text-rose-600"}>
                Current: {result.currentProgress}%
              </span>
            </div>

            <button
              onClick={() => navigate("/home")}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <Home size={18} />
              <span>대시보드로 이동</span>
              <ArrowRight size={18} className="opacity-70" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LevelTestResultPage;
