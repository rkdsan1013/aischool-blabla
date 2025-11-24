// src/pages/HomeLeaderBoard.tsx
import React, { useEffect, useState } from "react";
import { Flame, Crown } from "lucide-react";
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
    bgClass: "bg-gradient-to-r from-amber-700 via-amber-600 to-amber-500",
    textClass: "text-white",
    label: "브론즈",
  },
  Silver: {
    bgClass: "bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500",
    textClass: "text-white",
    label: "실버",
  },
  Gold: {
    bgClass: "bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600",
    textClass: "text-amber-900",
    label: "골드",
  },
  Platinum: {
    bgClass: "bg-gradient-to-r from-cyan-300 via-cyan-400 to-indigo-300",
    textClass: "text-indigo-900",
    label: "플래티넘",
  },
  Diamond: {
    bgClass: "bg-gradient-to-r from-sky-300 via-sky-400 to-indigo-400",
    textClass: "text-sky-900",
    label: "다이아",
  },
  Master: {
    bgClass: "bg-gradient-to-r from-purple-300 via-purple-400 to-purple-600",
    textClass: "text-purple-900",
    label: "마스터",
  },
  Challenger: {
    bgClass: "bg-gradient-to-r from-pink-400 via-rose-500 to-rose-600",
    textClass: "text-rose-900",
    label: "챌린저",
  },
};

const Avatar: React.FC<{ name?: string; size?: number }> = ({
  name = "익명",
  size = 48,
}) => {
  const initials = String(name)
    .split(" ")
    .map((s) => s[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-bold"
      style={{
        width: size,
        height: size,
        background:
          "linear-gradient(135deg, rgba(236,72,153,1) 0%, rgba(239,68,68,1) 50%, rgba(99,102,241,1) 100%)",
      }}
    >
      <span className="text-sm">{initials}</span>
    </div>
  );
};

const getMedal = (rank?: number) => {
  if (rank === 1)
    return {
      color: "text-yellow-500",
      bg: "bg-yellow-100",
      crownColor: "text-yellow-400",
    };
  if (rank === 2)
    return {
      color: "text-slate-400",
      bg: "bg-slate-100",
      crownColor: "text-slate-400",
    };
  if (rank === 3)
    return {
      color: "text-amber-600",
      bg: "bg-amber-100",
      crownColor: "text-amber-600",
    };
  return {
    color: "text-gray-400",
    bg: "bg-gray-100",
    crownColor: "text-gray-400",
  };
};

const HomeLeaderBoard: React.FC = () => {
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

  return (
    <div className="w-screen h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col overflow-hidden">
      {/* Header (full width, vivid gradient) */}
      <header className="w-full flex-shrink-0">
        <div className="w-full bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white px-6 py-5 flex items-center gap-4">
          <Flame className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-extrabold leading-tight">리더보드</h1>
            <p className="text-rose-100 text-xs mt-0.5">
              전 세계 학습자와 경쟁
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full overflow-y-auto">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-rose-200 border-t-rose-500" />
              <p className="text-sm text-gray-500">로딩 중...</p>
            </div>
          </div>
        ) : error ? (
          <div className="w-full px-6 py-6">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          </div>
        ) : (
          <>
            {/* Top 3 highlight (full width, centered, colorful) */}
            <section className="w-full bg-gradient-to-b from-rose-50/60 to-transparent border-b border-gray-200">
              <div className="w-full flex justify-center items-end gap-8 py-8 px-4">
                {/* 2nd */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center">
                      <Avatar name={items[1]?.name} size={64} />
                    </div>
                    <div className="absolute -top-2 -right-2">
                      <Crown
                        className={`w-6 h-6 ${
                          getMedal(items[1]?.rank).crownColor
                        }`}
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-xs font-extrabold text-slate-600">
                    2
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground truncate max-w-[140px] text-center">
                    {items[1]?.name ?? "—"}
                  </div>
                  <div className="text-xs text-foreground/60">
                    {Math.round(items[1]?.score ?? 0)}pt
                  </div>
                </div>

                {/* 1st */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="absolute -inset-3 bg-yellow-300 rounded-full blur-xl opacity-30" />
                    <div className="w-24 h-24 rounded-full bg-white shadow-2xl flex items-center justify-center">
                      <Avatar name={items[0]?.name} size={96} />
                    </div>
                    <div className="absolute -bottom-3 -right-3 bg-yellow-400 text-white rounded-full px-3 py-1 text-sm font-semibold shadow">
                      {items[0]?.rank ?? 1}
                    </div>
                  </div>
                  <div className="mt-3 text-lg font-extrabold text-foreground truncate max-w-[220px] text-center">
                    {items[0]?.name ?? "—"}
                  </div>
                  <div className="text-sm text-foreground/60">
                    {Math.round(items[0]?.score ?? 0)}pt
                  </div>
                </div>

                {/* 3rd */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-white shadow-md flex items-center justify-center">
                      <Avatar name={items[2]?.name} size={64} />
                    </div>
                    <div className="absolute -top-2 -right-2">
                      <Crown
                        className={`w-6 h-6 ${
                          getMedal(items[2]?.rank).crownColor
                        }`}
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-xs font-extrabold text-amber-600">
                    3
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground truncate max-w-[120px] text-center">
                    {items[2]?.name ?? "—"}
                  </div>
                  <div className="text-xs text-foreground/60">
                    {Math.round(items[2]?.score ?? 0)}pt
                  </div>
                </div>
              </div>
            </section>

            {/* Full-width ranking list (no outer margins) */}
            <section className="w-full">
              {/* header row */}
              <div className="w-full grid grid-cols-12 gap-4 items-center px-6 py-3 bg-white border-b sticky top-0 z-10">
                <div className="col-span-1 text-sm text-gray-500">#</div>
                <div className="col-span-6 text-sm text-gray-500">이름</div>
                <div className="col-span-3 text-sm text-gray-500">티어</div>
                <div className="col-span-2 text-sm text-gray-500 text-right">
                  점수
                </div>
              </div>

              {/* rows */}
              <div className="divide-y">
                {items.map((it) => {
                  const medal = getMedal(it.rank);
                  const tier = it.tier ?? "Bronze";
                  const tierStyle = tierStyles[tier] ?? tierStyles.Bronze;
                  return (
                    <div
                      key={it.id}
                      className={`w-full grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-rose-50 transition-colors`}
                    >
                      <div
                        className={`col-span-1 text-sm font-bold ${medal.color}`}
                      >
                        {it.rank}
                      </div>

                      <div className="col-span-6 flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center font-semibold text-rose-600">
                          {String(it.name || "익명")
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{it.name}</div>
                          <div className="text-xs text-foreground/60">
                            활동 중
                          </div>
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
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default HomeLeaderBoard;
