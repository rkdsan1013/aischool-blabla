// src/pages/HomeLeaderBoard.tsx
import React, { useEffect, useState } from "react";
import { Crown, ChevronLeft, Trophy, Medal } from "lucide-react";
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

// --- Styles ---
const tierStyles: Record<
  string,
  { bgClass: string; textClass: string; label: string }
> = {
  Bronze: {
    bgClass: "bg-amber-100 border-amber-200",
    textClass: "text-amber-700",
    label: "Bronze",
  },
  Silver: {
    bgClass: "bg-slate-100 border-slate-200",
    textClass: "text-slate-700",
    label: "Silver",
  },
  Gold: {
    bgClass: "bg-yellow-100 border-yellow-200",
    textClass: "text-yellow-700",
    label: "Gold",
  },
  Platinum: {
    bgClass: "bg-cyan-100 border-cyan-200",
    textClass: "text-cyan-700",
    label: "Platinum",
  },
  Diamond: {
    bgClass: "bg-sky-100 border-sky-200",
    textClass: "text-sky-700",
    label: "Diamond",
  },
  Master: {
    bgClass: "bg-purple-100 border-purple-200",
    textClass: "text-purple-700",
    label: "Master",
  },
  Challenger: {
    bgClass: "bg-rose-100 border-rose-200",
    textClass: "text-rose-700",
    label: "Challenger",
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
      className={`rounded-full flex items-center justify-center font-bold text-white shadow-md border-2 ${borderColor} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)", // Rose gradient
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

    // 막대바 높이
    const height = isFirst ? "h-24 sm:h-32" : "h-16 sm:h-24";

    const avatarSize = isFirst ? 80 : 64;
    const crownColor =
      rank === 1
        ? "text-yellow-300"
        : rank === 2
        ? "text-gray-300"
        : "text-amber-600";

    // Podium Styles
    const podiumColor =
      rank === 1
        ? "bg-gradient-to-t from-yellow-500/20 to-yellow-300/10 border-yellow-400/30"
        : rank === 2
        ? "bg-gradient-to-t from-slate-400/20 to-slate-300/10 border-slate-400/30"
        : "bg-gradient-to-t from-amber-600/20 to-amber-500/10 border-amber-500/30";

    const ringColor =
      rank === 1
        ? "ring-yellow-400"
        : rank === 2
        ? "ring-slate-300"
        : "ring-amber-600";

    return (
      <div
        className={`flex flex-col items-center justify-end ${
          isFirst ? "-mt-6 z-10" : ""
        }`}
      >
        <div className="relative flex flex-col items-center mb-3">
          <Crown
            className={`w-6 h-6 sm:w-8 sm:h-8 mb-1 absolute -top-8 sm:-top-10 drop-shadow-md animate-bounce ${crownColor}`}
            fill="currentColor"
          />
          <div
            className={`rounded-full p-1 ring-2 ${ringColor} ring-offset-2 ring-offset-rose-500`}
          >
            <Avatar
              name={user.name}
              size={avatarSize}
              borderColor="border-transparent"
            />
          </div>
          <div className="bg-rose-700/80 backdrop-blur-sm text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-full -mt-3 z-10 border border-white/20">
            {user.tier ?? "Bronze"}
          </div>
        </div>

        <div className="text-center mb-2">
          <p className="font-bold text-white text-sm sm:text-base truncate max-w-20 sm:max-w-[120px]">
            {user.name}
          </p>
          <p className="text-white/90 text-xs sm:text-sm font-medium">
            {user.score.toLocaleString()} P
          </p>
        </div>

        {/* Podium Box */}
        <div
          className={`w-20 sm:w-28 ${height} rounded-t-xl border-x border-t flex items-start justify-center pt-2 backdrop-blur-sm ${podiumColor}`}
        >
          <span
            className={`text-2xl sm:text-4xl font-black ${
              rank === 1 ? "text-yellow-300" : "text-white/50"
            }`}
          >
            {rank}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* --- Top Section (Header + Podium) --- */}
      <div className="bg-linear-to-br from-rose-500 to-pink-600 pb-8 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-indigo-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-2xl mx-auto px-4 relative z-10">
          {/* Navbar */}
          <div className="flex items-center justify-between py-4 sm:py-6 text-white">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors backdrop-blur-md"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-300" />
              리더보드
            </h1>
            <div className="w-10" /> {/* Spacer */}
          </div>

          {/* ✅ [수정됨] 상단 텍스트 제거 및 충분한 여백(mt-16) 확보로 왕관 겹침 방지 */}
          <div className="mt-16 sm:mt-20">
            {/* Podium */}
            {!loading && !error && items.length > 0 && (
              <div className="flex justify-center items-end gap-2 sm:gap-6">
                {renderPodium(top2, 2)}
                {renderPodium(top1, 1)}
                {renderPodium(top3, 3)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- List Section --- */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4 relative z-20">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500 mb-4" />
              <p className="text-gray-400 text-sm">랭킹 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 text-red-500 text-sm">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
              데이터가 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {restItems.map((item) => {
                const ts =
                  tierStyles[item.tier ?? "Bronze"] ?? tierStyles.Bronze;
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-rose-50/50 transition-colors group"
                  >
                    <div className="w-8 text-center font-bold text-gray-400 text-lg sm:text-xl shrink-0">
                      {item.rank}
                    </div>

                    <Avatar name={item.name} size={42} className="shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 truncate">
                          {item.name}
                        </span>
                        {item.rank && item.rank <= 10 && (
                          <Medal className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${ts.bgClass} ${ts.textClass}`}
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
        </div>
      </main>
    </div>
  );
};

export default HomeLeaderBoard;
