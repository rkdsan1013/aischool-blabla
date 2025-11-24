// src/pages/HomeLeaderBoard.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trophy, ChevronRight } from "lucide-react";
import { getLeaderboard } from "../services/leaderboardService";

type LeaderItem = {
  id: string;
  name: string;
  score: number;
  tier?: string;
  rank?: number;
};

const HomeLeaderBoard: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LeaderItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getLeaderboard({ limit: 50 });
        if (!mounted) return;
        setItems(data);
      } catch (err: any) {
        if (!mounted) return;
        // 서비스에서 던진 에러 메시지를 보여줌
        setError(err?.message ?? "네트워크 오류가 발생했습니다.");
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

  // 선택된 사용자 id가 URL에 있으면 강조 (선택 상세 페이지로 이동 가능)
  const selectedId = params.id;

  return (
    <div className="min-h-screen bg-white pb-20">
      <header className="bg-rose-500 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6" />
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">리더보드</h1>
              <p className="text-white/80 text-xs sm:text-sm">
                상위 학습자들의 순위를 확인하세요
              </p>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-sm text-white/90 bg-white/10 px-3 py-1 rounded-md hover:bg-white/20"
            >
              뒤로
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" />
          </div>
        ) : error ? (
          <div className="p-6 border rounded-2xl text-sm text-muted-foreground">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 border rounded-2xl text-sm text-muted-foreground">
            등록된 순위가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => navigate(`/leaderboard/${it.id}`)}
                className={`w-full text-left border-2 rounded-2xl p-3 flex items-center gap-3 hover:shadow transition ${
                  selectedId === it.id
                    ? "border-rose-300 bg-rose-50"
                    : "border-gray-100"
                }`}
              >
                <div className="w-12 flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-rose-50 flex items-center justify-center font-bold text-rose-600">
                    {it.rank}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold truncate">{it.name}</div>
                    <div className="text-sm text-foreground/60">
                      {it.tier ?? ""}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {it.score}pt
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HomeLeaderBoard;
