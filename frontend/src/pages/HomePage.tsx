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
  color: string; // bg class
  borderClass: string; // border color class
  repeatsToday: number;
  startType: TrainingType;
}

type LocalProfileContext = {
  profile: (UserProfileResponse & { tier?: string; score?: number }) | null;
  isLoading?: boolean;
  loading?: boolean;
};

interface LeaderboardUser {
  id?: string;
  rank: number;
  name: string;
  tier?: string;
  score: number;
  streak?: number;
  isCurrentUser?: boolean;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const profileCtx = useProfile() as LocalProfileContext;
  const profile = profileCtx.profile ?? null;
  const profileLoading: boolean =
    profileCtx.isLoading ?? profileCtx.loading ?? false;

  const [prefetchingType, setPrefetchingType] = useState<TrainingType | null>(
    null
  );

  // leaderboard state
  const [leaderLoading, setLeaderLoading] = useState(false);
  const [topUsers, setTopUsers] = useState<LeaderboardUser[] | null>(null);

  useEffect(() => {
    if (!profileLoading && !profile) navigate("/auth");
  }, [profileLoading, profile, navigate]);

  useEffect(() => {
    let mounted = true;
    const fetchTop = async () => {
      setLeaderLoading(true);
      try {
        // get top 3 from service (service handles normalization, sorting, ranking)
        const data = await getLeaderboard({ limit: 3 });
        if (!mounted) return;

        // determine current profile id for fallback streak mapping
        const profileId =
          (profile as any)?.user_id ??
          (profile as any)?.userId ??
          (profile as any)?.id ??
          null;

        // map service LeaderItem -> LeaderboardUser
        const mapped: LeaderboardUser[] = (data ?? []).map((d) => {
          // service may provide streak_count or streakCount or nothing
          const raw: any = d as any;
          const streakFromService =
            typeof raw.streak_count === "number"
              ? raw.streak_count
              : typeof raw.streakCount === "number"
              ? raw.streakCount
              : undefined;

          // if service didn't provide streak, and this entry is current user, use profile.streak_count
          const fallbackStreak =
            (d.id && profileId && String(d.id) === String(profileId)) ||
            (!d.id && profileId)
              ? (profile as any)?.streak_count ??
                (profile as any)?.streakCount ??
                0
              : 0;

          return {
            id: d.id,
            rank: d.rank ?? 0,
            name: d.name ?? "익명",
            tier: d.tier,
            score: d.score ?? 0,
            streak:
              typeof streakFromService === "number"
                ? streakFromService
                : fallbackStreak,
          };
        });
        setTopUsers(mapped);
      } catch {
        if (mounted) setTopUsers([]);
      } finally {
        if (mounted) setLeaderLoading(false);
      }
    };
    fetchTop();
    return () => {
      mounted = false;
    };
    // include profile in deps so that when profile becomes available we can map streak for current user
  }, [profile]);

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
      borderClass: "border-rose-500",
      repeatsToday: 2,
      startType: "vocabulary",
    },
    {
      id: "sentence",
      title: "문장 배열",
      description: "단어를 올바른 순서로 배열하세요",
      icon: <ListOrdered className="w-4 h-4 sm:w-4 sm:h-4" />,
      color: "bg-rose-400",
      borderClass: "border-rose-400",
      repeatsToday: 1,
      startType: "sentence",
    },
    {
      id: "matching",
      title: "빈칸 채우기",
      description: "단어와 뜻을 연결하세요",
      icon: <Link2 className="w-4 h-4 sm:w-4 sm:h-4" />,
      color: "bg-pink-500",
      borderClass: "border-pink-500",
      repeatsToday: 0,
      startType: "blank",
    },
    {
      id: "writing",
      title: "작문",
      description: "문장을 직접 작성해보세요",
      icon: <PenTool className="w-4 h-4 sm:w-4 sm:h-4" />,
      color: "bg-rose-300",
      borderClass: "border-rose-300",
      repeatsToday: 0,
      startType: "writing",
    },
    {
      id: "speaking",
      title: "말하기 연습",
      description: "AI가 발음을 교정해드립니다",
      icon: <Mic className="w-4 h-4 sm:w-4 sm:h-4" />,
      color: "bg-indigo-500",
      borderClass: "border-indigo-500",
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
    { bgClass: string; textClass: string; label: string; accent: string }
  > = {
    Bronze: {
      bgClass: "bg-gradient-to-r from-amber-700 via-amber-600 to-amber-600",
      textClass: "text-white",
      label: "브론즈",
      accent: "bg-amber-600",
    },
    Silver: {
      bgClass: "bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400",
      textClass: "text-slate-800",
      label: "실버",
      accent: "bg-slate-300",
    },
    Gold: {
      bgClass: "bg-gradient-to-r from-amber-500 via-amber-300 to-yellow-300",
      textClass: "text-yellow-800",
      label: "골드",
      accent: "bg-yellow-400",
    },
    Platinum: {
      bgClass: "bg-gradient-to-r from-teal-200 via-cyan-200 to-indigo-300",
      textClass: "text-indigo-900",
      label: "플래티넘",
      accent: "bg-cyan-300",
    },
    Diamond: {
      bgClass: "bg-gradient-to-r from-cyan-200 via-sky-300 to-indigo-400",
      textClass: "text-sky-900",
      label: "다이아",
      accent: "bg-sky-300",
    },
    Master: {
      bgClass: "bg-gradient-to-r from-purple-200 via-purple-300 to-purple-500",
      textClass: "text-purple-900",
      label: "마스터",
      accent: "bg-purple-300",
    },
    Challenger: {
      bgClass: "bg-gradient-to-r from-pink-300 via-pink-500 to-rose-600",
      textClass: "text-rose-900",
      label: "챌린저",
      accent: "bg-pink-400",
    },
  };

  const chosen = tierStyles[tier] ?? tierStyles.Bronze;

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return String(rank);
  };

  // compute podium order from fetched topUsers (2,1,3)
  const podiumOrder = (() => {
    if (!topUsers || topUsers.length === 0) return [];
    // ensure sorted by rank asc
    const sorted = [...topUsers].sort((a, b) => a.rank - b.rank);
    // if less than 3, fill placeholders
    const a = sorted[1] ?? sorted[0] ?? null; // 2nd
    const b = sorted[0] ?? null; // 1st
    const c = sorted[2] ?? null; // 3rd
    return [a, b, c].filter(Boolean) as LeaderboardUser[];
  })();

  return (
    <div className="min-h-screen bg-white pb-20 text-foreground">
      <header className="bg-rose-500 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg sm:text-2xl font-extrabold leading-tight mb-0.5 truncate">
                안녕하세요, {displayName}님!
              </h1>
              <p className="text-white/90 text-sm sm:text-sm">
                오늘도 영어 학습을 시작해볼까요?
              </p>
            </div>

            <div className="mt-3 sm:mt-0 sm:ml-4">
              <div className="flex items-center gap-3 whitespace-nowrap overflow-x-auto">
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 text-sm font-semibold text-white sm:bg-opacity-20 border border-white/10">
                  <Flame className="w-4 h-4" />
                  <span className="leading-none">{streak}일</span>
                </div>

                <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 text-sm font-semibold text-white sm:bg-opacity-20 border border-white/10">
                  <Trophy className="w-4 h-4" />
                  <span className="leading-none">{displayLevel}</span>
                </div>

                <div
                  className={`${chosen.bgClass} rounded-full px-3 py-1.5 text-sm font-semibold flex items-center gap-2 border border-white/10`}
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
        <h2 className="text-base sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">
          학습 세션
        </h2>

        <ul className="space-y-3 sm:space-y-4">
          {steps.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => handleNavigateToTraining(s.startType)}
                onMouseEnter={() => prefetchQuestions(s.startType)}
                aria-label={s.title}
                className="group relative bg-white rounded-2xl p-3 sm:p-4 text-left cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 w-full border border-gray-300"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className={`w-10 h-10 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${s.color} text-white shadow-sm group-hover:scale-105 transition-transform duration-300 flex-shrink-0 ${s.borderClass} border`}
                  >
                    {s.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                        {s.title}
                      </h3>

                      <div className="flex-shrink-0 ml-auto flex items-center gap-2">
                        {prefetchingType === s.startType ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                            <Repeat className="w-3.5 h-3.5 text-rose-600" />
                            로딩...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                            <Repeat className="w-3.5 h-3.5 text-rose-600" />
                            <span className="font-semibold">
                              {s.repeatsToday}
                            </span>
                            <span className="text-foreground/60">회</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 truncate whitespace-nowrap overflow-hidden">
                      {s.description}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 self-start mt-1 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            </li>
          ))}
        </ul>

        {/* --- 통합된 리더보드 프리뷰 (실제 데이터 사용, 포디엄 하단 정렬 보정) --- */}
        <section className="mt-10 sm:mt-12">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="sm:text-xl font-bold flex items-center gap-2 text-gray-900">
                <Trophy className="w-5 h-5 text-amber-500" />
                리더보드
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                상위 학습자들과 경쟁해보세요
              </p>
            </div>

            {/* "더보기" 버튼을 h2와 평행선상에 배치 */}
            <div className="ml-4 flex items-center">
              <button
                onClick={() => navigate("/leaderboard")}
                className="text-sm font-medium text-rose-500 hover:underline px-3 py-1 rounded-md"
                aria-label="전체 순위 보기"
              >
                전체 순위 확인하기
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-300 p-5 pb-0 pt-2">
            {leaderLoading ? (
              <div className="flex items-center justify-center p-8"></div>
            ) : !topUsers || topUsers.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                리더보드 정보를 불러올 수 없습니다.
              </div>
            ) : (
              <div className="flex items-end justify-center gap-4">
                {podiumOrder.map((user) => {
                  const isFirst = user.rank === 1;
                  const columnHeightClass = isFirst
                    ? "h-[250px]"
                    : user.rank === 2
                    ? "h-[225px]"
                    : "h-[200px]";

                  const podiumBlockHeightClass = isFirst
                    ? "h-[100px]"
                    : user.rank === 2
                    ? "h-[80px]"
                    : "h-[70px]";

                  const podiumBgClass =
                    user.rank === 1
                      ? "bg-gradient-to-b from-yellow-300 to-yellow-500"
                      : user.rank === 2
                      ? "bg-gradient-to-b from-slate-200 to-gray-400"
                      : "bg-gradient-to-b from-orange-300 to-amber-500";

                  return (
                    <div
                      key={user.rank}
                      className={`flex-1 max-w-[140px] flex flex-col justify-between items-center overflow-hidden ${columnHeightClass}`}
                    >
                      {/* Top area: medal, name, score, streak */}
                      <div className="px-2 pt-3 w-full flex flex-col items-center gap-2">
                        <div className="text-5xl mb-1">
                          {getMedalIcon(user.rank)}
                        </div>
                        <div className="text-center w-full">
                          <div className="font-semibold text-base text-gray-900 truncate max-w-[120px] mx-auto">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {user.score.toLocaleString()}P
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-full border border-rose-100 mt-2 mb-2">
                          <Flame className="w-3 h-3 text-rose-500" />
                          <span className="font-semibold text-xs text-rose-700">
                            {user.streak ?? 0}
                          </span>
                        </div>
                      </div>

                      {/* Podium block: stick to bottom using mt-auto */}
                      <div
                        className={`w-full mt-auto flex items-center justify-center shadow-md ${podiumBlockHeightClass} rounded-t-2xl overflow-hidden`}
                      >
                        <div
                          className={`w-full h-full flex items-center justify-center text-2xl font-extrabold text-white ${podiumBgClass}`}
                        >
                          {user.rank}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 하단의 전체 순위 보기 버튼은 제거하고, 상단의 더보기 버튼으로 대체했습니다 */}
        </section>
      </main>
    </div>
  );
};

export default HomePage;
