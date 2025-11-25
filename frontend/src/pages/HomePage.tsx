// src/pages/HomePage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ListOrdered,
  PenTool,
  Mic,
  Link2,
  Trophy,
  Flame,
  ChevronRight,
  Repeat,
  Award,
} from "lucide-react";
import type { TrainingType } from "../services/trainingService";
import { useProfile } from "../hooks/useProfile";
import type { UserProfileResponse } from "../services/userService";
import { getLeaderboard } from "../services/leaderboardService";

interface TrainingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  colorHex: string;
  repeatsToday: number;
  startType: TrainingType;
}

type LocalProfileContext = {
  profile: (UserProfileResponse & { tier?: string; score?: number }) | null;
  isLoading?: boolean;
  loading?: boolean;
};

type LeaderPreviewItem = {
  id?: string;
  name: string;
  score: number;
  tier?: string;
  rank?: number;
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const profileCtx = useProfile() as LocalProfileContext;
  const profile = profileCtx.profile ?? null;
  const profileLoading: boolean =
    profileCtx.isLoading ?? profileCtx.loading ?? false;

  const [prefetchingType, setPrefetchingType] = useState<TrainingType | null>(
    null
  );

  useEffect(() => {
    if (!profileLoading && !profile) navigate("/auth");
  }, [profileLoading, profile, navigate]);

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500" />
      </div>
    );
  }
  if (!profile) return null;

  const steps: TrainingStep[] = [
    {
      id: "vocabulary",
      title: "단어 훈련",
      description: "새로운 단어를 배우고 복습하세요",
      icon: <BookOpen className="w-4 h-4 sm:w-4 sm:h-4" />,
      color: "bg-rose-500",
      colorHex: "#ef4444",
      repeatsToday: 2,
      startType: "vocabulary",
    },
    {
      id: "sentence",
      title: "문장 배열",
      description: "단어를 올바른 순서로 배열하세요",
      icon: <ListOrdered className="w-4 h-4 sm:w-4 sm:h-4" />,
      color: "bg-rose-400",
      colorHex: "#fb7185",
      repeatsToday: 1,
      startType: "sentence",
    },
    {
      id: "matching",
      title: "빈칸 채우기",
      description: "단어와 뜻을 연결하세요",
      icon: <Link2 className="w-4 h-4 sm:w-4 sm:h-4" />,
      color: "bg-pink-500",
      colorHex: "#ec4899",
      repeatsToday: 0,
      startType: "blank",
    },
    {
      id: "writing",
      title: "작문",
      description: "문장을 직접 작성해보세요",
      icon: <PenTool className="w-4 h-4 sm:w-4 sm:h-4" />,
      color: "bg-rose-300",
      colorHex: "#fda4af",
      repeatsToday: 0,
      startType: "writing",
    },
    {
      id: "speaking",
      title: "말하기 연습",
      description: "AI가 발음을 교정해드립니다",
      icon: <Mic className="w-4 h-4 sm:w-4 sm:h-4" />,
      color: "bg-indigo-500",
      colorHex: "#6366f1",
      repeatsToday: 3,
      startType: "speaking",
    },
  ];

  const handleNavigateToTraining = (startType: TrainingType) => {
    navigate("/training", { state: { startType } });
  };

  const prefetchQuestions = async (type: TrainingType) => {
    try {
      setPrefetchingType(type);
      await fetch(`/api/training?type=${encodeURIComponent(type)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // ignore
    } finally {
      setPrefetchingType(null);
    }
  };

  const displayName = profile.name ?? "학습자";
  const displayLevel = profile.level ?? "대기중";
  const streak = profile.streak_count ?? 0;

  const tier = profile.tier ?? "Bronze";
  const score = profile.score ?? 0;

  const tierStyles: Record<
    string,
    { bgClass: string; textClass: string; label: string }
  > = {
    Bronze: {
      bgClass: "bg-gradient-to-r from-amber-700 via-amber-600 to-amber-600",
      textClass: "text-white",
      label: "브론즈",
    },
    Silver: {
      bgClass: "bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400",
      textClass: "text-slate-800",
      label: "실버",
    },
    Gold: {
      bgClass: "bg-gradient-to-r from-amber-500 via-amber-300 to-yellow-300",
      textClass: "text-yellow-800",
      label: "골드",
    },
    Platinum: {
      bgClass: "bg-gradient-to-r from-teal-200 via-cyan-200 to-indigo-300",
      textClass: "text-indigo-900",
      label: "플래티넘",
    },
    Diamond: {
      bgClass: "bg-gradient-to-r from-cyan-200 via-sky-300 to-indigo-400",
      textClass: "text-sky-900",
      label: "다이아",
    },
    Master: {
      bgClass: "bg-gradient-to-r from-purple-200 via-purple-300 to-purple-500",
      textClass: "text-purple-900",
      label: "마스터",
    },
    Challenger: {
      bgClass: "bg-gradient-to-r from-pink-300 via-pink-500 to-rose-600",
      textClass: "text-rose-900",
      label: "챌린저",
    },
  };

  const chosen = tierStyles[tier] ?? tierStyles.Bronze;

  const [leaderPreview, setLeaderPreview] = useState<
    LeaderPreviewItem[] | null
  >(null);
  const [leaderLoading, setLeaderLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchPreview = async () => {
      setLeaderLoading(true);
      try {
        const data = await getLeaderboard({ limit: 12 });
        if (!mounted) return;
        const arr: LeaderPreviewItem[] = Array.isArray(data)
          ? data
          : data?.data ?? [];
        arr.sort((a, b) => {
          if (typeof a.rank === "number" && typeof b.rank === "number") {
            return a.rank - b.rank;
          }
          return (b.score ?? 0) - (a.score ?? 0);
        });
        const normalized = arr.map((it, idx) => ({
          ...it,
          rank: it.rank ?? idx + 1,
        }));
        setLeaderPreview(normalized);
      } catch {
        if (mounted) setLeaderPreview([]);
      } finally {
        if (mounted) setLeaderLoading(false);
      }
    };
    fetchPreview();
    return () => {
      mounted = false;
    };
  }, []);

  const goToLeaderboard = () => {
    navigate("/leaderboard");
  };

  const Avatar: React.FC<{
    name?: string;
    size?: number;
    className?: string;
  }> = ({ name, size = 36, className = "" }) => {
    const initials = (name || "익명")
      .split(" ")
      .map((s) => (s ? s[0] : ""))
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return (
      <div
        className={`flex items-center justify-center rounded-full text-white font-bold ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: "#ef4444",
          fontSize: size * 0.4,
        }}
      >
        {initials}
      </div>
    );
  };

  const top3 = leaderPreview ? leaderPreview.slice(0, 3) : [];
  const nextTwo = leaderPreview ? leaderPreview.slice(3, 5) : [];
  const blurredAfterFive = leaderPreview ? leaderPreview.slice(5) : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pb-20">
      <header className="bg-rose-500 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-base sm:text-2xl font-bold mb-0.5 truncate">
                안녕하세요, {displayName}님!
              </h1>
              <p className="text-white/90 text-xs sm:text-sm">
                오늘도 영어 학습을 시작해볼까요?
              </p>
            </div>

            <div className="mt-3 sm:mt-0 sm:ml-4">
              <div className="flex items-center gap-3 whitespace-nowrap overflow-x-auto">
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 text-sm font-semibold text-white sm:bg-opacity-20">
                  <Flame className="w-4 h-4" />
                  <span className="leading-none">{streak}일</span>
                </div>

                <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 text-sm font-semibold text-white sm:bg-opacity-20">
                  <Trophy className="w-4 h-4" />
                  <span className="leading-none">{displayLevel}</span>
                </div>

                <div
                  className={`${chosen.bgClass} rounded-full px-3 py-1.5 text-sm font-semibold flex items-center gap-2`}
                  title={`티어: ${chosen.label} · 점수: ${score}pt`}
                >
                  <span className={chosen.textClass}>{chosen.label}</span>
                  <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-sm">
                    <span className={chosen.textClass}>{score}pt</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h2 className="text-base sm:text-xl font-bold mb-3 sm:mb-4">
          오늘의 유닛
        </h2>

        <ul className="space-y-3 sm:space-y-4">
          {steps.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => handleNavigateToTraining(s.startType)}
                onMouseEnter={() => prefetchQuestions(s.startType)}
                className="border-2 border-gray-200 group relative bg-white rounded-2xl p-3 sm:p-4 text-left cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 w-full"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className={`w-10 h-10 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${s.color} text-white shadow-md group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}
                    style={{ border: `1px solid ${s.colorHex}` }}
                  >
                    {s.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                        {s.title}
                      </h3>

                      <div className="flex-shrink-0 ml-auto flex items-center gap-2">
                        {prefetchingType === s.startType ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                            <Repeat className="w-3.5 h-3.5 text-rose-600" />
                            로딩...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                            {s.repeatsToday > 0
                              ? `${s.repeatsToday}회 남음`
                              : "시작"}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground truncate">
                      {s.description}
                    </p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </button>
            </li>
          ))}
        </ul>

        {/* 리더보드 섹션 */}
        <section className="mt-8">
          <h2 className="text-base sm:text-xl font-bold mb-3 sm:mb-4">
            리더보드
          </h2>

          <div className="bg-gradient-to-br from-white via-rose-50 to-rose-100 border border-rose-100 rounded-3xl p-6 shadow-lg">
            {/* 상위 3명 가로 배치 (2-1-3 순서) */}
            <div className="flex items-end justify-center gap-4 sm:gap-6 mb-8">
              {/* 2위 */}
              <div className="flex flex-col items-center gap-3 flex-1 max-w-[120px] sm:max-w-[140px]">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-500 shadow-lg flex items-center justify-center">
                    <Avatar
                      name={top3[1]?.name}
                      size={window.innerWidth < 640 ? 64 : 80}
                    />
                  </div>
                  <div className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-br from-slate-200 to-slate-400 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                    <span className="text-xs font-bold text-slate-800">2</span>
                  </div>
                </div>
                <div className="text-center w-full">
                  <div className="text-xs sm:text-sm font-bold truncate">
                    {top3[1]?.name ?? "—"}
                  </div>
                  <div className="text-xs text-rose-600 font-semibold mt-1">
                    {top3[1]?.score ?? 0} pt
                  </div>
                </div>
              </div>

              {/* 1위 (가장 크게) */}
              <div className="flex flex-col items-center gap-3 flex-1 max-w-[140px] sm:max-w-[160px] -mt-6">
                <div className="relative">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-rose-500 shadow-2xl flex items-center justify-center ring-4 ring-yellow-400/50">
                    <Avatar
                      name={top3[0]?.name}
                      size={window.innerWidth < 640 ? 96 : 112}
                    />
                  </div>
                  <div className="absolute -top-2 -right-2 w-9 h-9 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    <Award className="w-5 h-5 text-yellow-900" />
                  </div>
                </div>
                <div className="text-center w-full">
                  <div className="text-sm sm:text-base font-extrabold truncate">
                    {top3[0]?.name ?? "—"}
                  </div>
                  <div className="text-xs sm:text-sm text-rose-600 font-bold mt-1">
                    {top3[0]?.score ?? 0} pt
                  </div>
                </div>
              </div>

              {/* 3위 */}
              <div className="flex flex-col items-center gap-3 flex-1 max-w-[120px] sm:max-w-[140px]">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-500 shadow-lg flex items-center justify-center">
                    <Avatar
                      name={top3[2]?.name}
                      size={window.innerWidth < 640 ? 64 : 80}
                    />
                  </div>
                  <div className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                    <span className="text-xs font-bold text-white">3</span>
                  </div>
                </div>
                <div className="text-center w-full">
                  <div className="text-xs sm:text-sm font-bold truncate">
                    {top3[2]?.name ?? "—"}
                  </div>
                  <div className="text-xs text-rose-600 font-semibold mt-1">
                    {top3[2]?.score ?? 0} pt
                  </div>
                </div>
              </div>
            </div>

            {/* 4·5위 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {nextTwo.length > 0 ? (
                nextTwo.map((it, idx) => (
                  <div
                    key={it.id ?? it.name ?? idx}
                    className="flex items-center gap-3 bg-white/95 border border-rose-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex-shrink-0 relative">
                      <div className="w-14 h-14 rounded-full bg-rose-500 shadow-md flex items-center justify-center">
                        <Avatar name={it.name} size={56} />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-rose-600 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                        <span className="text-xs font-bold text-white">
                          {it.rank}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">
                        {it.name}
                      </div>
                      <div className="text-xs text-rose-600 font-semibold mt-1">
                        {it.score} pt
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground col-span-2 text-center py-4">
                  데이터 없음
                </div>
              )}
            </div>

            {/* 6위 이후 블러 처리 영역 */}
            {blurredAfterFive.length > 0 && (
              <div className="relative mb-4">
                <div
                  className="space-y-2 overflow-hidden"
                  style={{ maxHeight: 140 }}
                >
                  {blurredAfterFive.slice(0, 3).map((it, idx) => (
                    <div
                      key={it.id ?? it.name ?? idx}
                      className="flex items-center gap-3 bg-white/80 border border-rose-50 rounded-xl p-3"
                      style={{ filter: "blur(4px)", opacity: 0.5 }}
                    >
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-rose-500 shadow-sm flex items-center justify-center">
                          <Avatar name={it.name} size={48} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {it.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {it.score} pt
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 하단 그라데이션 오버레이 */}
                <div
                  className="absolute left-0 right-0 bottom-0 h-24 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(254,242,242,0.95) 60%, rgba(254,242,242,1) 100%)",
                  }}
                />
              </div>
            )}

            {/* 전체 순위 보기 버튼 */}
            <div className="flex items-center justify-center">
              <button
                onClick={goToLeaderboard}
                className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                전체 순위 보기
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
