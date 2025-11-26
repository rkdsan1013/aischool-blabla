import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // 단계별 애니메이션 상태
  const [showLogo, setShowLogo] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    // 로고 먼저
    setTimeout(() => setShowLogo(true), 200);
    // 소개 멘트 다음
    setTimeout(() => setShowSubtitle(true), 800);
    // 버튼 마지막
    setTimeout(() => setShowButtons(true), 1400);
  }, []);

  return (
    <div className="min-h-screen bg-rose-500 flex items-center justify-center p-4">
      <div className="text-center">
        {/* 로고 */}
        <h1
          className={`text-6xl sm:text-7xl md:text-8xl font-bold text-white mb-4 tracking-tight 
                      transition-all duration-1000 
                      ${
                        showLogo
                          ? "opacity-100 scale-100"
                          : "opacity-0 scale-95"
                      }`}
        >
          Blabla
        </h1>

        {/* 소개 멘트 */}
        <p
          className={`text-lg sm:text-xl md:text-2xl text-white/90 font-light mb-12 
                      transition-all duration-1000 delay-200
                      ${
                        showSubtitle
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-2"
                      }`}
        >
          Stop typing, Start talking
        </p>

        {/* 버튼 영역 */}
        <div
          className={`flex flex-col sm:flex-row gap-4 justify-center 
                      transition-all duration-700 
                      ${
                        showButtons
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-4"
                      }`}
        >
          {/* 시작하기 버튼 - 레벨 테스트 페이지로 연결 */}
          <button
            onClick={() => navigate("/ai-talk/level-test")}
            className="w-full sm:w-auto min-w-[200px] h-14 sm:h-16 
                       bg-white text-rose-500 font-semibold text-base sm:text-lg 
                       shadow-xl rounded-xl transition 
                       hover:bg-rose-100 hover:scale-105 active:scale-95"
          >
            시작하기
          </button>

          {/* 로그인 버튼 */}
          <button
            onClick={() => navigate("/auth")}
            className="w-full sm:w-auto min-w-[200px] h-14 sm:h-16 
                       bg-transparent border-2 border-white text-white font-semibold text-base sm:text-lg 
                       shadow-lg rounded-xl transition 
                       hover:bg-white/10 hover:scale-105 active:scale-95"
          >
            로그인
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
