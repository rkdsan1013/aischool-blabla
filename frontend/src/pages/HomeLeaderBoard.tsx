// src/pages/HomeLeaderBoard.tsx
import React, { useEffect, useState } from "react";
import { Crown, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getLeaderboard } from "../services/leaderboardService";

type LeaderItem = {
  id: string;
  name: string;
  score: number;
  tier?: string;
  rank?: number;
};

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

/** Avatar: 프로필 색상 통일(rose-500) — 오버레이 없음 (요청에 따라 프로필마다 왕관 씌우지 않음)
 *  glowColor만으로 은/금/동 광채를 표현 (border 제거)
 */
const Avatar: React.FC<{
  name?: string;
  size?: number;
  glowColor?: string | null;
}> = ({ name = "익명", size = 48, glowColor = null }) => {
  const initials = String(name)
    .split(" ")
    .map((s) => (s ? s[0] : ""))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const px = `${size}px`;
  const textSize =
    size >= 96
      ? "text-2xl"
      : size >= 80
      ? "text-xl"
      : size >= 64
      ? "text-base"
      : "text-sm";

  // glowColor이 있을 때 더 넓고 부드러운 그림자 사용
  const style: React.CSSProperties = {
    width: px,
    height: px,
    boxShadow: glowColor
      ? `0 8px 30px ${glowColor}, 0 2px 6px rgba(0,0,0,0.06)`
      : undefined,
  };

  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center bg-rose-500 text-white font-bold flex-shrink-0`}
      style={style}
      aria-hidden="true"
    >
      <span className={textSize}>{initials}</span>
    </div>
  );
};

const getMedal = (rank?: number) => {
  if (rank === 1)
    return {
      color: "text-yellow-500",
      crownColor: "text-yellow-400",
    };
  if (rank === 2)
    return {
      color: "text-slate-400",
      crownColor: "text-slate-400",
    };
  if (rank === 3)
    return {
      color: "text-amber-600",
      crownColor: "text-amber-600",
    };
  return {
    color: "text-gray-400",
    crownColor: "text-gray-400",
  };
};

/** rank 색상(금/은/동)
 *  - 보더(테두리) 제거: 색상은 bgGradient + glow로만 표현
 *  - 은색(rank 2)의 glow를 충분히 크게 하고 alpha를 높여 가시성 확보
 *  - 동색(rank 3)도 적절히 강화
 */
const rankColorInfo = (rank?: number) => {
  if (rank === 1)
    return {
      crown: "#EAB308",
      // gold: 강한 노란빛, 넓은 blur로 눈에 띄게
      glow: "rgba(234,179,8,0.22)",
      // 리스트용 작은 그림자(약간 더 연하게)
      smallGlow: "rgba(234,179,8,0.16)",
      bgGradient: "linear-gradient(180deg,#fff8eb,#fff6e6)",
    };
  if (rank === 2)
    return {
      // silver: 기존보다 밝고 푸른빛을 약간 섞어 시인성 향상
      crown: "#9AA6B2",
      // 은색 glow를 넓고 투명도를 높여 금색과 비슷한 존재감 부여
      glow: "rgba(154,166,178,0.36)",
      smallGlow: "rgba(154,166,178,0.20)",
      bgGradient: "linear-gradient(180deg,#f6f8fa,#eef3f7)",
    };
  if (rank === 3)
    return {
      crown: "#C05621",
      // bronze: 따뜻한 주황빛을 살리고 glow 강화
      glow: "rgba(192,86,33,0.22)",
      smallGlow: "rgba(192,86,33,0.16)",
      bgGradient: "linear-gradient(180deg,#fff7ef,#fff4ec)",
    };
  return {
    crown: "#94A3B8",
    glow: "rgba(148,163,184,0.12)",
    smallGlow: "rgba(148,163,184,0.08)",
    bgGradient: "linear-gradient(180deg,#f8fafc,#f1f5f9)",
  };
};

/** Tier + Score badge (header-style compact)
 *  size: "md" (default large), "sm" (small), "xs" (extra small, compact)
 */
const TierScoreBadge: React.FC<{
  tier?: string;
  score?: number;
  size?: "sm" | "md" | "xs";
}> = ({ tier = "Bronze", score = 0, size = "sm" }) => {
  const ts = tierStyles[tier] ?? tierStyles.Bronze;

  const padding =
    size === "md"
      ? "px-3 py-1.5 text-sm"
      : size === "sm"
      ? "px-2 py-0.5 text-xs"
      : "px-1.5 py-0.5 text-[11px]";
  const scoreTextClass =
    size === "md" ? "text-sm" : size === "sm" ? "text-xs" : "text-[11px]";
  const gapClass = size === "md" ? "gap-2" : "gap-1";

  return (
    <div
      className={`${ts.bgClass} rounded-full ${padding} font-semibold flex items-center ${gapClass} border border-white/10 whitespace-nowrap`}
      title={`티어: ${ts.label} · 점수: ${Math.round(score)}pt`}
      aria-hidden="true"
    >
      <span className={`${ts.textClass} truncate`}>{ts.label}</span>
      <span
        className={`ml-1 bg-white/20 px-2 py-0.5 rounded-full ${scoreTextClass} whitespace-nowrap`}
      >
        <span className={ts.textClass}>{Math.round(score)}pt</span>
      </span>
    </div>
  );
};

const HomeLeaderBoard: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<LeaderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getLeaderboard({ limit: 500 });
        if (!mounted) return;
        const arr: LeaderItem[] = Array.isArray(data) ? data : [];
        arr.sort((a, b) => {
          if (typeof a.rank === "number" && typeof b.rank === "number")
            return a.rank - b.rank;
          return (b.score ?? 0) - (a.score ?? 0);
        });
        const normalized = arr.map((it, idx) => ({
          ...it,
          rank: it.rank ?? idx + 1,
        }));
        setItems(normalized);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? "데이터를 불러오는 중 오류가 발생했습니다.");
        setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchLeaderboard();
    return () => {
      mounted = false;
    };
  }, []);

  const top1 = items[0] ?? null;
  const top2 = items[1] ?? null;
  const top3 = items[2] ?? null;

  return (
    <div className="min-h-screen w-full bg-white">
      {/* 상단 히어로 */}
      <header className="w-full bg-gradient-to-b from-rose-100/90 via-white/60 to-white">
        <div className="relative w-full md:max-w-5xl md:mx-auto px-0 md:px-4 lg:px-6 py-6 sm:py-8 pb-0 text-center">
          <div className="absolute right-4 top-4">
            <button
              aria-label="닫기"
              onClick={() => navigate(-1)}
              className="p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-rose-200"
            >
              <X className="w-5 h-5 text-rose-400" />
            </button>
          </div>

          <div className="mt-6 sm:mt-8 lg:mt-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
              리더보드에서
            </h1>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-rose-500 leading-tight">
              순위를 올려보세요
            </h1>
          </div>

          {/* Top3 영역 (왕관 아이콘 유지, 보더 제거 — glow로만 표현) */}
          <div className="w-full mt-8">
            <div className="flex justify-center items-end gap-10 px-4 md:px-8">
              {/* 2위 */}
              <div className="flex flex-col items-center">
                <div
                  className="relative rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    width: "84px",
                    height: "84px",
                    backgroundImage: rankColorInfo(top2?.rank).bgGradient,
                    // border 제거: glow로만 강조
                    boxShadow: `0 10px 40px ${rankColorInfo(top2?.rank).glow}`,
                    borderRadius: "9999px",
                  }}
                >
                  <Avatar
                    name={top2?.name}
                    size={72}
                    glowColor={rankColorInfo(top2?.rank).glow}
                  />
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm md:text-base font-semibold text-foreground truncate max-w-[150px]">
                  <Crown
                    className="w-4 h-4 md:w-5 md:h-5"
                    style={{ color: rankColorInfo(top2?.rank).crown }}
                  />
                  <span className="truncate">{top2?.name ?? "—"}</span>
                </div>

                <div className="mt-2">
                  <TierScoreBadge
                    tier={top2?.tier}
                    score={top2?.score}
                    size="xs"
                  />
                </div>
              </div>

              {/* 1위 */}
              <div className="flex flex-col items-center">
                <div
                  className="relative rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    width: "120px",
                    height: "120px",
                    backgroundImage: rankColorInfo(top1?.rank).bgGradient,
                    boxShadow: `0 18px 60px ${rankColorInfo(top1?.rank).glow}`,
                    borderRadius: "9999px",
                  }}
                >
                  <Avatar
                    name={top1?.name}
                    size={104}
                    glowColor={rankColorInfo(top1?.rank).glow}
                  />
                </div>

                <div className="mt-4 flex items-center gap-2 text-lg md:text-2xl lg:text-3xl font-extrabold text-foreground truncate max-w-[240px]">
                  <Crown
                    className="w-5 h-5 md:w-6 md:h-6"
                    style={{ color: rankColorInfo(top1?.rank).crown }}
                  />
                  <span className="truncate">{top1?.name ?? "—"}</span>
                </div>

                <div className="mt-2">
                  <TierScoreBadge
                    tier={top1?.tier}
                    score={top1?.score}
                    size="sm"
                  />
                </div>
              </div>

              {/* 3위 */}
              <div className="flex flex-col items-center">
                <div
                  className="relative rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    width: "64px",
                    height: "64px",
                    backgroundImage: rankColorInfo(top3?.rank).bgGradient,
                    boxShadow: `0 10px 36px ${rankColorInfo(top3?.rank).glow}`,
                    borderRadius: "9999px",
                  }}
                >
                  <Avatar
                    name={top3?.name}
                    size={56}
                    glowColor={rankColorInfo(top3?.rank).glow}
                  />
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm md:text-base font-semibold text-foreground truncate max-w-[130px]">
                  <Crown
                    className="w-4 h-4 md:w-5 md:h-5"
                    style={{ color: rankColorInfo(top3?.rank).crown }}
                  />
                  <span className="truncate">{top3?.name ?? "—"}</span>
                </div>

                <div className="mt-2">
                  <TierScoreBadge
                    tier={top3?.tier}
                    score={top3?.score}
                    size="xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 리스트 영역: 하단에서 1/2/3 숫자 자리에 상단과 동일한 왕관 아이콘을 배치 */}
      <main className="w-full bg-white">
        <div className="w-full md:max-w-5xl md:pb-24 md:mx-auto px-0 md:px-4 lg:px-6 py-6 sm:py-8 pb-0 divide-y divide-gray-100">
          {loading ? (
            <div className="w-full px-4 md:px-6 py-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-rose-200 border-t-rose-500" />
            </div>
          ) : error ? (
            <div className="w-full px-4 md:px-6 py-6">
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-500 text-sm">
                {error}
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="w-full px-4 md:px-6 py-12 text-center text-sm text-gray-500">
              순위 데이터가 없습니다.
            </div>
          ) : (
            items.map((it) => {
              const medal = getMedal(it.rank);
              const tier = it.tier ?? "Bronze";
              const tierStyle = tierStyles[tier] ?? tierStyles.Bronze;
              const rankInfo = rankColorInfo(it.rank);
              return (
                <div
                  key={it.id}
                  className="w-full grid grid-cols-12 gap-4 items-center px-4 md:px-6 py-4 hover:bg-rose-50 transition-colors"
                >
                  {/* rank: 1/2/3이면 상단과 동일한 Crown 아이콘을 표시, 그 외는 숫자 */}
                  <div
                    className={`col-span-1 text-sm font-bold ${medal.color} flex items-center justify-center`}
                  >
                    {it.rank && it.rank <= 3 ? (
                      <Crown
                        className="w-5 h-5 md:w-5 md:h-5"
                        style={{ color: rankInfo.crown }}
                        aria-hidden="true"
                      />
                    ) : (
                      <span>{it.rank}</span>
                    )}
                  </div>

                  {/* avatar + name */}
                  <div className="col-span-5 flex items-center gap-4 min-w-0 h-[40px] w-[170px]">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white bg-rose-500 flex-shrink-0`}
                      style={
                        it.rank && it.rank <= 3
                          ? {
                              // 리스트용은 작은 glow 사용
                              boxShadow: `0 6px 18px ${
                                rankInfo.smallGlow ?? rankInfo.glow
                              }`,
                            }
                          : undefined
                      }
                    >
                      {String(it.name || "익명")
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex items-center gap-1 overflow-hidden w-[100]">
                      <div className="font-medium truncate">{it.name}</div>
                    </div>
                  </div>

                  {/* spacer */}
                  <div className="col-span-1" />

                  {/* tier + score combined */}
                  <div className="col-span-5 flex items-center justify-end gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`${tierStyle.bgClass} rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-2 ${tierStyle.textClass}`}
                        title={`티어: ${tierStyle.label} · 점수: ${Math.round(
                          it.score
                        )}pt`}
                      >
                        <span className={tierStyle.textClass}>
                          {tierStyle.label}
                        </span>
                        <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                          <span className={tierStyle.textClass}>
                            {Math.round(it.score)}pt
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default HomeLeaderBoard;
