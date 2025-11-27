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
  X,
  Share2,
} from "lucide-react";

// --- 타입 정의 ---
type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface ResultState {
  level: Level;
  prevProgress: number;
  currentProgress: number;
  // score: number; // ✅ 제거됨
  isGuest: boolean;
  selectedBaseLevel?: string;
}

const LevelTestResultPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [result, setResult] = useState<ResultState | null>(null);

  useEffect(() => {
    if (location.state) {
      setResult(location.state as ResultState);
    } else {
      navigate("/");
    }
  }, [location, navigate]);

  if (!result) return null;

  // --- 레벨별 설명 ---
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

  const isLevelUp = result.currentProgress >= result.prevProgress;
  const progressDiff = result.currentProgress - result.prevProgress;

  const handleExit = () => {
    navigate("/");
  };

  const handleShare = () => {
    alert("결과 이미지 저장/공유 기능이 실행됩니다.");
  };

  return (
    <div className="h-screen w-full bg-slate-50 text-gray-900 flex flex-col relative overflow-hidden">
      {/* --- [배경 레이어] --- */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-200/40 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-3xl opacity-60" />
      </div>

      {/* --- [헤더] --- */}
      <header className="absolute top-0 left-0 w-full h-16 px-6 flex justify-between items-center z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="flex items-center gap-2">
          <span className="bg-white/80 border border-white/50 shadow-sm px-3 py-1 rounded-full text-xs font-bold text-rose-500 backdrop-blur-md">
            RESULT
          </span>
        </div>
        <button
          onClick={handleExit}
          className="p-2.5 rounded-full bg-white/40 hover:bg-white/80 border border-white/20 transition text-gray-600 hover:text-gray-900"
        >
          <X size={20} />
        </button>
      </header>

      {/* --- [메인 컨텐츠] --- */}
      <main className="relative z-10 w-full h-full flex flex-col items-center justify-center px-4 pb-safe pt-16">
        <div className="w-full max-w-md flex flex-col items-center gap-6 sm:gap-8 animate-fade-in">
          {/* 1. 상단 텍스트 */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-green-100/80 text-green-700 px-3 py-1 rounded-full text-xs font-bold mb-2 backdrop-blur-sm border border-green-200/50">
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

          {/* 2. 결과 메인 카드 (Glass Effect) */}
          <div className="w-full bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden group">
            {/* 공유 버튼 (로그인 유저) */}
            {!result.isGuest && (
              <button
                onClick={handleShare}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/50 hover:bg-white text-rose-400 hover:text-rose-600 transition shadow-sm z-10"
                aria-label="결과 공유하기"
              >
                <Share2 size={18} />
              </button>
            )}

            {/* 상단 데코 라인 */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-rose-400 to-rose-600" />

            <div className="flex flex-col items-center text-center">
              {/* 레벨 뱃지 */}
              <div className="relative mb-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-linear-to-br from-rose-100 to-white border-4 border-white shadow-inner flex items-center justify-center">
                  <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-linear-to-br from-rose-600 to-rose-400 tracking-tighter">
                    {result.level}
                  </span>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-yellow-400 p-2 rounded-full text-white shadow-md animate-bounce">
                  <Sparkles size={16} fill="white" />
                </div>
              </div>

              {/* 설명 */}
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {result.level} Level
              </h2>
              <p className="text-gray-600 text-sm break-keep leading-relaxed">
                {getLevelDescription(result.level)}
              </p>
            </div>

            {/* --- [User Mode Only] 진척도 그래프 --- */}
            {!result.isGuest && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500">
                    레벨 달성도
                  </span>
                  <div
                    className={`flex items-center gap-1 text-xs font-bold ${
                      isLevelUp ? "text-green-600" : "text-rose-500"
                    }`}
                  >
                    {isLevelUp ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    )}
                    <span>
                      {progressDiff > 0 ? "+" : ""}
                      {progressDiff}%
                    </span>
                  </div>
                </div>
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                  {/* 이전 (회색) */}
                  <div
                    className="absolute top-0 left-0 h-full bg-gray-300/50"
                    style={{ width: `${result.prevProgress}%` }}
                  />
                  {/* 현재 (Rose 그라데이션) */}
                  <div
                    className="absolute top-0 left-0 h-full bg-linear-to-r from-rose-400 to-rose-600 transition-all duration-1000"
                    style={{ width: `${result.currentProgress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-medium">
                  <span>이전: {result.prevProgress}%</span>
                  <span className="text-rose-500">
                    현재: {result.currentProgress}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 3. 하단 액션 버튼 */}
          <div className="w-full flex flex-col gap-3 mb-6">
            {result.isGuest ? (
              // --- [Guest] 회원가입 유도 ---
              <>
                <button
                  onClick={() =>
                    navigate("/auth?mode=signup", {
                      // ✅ [수정됨] score 제거, level만 전달
                      state: { level: result.level },
                    })
                  }
                  className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-rose-200 hover:bg-rose-600 hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <UserPlus size={20} />
                  <span>결과 저장하고 시작하기</span>
                </button>

                <button
                  onClick={() => navigate("/")}
                  className="w-full py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all active:scale-95"
                >
                  그냥 홈으로 갈게요
                </button>
              </>
            ) : (
              // --- [User] 대시보드 이동 ---
              <button
                onClick={() => navigate("/home")}
                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-rose-200 hover:bg-rose-600 hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
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
