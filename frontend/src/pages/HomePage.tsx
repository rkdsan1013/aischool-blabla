// frontend/src/pages/HomePage.tsx
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
  Sparkles,
} from "lucide-react";
import type { TrainingType } from "../services/trainingService";
import { useProfile } from "../hooks/useProfile";
import type { UserProfileResponse } from "../services/userService";
import { getLeaderboard } from "../services/leaderboardService";

// --- Types ---
type ExtendedProfile = Omit<
  Partial<UserProfileResponse>,
  "user_id" | "id" | "streak_count"
> & {
  user_id?: string | number;
  userId?: string | number;
  id?: string | number;
  streak_count?: number;
  streakCount?: number;
  streak?: number;
  tier?: string;
  score?: number;
};

interface RawLeaderboardItem {
  id?: string | number;
  rank?: number;
  name?: string;
  tier?: string;
  score?: number;
  streak_count?: number;
  streakCount?: number;
}

interface TrainingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  textClass: string;
  startType: TrainingType;
}

type LocalProfileContext = {
  profile: ExtendedProfile | null;
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
        const response = await getLeaderboard({ limit: 3 });
        const data = response as unknown as RawLeaderboardItem[];

        if (!mounted) return;

        const profileId = profile
          ? profile.user_id ?? profile.userId ?? profile.id
          : null;

        const mapped: LeaderboardUser[] = (data ?? []).map((d) => {
          const streakFromService = d.streak_count ?? d.streakCount;
          const itemIdStr = d.id ? String(d.id) : undefined;
          const profileIdStr = profileId ? String(profileId) : undefined;

          const isCurrentUser =
            (itemIdStr && profileIdStr && itemIdStr === profileIdStr) ||
            (!itemIdStr && !!profileIdStr);

          const fallbackStreak = isCurrentUser
            ? profile?.streak_count ?? profile?.streakCount ?? 0
            : 0;

          return {
            id: itemIdStr,
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
  }, [profile]);

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
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
      icon: <BookOpen className="w-5 h-5" />,
      textClass: "text-rose-600",
      startType: "vocabulary",
    },
    {
      id: "sentence",
      title: "문장 배열",
      description: "단어를 올바른 순서로 배열하세요",
      icon: <ListOrdered className="w-5 h-5" />,
      textClass: "text-orange-600",
      startType: "sentence",
    },
    {
      id: "matching",
      title: "빈칸 채우기",
      description: "문맥에 맞는 단어를 선택하세요",
      icon: <Link2 className="w-5 h-5" />,
      textClass: "text-amber-600",
      startType: "blank",
    },
    {
      id: "writing",
      title: "작문",
      description: "주어진 주제로 문장을 작성해보세요",
      icon: <PenTool className="w-5 h-5" />,
      textClass: "text-emerald-600",
      startType: "writing",
    },
    {
      id: "speaking",
      title: "말하기 연습",
      description: "AI 튜터와 발음을 교정해보세요",
      icon: <Mic className="w-5 h-5" />,
      textClass: "text-indigo-600",
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
  const displayLevel = profile.level ?? "Level Test";
  const streak = profile.streak_count ?? 0;
  const tier = profile.tier ?? "Bronze";
  const score = profile.score ?? 0;

  const tierStyles: Record<
    string,
    { bgClass: string; textClass: string; label: string; iconColor: string }
  > = {
    Bronze: {
      bgClass: "from-amber-100 to-amber-50 border-amber-200",
      textClass: "text-amber-800",
      label: "브론즈",
      iconColor: "text-amber-600",
    },
    Silver: {
      bgClass: "from-slate-100 to-slate-50 border-slate-200",
      textClass: "text-slate-700",
      label: "실버",
      iconColor: "text-slate-500",
    },
    Gold: {
      bgClass: "from-yellow-100 to-yellow-50 border-yellow-200",
      textClass: "text-yellow-800",
      label: "골드",
      iconColor: "text-yellow-600",
    },
    Platinum: {
      bgClass: "from-cyan-100 to-cyan-50 border-cyan-200",
      textClass: "text-cyan-800",
      label: "플래티넘",
      iconColor: "text-cyan-600",
    },
    Diamond: {
      bgClass: "from-sky-100 to-sky-50 border-sky-200",
      textClass: "text-sky-800",
      label: "다이아",
      iconColor: "text-sky-600",
    },
    Master: {
      bgClass: "from-purple-100 to-purple-50 border-purple-200",
      textClass: "text-purple-800",
      label: "마스터",
      iconColor: "text-purple-600",
    },
    Challenger: {
      bgClass: "from-rose-100 to-rose-50 border-rose-200",
      textClass: "text-rose-800",
      label: "챌린저",
      iconColor: "text-rose-600",
    },
  };

  const chosenTier = tierStyles[tier] ?? tierStyles.Bronze;

  // [Deleted] Removed unused getMedalIcon function

  const podiumOrder = (() => {
    if (!topUsers || topUsers.length === 0) return [];
    const sorted = [...topUsers].sort((a, b) => a.rank - b.rank);
    const a = sorted[1] ?? sorted[0] ?? null;
    const b = sorted[0] ?? null;
    const c = sorted[2] ?? null;
    return [a, b, c].filter(Boolean) as LeaderboardUser[];
  })();

  // [Unified Layout]: pb-16 (모바일 네비바 높이만큼만 확보) / md:pb-0 (데스크탑은 여백 제거)
  return (
    <div className="min-h-screen bg-slate-50 pb-16 md:pb-0 text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                안녕하세요, <span className="text-rose-500">{displayName}</span>
                님!
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                오늘도 목표를 향해 달려볼까요?
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
              <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 shrink-0">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                <span className="text-sm font-bold text-orange-700">
                  {streak}일
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 shrink-0">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-bold text-indigo-700">
                  {displayLevel}
                </span>
              </div>
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-linear-to-r ${chosenTier.bgClass} shrink-0`}
              >
                <Trophy className={`w-4 h-4 ${chosenTier.iconColor}`} />
                <span className={`text-sm font-bold ${chosenTier.textClass}`}>
                  {chosenTier.label}
                </span>
                <div
                  className={`w-px h-3 bg-current opacity-20 mx-0.5 ${chosenTier.textClass}`}
                />
                <span className={`text-sm font-medium ${chosenTier.textClass}`}>
                  {score.toLocaleString()} P
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              학습 세션
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-1">
            {steps.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleNavigateToTraining(s.startType)}
                onMouseEnter={() => prefetchQuestions(s.startType)}
                className="group relative bg-white rounded-2xl p-4 sm:p-5 text-left border border-gray-200 shadow-sm hover:shadow-md hover:border-rose-100 transition-all duration-300 active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  {/* [Modified]: Added shadow-sm for distinguished feeling */}
                  <div
                    className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center bg-gray-50 border border-gray-100 shadow-sm ${s.textClass} transition-transform duration-300 group-hover:scale-110`}
                  >
                    {s.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-gray-900 text-base sm:text-lg group-hover:text-rose-600 transition-colors">
                        {s.title}
                      </h3>
                      {prefetchingType === s.startType && (
                        <span className="text-xs font-medium text-rose-500 bg-rose-50 px-2 py-1 rounded-lg animate-pulse">
                          준비중...
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {s.description}
                    </p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                리더보드
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                상위권 학습자들과 경쟁해보세요
              </p>
            </div>
            <button
              onClick={() => navigate("/leaderboard")}
              className="text-sm font-bold text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              전체 보기
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
            {leaderLoading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300" />
              </div>
            ) : !topUsers || topUsers.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                아직 랭킹 정보가 없습니다.
              </div>
            ) : (
              // Refactored Podium Structure to match HomeLeaderBoard.tsx
              <div className="flex items-end justify-center gap-3 sm:gap-6 pt-4 pb-2 border-b border-gray-100 mb-0">
                {podiumOrder.map((user) => {
                  const isFirst = user.rank === 1;
                  const heightClass = isFirst
                    ? "h-32 sm:h-40"
                    : user.rank === 2
                    ? "h-20 sm:h-28"
                    : "h-20 sm:h-28";

                  const avatarSize = isFirst ? 72 : 56;
                  const userTierStyle =
                    tierStyles[user.tier ?? "Bronze"] ?? tierStyles.Bronze;

                  // High Contrast Rank Colors
                  const rankColor =
                    user.rank === 1
                      ? "bg-yellow-100 border-yellow-300 text-yellow-800"
                      : user.rank === 2
                      ? "bg-slate-100 border-slate-300 text-slate-700"
                      : "bg-orange-100 border-orange-300 text-orange-800";

                  const ringColor =
                    user.rank === 1
                      ? "border-yellow-400"
                      : user.rank === 2
                      ? "border-slate-400"
                      : "border-orange-400";

                  return (
                    <div
                      key={user.rank}
                      className="flex-1 max-w-[120px] flex flex-col items-center group"
                    >
                      <div className="mb-3 flex flex-col items-center gap-1 text-center transition-transform duration-300 group-hover:-translate-y-1 relative">
                        {/* 1. Avatar Ring/Container */}
                        <div
                          className={`rounded-full p-1 border-2 ${ringColor} bg-white`}
                        >
                          {/* [Modified]: Single Letter Avatar & Unified Style (bg-gray-100 text-gray-500) */}
                          <div
                            className="rounded-full flex items-center justify-center font-bold shadow-sm bg-gray-100 text-gray-500"
                            style={{
                              width: avatarSize,
                              height: avatarSize,
                              fontSize: avatarSize * 0.4,
                            }}
                          >
                            {user.name.slice(0, 1).toUpperCase()}
                          </div>
                        </div>

                        {/* 2. Tier Badge (Pill) - NEW */}
                        <div
                          className={`flex items-center gap-1 -mt-3 z-10 px-2 py-0.5 rounded-full border shadow-xs bg-linear-to-r ${userTierStyle.bgClass}`}
                        >
                          <span
                            className={`text-[10px] sm:text-xs font-bold ${userTierStyle.textClass}`}
                          >
                            {userTierStyle.label}
                          </span>
                        </div>

                        {/* 3. Name & Score */}
                        <div className="mt-2 flex flex-col items-center">
                          <div className="font-bold text-sm text-gray-900 truncate w-20 sm:w-24">
                            {user.name}
                          </div>
                          <div className="text-xs font-medium text-gray-500">
                            {user.score.toLocaleString()} P
                          </div>
                        </div>
                      </div>

                      {/* 4. Podium Box (Unified Styling) */}
                      <div
                        className={`w-full rounded-t-2xl shadow-inner border-t border-x ${rankColor} ${heightClass} flex items-start justify-center pt-3 relative overflow-hidden`}
                      >
                        <span className="text-2xl sm:text-4xl font-black opacity-40">
                          {user.rank}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
