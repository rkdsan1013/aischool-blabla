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

/** Avatar: 프로필 색상 통일(rose-500) */
const Avatar: React.FC<{
  name?: string;
  size?: number;
  glowColor?: string | null;
  ringColor?: string | null;
}> = ({ name = "익명", size = 48, glowColor = null, ringColor = null }) => {
  const initials = String(name)
    .split(" ")
    .map((s) => (s ? s[0] : ""))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const px = `${size}px`;
  const textSize =
    size >= 80 ? "text-xl" : size >= 64 ? "text-base" : "text-sm";

  const style: React.CSSProperties = {
    width: px,
    height: px,
    boxShadow: glowColor ? `0 8px 22px ${glowColor}` : undefined,
    border: ringColor ? `1.5px solid ${ringColor}` : undefined,
  };

  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center bg-rose-500 text-white font-bold`}
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

/** rank 색상(금/은/동) — 은색은 살짝 옅게 유지 */
const rankColorInfo = (rank?: number) => {
  if (rank === 1)
    return {
      crown: "#EAB308",
      glow: "rgba(234,179,8,0.12)",
      ring: "rgba(234,179,8,0.08)",
      bgGradient: "linear-gradient(180deg,#fff8eb,#fff6e6)",
    };
  if (rank === 2)
    return {
      crown: "#6B7280",
      glow: "rgba(107,114,128,0.10)",
      ring: "rgba(107,114,128,0.06)",
      bgGradient: "linear-gradient(180deg,#f8fafc,#f3f6fa)",
    };
  if (rank === 3)
    return {
      crown: "#C05621",
      glow: "rgba(192,86,33,0.10)",
      ring: "rgba(192,86,33,0.06)",
      bgGradient: "linear-gradient(180deg,#fff7ef,#fff4ec)",
    };
  return {
    crown: "#94A3B8",
    glow: "rgba(148,163,184,0.08)",
    ring: "rgba(148,163,184,0.05)",
    bgGradient: "linear-gradient(180deg,#f8fafc,#f1f5f9)",
  };
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
      {/* 상단 히어로: VoiceRoomCreate와 동일한 좌우/하단 여백 규격을 적용 */}
      <header
        className="w-full"
        style={{
          background:
            "linear-gradient(180deg, rgba(254,226,226,0.9) 0%, rgba(255,255,255,0.6) 35%, rgba(255,255,255,1) 70%)",
        }}
      >
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 text-center">
          {/* 우측 상단 X 유지 (위치: top-4로 살짝 올림) */}
          <div className="absolute right-4 top-4">
            <button
              aria-label="닫기"
              onClick={() => navigate(-1)}
              className="p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-rose-200"
            >
              <X className="w-5 h-5 text-rose-400" />
            </button>
          </div>

          {/* 제목 */}
          <div className="mt-6 sm:mt-8 lg:mt-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
              리더보드에서
            </h1>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-rose-500 leading-tight">
              순위를 올려보세요
            </h1>
          </div>

          {/* Top3 영역 */}
          <div className="w-full mt-8">
            <div className="flex justify-center items-end gap-10">
              {/* 2위 */}
              <div className="flex flex-col items-center">
                <div
                  className="relative rounded-full"
                  style={{
                    width: 72,
                    height: 72,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 9999,
                    background: rankColorInfo(top2?.rank).bgGradient,
                    boxShadow: `0 8px 22px ${rankColorInfo(top2?.rank).glow}`,
                  }}
                >
                  <Avatar
                    name={top2?.name}
                    size={64}
                    glowColor={rankColorInfo(top2?.rank).glow}
                    ringColor={rankColorInfo(top2?.rank).ring}
                  />
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-foreground truncate max-w-[160px]">
                  <Crown
                    className="w-4 h-4"
                    style={{ color: rankColorInfo(top2?.rank).crown }}
                  />
                  <span className="truncate">{top2?.name ?? "—"}</span>
                </div>

                <div className="text-xs text-foreground/60 mt-1">
                  {Math.round(top2?.score ?? 0)}pt
                </div>
              </div>

              {/* 1위 */}
              <div className="flex flex-col items-center">
                <div
                  className="relative rounded-full"
                  style={{
                    width: 112,
                    height: 112,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 9999,
                    background: rankColorInfo(top1?.rank).bgGradient,
                    boxShadow: `0 12px 36px ${rankColorInfo(top1?.rank).glow}`,
                  }}
                >
                  <Avatar
                    name={top1?.name}
                    size={96}
                    glowColor={rankColorInfo(top1?.rank).glow}
                    ringColor={rankColorInfo(top1?.rank).ring}
                  />
                </div>

                <div className="mt-4 flex items-center gap-2 text-lg font-extrabold text-foreground truncate max-w-[260px]">
                  <Crown
                    className="w-5 h-5"
                    style={{ color: rankColorInfo(top1?.rank).crown }}
                  />
                  <span className="truncate">{top1?.name ?? "—"}</span>
                </div>

                <div className="text-sm text-foreground/60 mt-1">
                  {Math.round(top1?.score ?? 0)}pt
                </div>
              </div>

              {/* 3위 */}
              <div className="flex flex-col items-center">
                <div
                  className="relative rounded-full"
                  style={{
                    width: 72,
                    height: 72,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 9999,
                    background: rankColorInfo(top3?.rank).bgGradient,
                    boxShadow: `0 8px 22px ${rankColorInfo(top3?.rank).glow}`,
                  }}
                >
                  <Avatar
                    name={top3?.name}
                    size={64}
                    glowColor={rankColorInfo(top3?.rank).glow}
                    ringColor={rankColorInfo(top3?.rank).ring}
                  />
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-foreground truncate max-w-[140px]">
                  <Crown
                    className="w-4 h-4"
                    style={{ color: rankColorInfo(top3?.rank).crown }}
                  />
                  <span className="truncate">{top3?.name ?? "—"}</span>
                </div>

                <div className="text-xs text-foreground/60 mt-1">
                  {Math.round(top3?.score ?? 0)}pt
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 리스트 영역: VoiceRoomCreate와 동일한 좌우/하단 여백 규격을 적용 */}
      <main className="w-full bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 divide-y divide-gray-100">
          {loading ? (
            <div className="w-full px-6 py-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-rose-200 border-t-rose-500" />
            </div>
          ) : error ? (
            <div className="w-full px-6 py-6">
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-500 text-sm">
                {error}
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="w-full px-6 py-12 text-center text-sm text-gray-500">
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
                  className="w-full grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-rose-50 transition-colors"
                >
                  <div
                    className={`col-span-1 text-sm font-bold ${medal.color}`}
                  >
                    {it.rank}
                  </div>

                  <div className="col-span-6 flex items-center gap-4 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white bg-rose-500 "
                      style={{
                        boxShadow:
                          it.rank && it.rank <= 3
                            ? `0 8px 22px ${rankInfo.glow}`
                            : undefined,
                        border:
                          it.rank && it.rank <= 3
                            ? `1.5px solid ${rankInfo.ring}`
                            : undefined,
                      }}
                    >
                      {String(it.name || "익명")
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex items-center gap-2">
                      {it.rank && it.rank <= 3 ? (
                        <Crown
                          className="w-4 h-4"
                          style={{ color: rankInfo.crown }}
                          aria-hidden
                        />
                      ) : null}
                      <div className="font-medium truncate">{it.name}</div>
                    </div>
                  </div>

                  <div className="col-span-3">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${tierStyle.bgClass} ${tierStyle.textClass}`}
                    >
                      {tierStyle.label}
                    </span>
                  </div>

                  <div className="col-span-2 text-right font-semibold">
                    {Math.round(it.score)}pt
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
