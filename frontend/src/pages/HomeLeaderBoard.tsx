// src/pages/HomeLeaderBoard.tsx
import React, { useEffect, useState } from "react";
import { ChevronLeft, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getLeaderboard } from "../services/leaderboardService";

// --- Types ---
type LeaderItem = {
  id: string;
  name: string;
  score: number;
  tier?: string;
  rank?: number;
};

// --- Styles (Unified with HomePage) ---
const tierStyles: Record<
  string,
  { bgClass: string; textClass: string; label: string }
> = {
  Bronze: {
    bgClass: "from-amber-100 to-amber-50 border-amber-200",
    textClass: "text-amber-800",
    label: "브론즈",
  },
  Silver: {
    bgClass: "from-slate-100 to-slate-50 border-slate-200",
    textClass: "text-slate-700",
    label: "실버",
  },
  Gold: {
    bgClass: "from-yellow-100 to-yellow-50 border-yellow-200",
    textClass: "text-yellow-800",
    label: "골드",
  },
  Platinum: {
    bgClass: "from-cyan-100 to-cyan-50 border-cyan-200",
    textClass: "text-cyan-800",
    label: "플래티넘",
  },
  Diamond: {
    bgClass: "from-sky-100 to-sky-50 border-sky-200",
    textClass: "text-sky-800",
    label: "다이아",
  },
  Master: {
    bgClass: "from-purple-100 to-purple-50 border-purple-200",
    textClass: "text-purple-800",
    label: "마스터",
  },
  Challenger: {
    bgClass: "from-rose-100 to-rose-50 border-rose-200",
    textClass: "text-rose-800",
    label: "챌린저",
  },
};

/**
 * Avatar Component
 */
const Avatar: React.FC<{
  name?: string;
  size?: number;
  className?: string;
  borderColor?: string;
}> = ({
  name = "익명",
  size = 48,
  className = "",
  borderColor = "border-white",
}) => {
  const initials = String(name)
    .split(" ")
    .map((s) => (s ? s[0] : ""))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shadow-sm border ${borderColor} ${className} bg-gray-100 text-gray-500`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
      }}
      aria-hidden="true"
    >
      {initials}
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
        const data = await getLeaderboard({ limit: 100 });
        if (!mounted) return;

        const arr: LeaderItem[] = Array.isArray(data)
          ? (data as LeaderItem[])
          : [];

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
      } catch (err: unknown) {
        if (!mounted) return;
        const msg =
          err instanceof Error
            ? err.message
            : "데이터를 불러오는 중 오류가 발생했습니다.";
        setError(msg);
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

  const top1 = items.find((i) => i.rank === 1);
  const top2 = items.find((i) => i.rank === 2);
  const top3 = items.find((i) => i.rank === 3);
  const restItems = items.filter((i) => (i.rank || 0) > 3);

  // --- Render Functions ---

  const renderPodium = (user: LeaderItem | undefined, rank: 1 | 2 | 3) => {
    if (!user) return <div className="flex-1" />;

    const isFirst = rank === 1;
    const height = isFirst ? "h-32 sm:h-40" : "h-20 sm:h-28";
    const avatarSize = isFirst ? 72 : 56;

    const ts = tierStyles[user.tier ?? "Bronze"] ?? tierStyles.Bronze;

    // Rank Colors (Light Pastel)
    const rankColor =
      rank === 1
        ? "bg-yellow-100 border-yellow-300 text-yellow-800"
        : rank === 2
        ? "bg-slate-100 border-slate-300 text-slate-700"
        : "bg-orange-100 border-orange-300 text-orange-800";

    const ringColor =
      rank === 1
        ? "border-yellow-400"
        : rank === 2
        ? "border-slate-400"
        : "border-orange-400";

    return (
      <div
        className={`flex flex-col items-center justify-end ${
          isFirst ? "-mt-8 z-10" : ""
        }`}
      >
        {/* Avatar Area */}
        <div className="relative flex flex-col items-center mb-3">
          <div className={`rounded-full p-1 border-2 ${ringColor} bg-white`}>
            <Avatar
              name={user.name}
              size={avatarSize}
              borderColor="border-transparent"
            />
          </div>

          {/* Tier Badge (Pill) */}
          <div
            className={`flex items-center gap-1 -mt-3 z-10 px-2 py-0.5 rounded-full border shadow-sm bg-linear-to-r ${ts.bgClass}`}
          >
            <span
              className={`text-[10px] sm:text-xs font-bold ${ts.textClass}`}
            >
              {ts.label}
            </span>
          </div>
        </div>

        {/* Text Info */}
        <div className="text-center mb-2">
          <p className="font-bold text-gray-900 text-sm sm:text-base truncate max-w-20 sm:max-w-[100px]">
            {user.name}
          </p>
          <p className="text-gray-500 text-xs sm:text-sm font-medium">
            {user.score.toLocaleString()} P
          </p>
        </div>

        {/* Podium Box */}
        <div
          className={`w-full sm:w-28 ${height} rounded-t-2xl border-x border-t flex items-start justify-center pt-3 shadow-inner ${rankColor}`}
        >
          <span className="text-2xl sm:text-4xl font-black opacity-40">
            {rank}
          </span>
        </div>
      </div>
    );
  };

  // [Modified]: Removed pb-16 md:pb-0 bottom padding
  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      {/* --- Header (Unified Style) --- */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
            aria-label="뒤로 가기"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            리더보드
          </h1>
        </div>
      </header>

      {/* --- Main Content (Unified Layout) --- */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Top 3 Section (Clean Card Style) */}
        <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8">
          {/* [Modified]: Added more margin-bottom (mb-12) for better spacing */}
          <div className="text-center mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              명예의 전당
            </h2>
            <p className="text-gray-500 text-sm">
              가장 열정적인 학습자들입니다
            </p>
          </div>

          {!loading && !error && items.length > 0 ? (
            <div className="flex justify-center items-end gap-3 sm:gap-6 border-b border-gray-100 pb-0">
              {renderPodium(top2, 2)}
              {renderPodium(top1, 1)}
              {renderPodium(top3, 3)}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400">
              {loading ? "불러오는 중..." : "데이터가 없습니다."}
            </div>
          )}
        </section>

        {/* List Section */}
        <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500 mb-4" />
              <p className="text-gray-400 text-sm">랭킹 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 text-red-500 text-sm">
              {error}
            </div>
          ) : restItems.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
              순위 데이터가 더 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {restItems.map((item) => {
                const ts =
                  tierStyles[item.tier ?? "Bronze"] ?? tierStyles.Bronze;
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-8 text-center font-bold text-gray-400 text-lg sm:text-xl shrink-0">
                      {item.rank}
                    </div>

                    <Avatar
                      name={item.name}
                      size={42}
                      className="shrink-0 border-gray-200"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 truncate">
                          {item.name}
                        </span>
                        {/* [Modified]: Removed Medal Icon */}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-medium bg-linear-to-r ${ts.bgClass} ${ts.textClass}`}
                        >
                          {ts.label}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="block font-bold text-rose-600 sm:text-lg">
                        {item.score.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400">Points</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default HomeLeaderBoard;
