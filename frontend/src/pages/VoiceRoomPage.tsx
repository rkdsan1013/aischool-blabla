// frontend/src/pages/VoiceRoomPage.tsx
// cspell:ignore voiceroom

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Lock,
  Plus,
  Radio,
  Sparkles,
  Search,
  Loader2,
} from "lucide-react";
import VoiceRoomService from "../services/voiceroomService";
import type { VoiceRoom } from "../services/voiceroomService";
import { useProfile } from "../hooks/useProfile";

/**
 * UI에서 사용하는 Room 타입
 */
interface PreviewUser {
  id: number;
  name: string;
  image: string | null;
}

interface Room {
  id: string;
  name: string | null;
  topic: string | null;
  host: string | null;
  participants: number | null;
  maxParticipants: number | null;
  level: string | null;
  isPrivate: boolean | null;
  previewUsers: PreviewUser[];
}

export default function VoiceRoomPage() {
  const navigate = useNavigate();

  // 전역 상태에서 유저 정보 가져오기
  const { profile, isProfileLoading } = useProfile();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [query, setQuery] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 로그인 체크
  useEffect(() => {
    if (!isProfileLoading && !profile) {
      navigate("/auth");
    }
  }, [profile, isProfileLoading, navigate]);

  // 방 목록 조회
  const fetchRooms = async (isBackground = false) => {
    try {
      if (!isBackground) setIsLoading(true);

      const data: VoiceRoom[] = await VoiceRoomService.getRooms();

      const mapped: Room[] = data.map((v) => {
        // 참여자 미리보기 정보 파싱
        // Format: "id|name|img, ..."
        let previews: PreviewUser[] = [];
        if (v.preview_users) {
          previews = v.preview_users.split(",").map((str) => {
            // [수정] 변수명 변경 (uimg -> userImage) 하여 스펠링 체크 경고 회피
            const [userIdStr, userName, userImage] = str.split("|");
            return {
              id: Number(userIdStr),
              name: userName || "User",
              image: userImage !== "null" && userImage ? userImage : null,
            };
          });
        }

        return {
          id: String(v.room_id),
          name: v.name ?? null,
          topic: v.description ?? null,
          host: v.host_name ?? "알 수 없음",
          participants: v.current_participants ?? 0,
          maxParticipants:
            v.max_participants !== undefined && v.max_participants !== null
              ? Number(v.max_participants)
              : null,
          level: v.level ?? null,
          isPrivate: null,
          previewUsers: previews,
        };
      });

      // 최신순 정렬
      mapped.sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));
      setRooms(mapped);
      if (!isBackground) setErrorMessage(null);
    } catch (err: unknown) {
      console.error("보이스룸 목록 로드 실패:", err);
      if (!isBackground) {
        setErrorMessage(
          "보이스룸을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
        );
        setRooms([]);
      }
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  // 초기 로드 및 폴링
  useEffect(() => {
    let mounted = true;

    // 1. 최초 실행
    fetchRooms();

    // 2. 방금 나간 방 업데이트를 위한 빠른 재조회
    const refreshTimeout = setTimeout(() => {
      if (mounted) fetchRooms(true);
    }, 300);

    // 3. 주기적 갱신 (3초마다)
    const intervalId = setInterval(() => {
      if (mounted) fetchRooms(true);
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(refreshTimeout);
      clearInterval(intervalId);
    };
  }, []);

  const handleJoinRoom = (roomId: string) => {
    navigate(`/voiceroom/${roomId}`);
  };

  const handleCreateRoom = () => {
    navigate("/voiceroom/create");
  };

  // 검색 필터링
  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    const baseList = !q
      ? rooms
      : rooms.filter((r) => {
          return (
            (r.name ?? "").toLowerCase().includes(q) ||
            (r.topic ?? "").toLowerCase().includes(q) ||
            (r.host ?? "").toLowerCase().includes(q) ||
            (r.level ?? "").toLowerCase().includes(q)
          );
        });

    return [...baseList].sort(
      (a, b) => parseInt(b.id, 10) - parseInt(a.id, 10)
    );
  }, [rooms, query]);

  // 렌더링
  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Hero Section */}
      <div className="bg-linear-to-b from-rose-50 to-white border-b border-rose-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="text-center space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-100 text-rose-700 rounded-full text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>실시간 음성 채팅</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
              함께 대화하며
              <br />
              <span className="text-rose-500">실력을 키워보세요</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed px-2">
              전 세계 학습자들과 실시간으로 연결되어 자연스러운 대화를 나누고
              언어 실력을 향상시키세요
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleCreateRoom}
              className="w-full max-w-md flex items-center justify-center gap-2 sm:gap-3 h-12 sm:h-14 bg-rose-500 text-white text-base sm:text-lg font-semibold rounded-xl hover:bg-rose-600 transition-all active:scale-[0.98] shadow-lg shadow-rose-500/25"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              새로운 방 만들기
            </button>

            <div className="w-full max-w-lg">
              <label htmlFor="room-search" className="sr-only">
                방 검색
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-gray-400" />
                </span>
                <input
                  id="room-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="방 이름, 주제, 호스트, 레벨로 검색하세요"
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 bg-white text-sm sm:text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Room List Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
              활성 방 목록
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              지금 {filteredRooms.length}개의 방이 검색되었습니다
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
            <span>실시간 업데이트</span>
          </div>
        </div>

        {/* 로딩 상태 표시 */}
        {isLoading && rooms.length === 0 && (
          <div className="min-h-[200px] flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
          </div>
        )}

        {/* 에러 메시지 */}
        {errorMessage && (
          <div className="text-center text-sm text-red-600 mb-4">
            {errorMessage}
          </div>
        )}

        {/* 방 목록 그리드 */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {filteredRooms.map((room, index) => {
              const participants = room.participants ?? 0;
              const maxParticipants = room.maxParticipants ?? 8;
              const levelLabel = room.level ?? "전체";
              const hostLabel = room.host ?? "알 수 없음";
              const topicLabel = room.topic ?? "설명 없음";

              return (
                <div
                  key={room.id}
                  className="group bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 p-4 sm:p-6 hover:border-rose-200 hover:shadow-xl transition-all duration-300 active:scale-[0.99] sm:hover:-translate-y-1"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Room Header */}
                  <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-rose-500 transition-colors truncate">
                          {room.name ?? "이름 없음"}
                        </h3>
                        {room.isPrivate && (
                          <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed line-clamp-2">
                        {topicLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs sm:text-sm font-semibold shrink-0">
                      <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {levelLabel}
                    </div>
                  </div>

                  {/* Room Stats */}
                  <div className="flex items-center gap-4 sm:gap-6 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {/* 참여자 프로필 표시 */}
                        {room.previewUsers.map((user) => (
                          <div
                            key={user.id}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden"
                            title={user.name}
                          >
                            {user.image ? (
                              <img
                                src={user.image}
                                alt={user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-rose-400 text-white text-xs font-bold">
                                {user.name.charAt(0)}
                              </div>
                            )}
                          </div>
                        ))}
                        {/* 빈 슬롯 플레이스홀더 (옵션) */}
                        {room.previewUsers.length < Math.min(participants, 3) &&
                          [
                            ...Array(
                              Math.min(participants, 3) -
                                room.previewUsers.length
                            ),
                          ].map((_, i) => (
                            <div
                              key={`placeholder-${i}`}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 border-2 border-white animate-pulse"
                            />
                          ))}
                      </div>
                      <div className="text-xs sm:text-sm">
                        <span className="font-semibold text-gray-900">
                          {participants}
                        </span>
                        <span className="text-gray-500">
                          /{maxParticipants}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 truncate">
                      호스트:{" "}
                      <span className="font-semibold text-gray-900">
                        {hostLabel}
                      </span>
                    </div>
                  </div>

                  {/* Join Button */}
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={participants >= maxParticipants}
                    className={`w-full h-11 sm:h-12 rounded-xl font-semibold text-sm sm:text-base transition-all ${
                      participants >= maxParticipants
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-rose-500 text-white hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-500/25 active:scale-[0.98]"
                    }`}
                  >
                    {participants >= maxParticipants
                      ? "방이 가득 찼습니다"
                      : "입장하기"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State (if no rooms after filtering) */}
        {!isLoading && filteredRooms.length === 0 && rooms.length > 0 && (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Users className="w-7 h-7 sm:w-8 sm:h-8 text-rose-500" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              검색 결과가 없습니다
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              다른 키워드로 검색해보거나 새로운 방을 만들어보세요.
            </p>
            <button
              onClick={handleCreateRoom}
              className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-rose-500 text-white text-sm sm:text-base font-semibold rounded-xl hover:bg-rose-600 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />방 만들기
            </button>
          </div>
        )}

        {/* Empty State (no rooms at all) */}
        {!isLoading && rooms.length === 0 && (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Users className="w-7 h-7 sm:w-8 sm:h-8 text-rose-500" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              아직 활성화된 방이 없습니다
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              첫 번째 방을 만들어 대화를 시작해보세요!
            </p>
            <button
              onClick={handleCreateRoom}
              className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-rose-500 text-white text-sm sm:text-base font-semibold rounded-xl hover:bg-rose-600 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />방 만들기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
