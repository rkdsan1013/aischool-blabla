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

// [수정됨] 실제 프로필 타입 정의 확장
type LocalProfileContext = {
  profile: (UserProfileResponse & { tier?: string; score?: number }) | null;
  isLoading?: boolean;
  loading?: boolean;
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

  // --- [수정됨] 실제 프로필 데이터 사용 ---
  // 값이 없으면 기본값("Bronze", 0) 사용
  const tier = profile.tier ?? "Bronze";
  const score = profile.score ?? 0;
  // --- [수정 완료] ---

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

  // --- Leaderboard preview data (간단한 프리뷰) ---
  // 실제는 /api/leaderboard/top 같은 엔드포인트에서 받아오면 됩니다.
  const [leaderPreview, setLeaderPreview] = useState<
    { id: string; name: string; score: number; tier?: string }[] | null
  >(null);
  const [leaderLoading, setLeaderLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchPreview = async () => {
      setLeaderLoading(true);
      try {
        const res = await fetch("/api/leaderboard?limit=3");
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          setLeaderPreview(json?.data ?? json ?? []);
        } else {
          setLeaderPreview([]);
        }
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

  return (
    <div className="min-h-screen bg-white pb-20">
      <header className="bg-rose-500 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-base sm:text-2xl font-bold mb-0.5 truncate">
                안녕하세요, {displayName}님!
              </h1>
              <p className="text-white/80 text-xs sm:text-sm">
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
                className="border-2 border-gray-200 group relative bg-card rounded-2xl p-3 sm:p-4 text-left cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 w-full"
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
                            <Repeat className="w-3.5 h-3.5 text-rose-600" />
                            <span className="font-semibold">
                              {s.repeatsToday}
                            </span>
                            <span className="text-foreground/60">회</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground truncate whitespace-nowrap overflow-hidden">
                      {s.description}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0 self-start mt-1 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            </li>
          ))}
        </ul>

        {/* --- Leaderboard 섹션 추가 --- */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-xl font-bold">리더보드</h2>
            <button
              type="button"
              onClick={() => navigate("/leaderboard")}
              className="text-sm text-rose-600 font-semibold hover:underline"
            >
              전체 보기
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 간단한 탑3 프리뷰 카드 */}
            {leaderLoading ? (
              <div className="col-span-1 sm:col-span-3 flex items-center justify-center p-6 border rounded-2xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
              </div>
            ) : (
              <>
                {leaderPreview && leaderPreview.length > 0 ? (
                  leaderPreview.map((u, idx) => (
                    <button
                      key={u.id}
                      onClick={() => navigate(`/leaderboard/${u.id}`)}
                      className="text-left border-2 border-gray-100 rounded-2xl p-3 hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold truncate">
                              {u.name}
                            </div>
                            <div className="text-sm text-foreground/60">
                              {u.tier ?? ""}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {u.score}pt
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="col-span-1 sm:col-span-3 p-4 border rounded-2xl text-sm text-muted-foreground">
                    리더보드 정보를 불러올 수 없습니다.
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
