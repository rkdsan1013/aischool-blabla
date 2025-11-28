// frontend/src/pages/MyPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Flame,
  Clock,
  Award,
  BarChart3,
  Trophy,
  User,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfile";
import { getMyAttendance, type AttendanceStat } from "../services/userService";

// --- Helper: 시간 포맷팅 ---
const formatStudyTime = (totalSeconds: number) => {
  if (totalSeconds < 60) {
    return "<1분";
  }
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes}분`;
  }
  const hours = (totalMinutes / 60).toFixed(1);
  return hours.endsWith(".0") ? `${parseInt(hours)}시간` : `${hours}시간`;
};

// --- Components (원본 유지) ---

const StatCard: React.FC<{
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}> = ({ icon, value, label }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="flex flex-col items-center text-center">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3 sm:mb-4 shadow-sm border border-rose-100">
        {icon}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 tracking-tight">
        {value}
      </p>
      <p className="text-xs sm:text-sm text-gray-500 font-medium">{label}</p>
    </div>
  </div>
);

const NavigateRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  colorClass?: string;
  textClass?: string;
}> = ({
  icon,
  title,
  subtitle,
  onClick,
  colorClass = "bg-rose-50 text-rose-500 border-rose-100",
  textClass = "text-gray-900",
}) => (
  <div
    className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:shadow-lg hover:border-rose-200 transition-all duration-300 group active:scale-[0.99]"
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyPress={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        onClick();
      }
    }}
  >
    <div className="flex items-center gap-4">
      <div
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-sm border group-hover:scale-105 transition-transform duration-300 ${colorClass}`}
      >
        {icon}
      </div>
      <div>
        <h3
          className={`text-base sm:text-lg font-bold mb-0.5 group-hover:text-rose-600 transition-colors ${textClass}`}
        >
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300 group-hover:text-rose-500 group-hover:translate-x-1 transition-all duration-300" />
  </div>
);

// --- Attendance Grid Logic (원본 유지) ---

const AttendanceGrid: React.FC<{
  data: { date: string; attended: boolean; count?: number }[];
}> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numWeeks, setNumWeeks] = useState(20);
  const [selectedInfo, setSelectedInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const calculateWeeks = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const availableWidth = width - 34; // 라벨 + 패딩 공간

        // 아이템 사이즈 (Size + Gap)
        const itemSize = window.innerWidth >= 640 ? 26 : 20;

        const calculated = Math.floor(availableWidth / itemSize);
        setNumWeeks(Math.max(5, calculated));
      }
    };

    calculateWeeks();
    const resizeObserver = new ResizeObserver(() => calculateWeeks());
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const gridData = useMemo(() => {
    const dataMap = new Map(data.map((item) => [item.date, item]));

    const today = new Date();
    const endOfWeek = new Date(today);
    const dayOfWeek = endOfWeek.getDay();
    endOfWeek.setDate(today.getDate() + (6 - dayOfWeek));

    const weeks = [];
    const startDate = new Date(endOfWeek);
    startDate.setDate(endOfWeek.getDate() - numWeeks * 7 + 1);

    const current = new Date(startDate);

    for (let w = 0; w < numWeeks; w++) {
      const weekDays = [];
      for (let d = 0; d < 7; d++) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        const dd = String(current.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${dd}`;

        const isFuture = current > today;

        weekDays.push({
          date: new Date(current),
          dateStr,
          item: dataMap.get(dateStr),
          isFuture,
        });

        current.setDate(current.getDate() + 1);
      }
      weeks.push(weekDays);
    }
    return weeks;
  }, [data, numWeeks]);

  const getColor = (
    item?: { attended: boolean; count?: number },
    isFuture?: boolean
  ) => {
    if (isFuture) return "bg-gray-50 border border-gray-100";

    const base = "border border-transparent";

    if (!item || !item.attended) return `bg-gray-100 ${base}`;

    const c = item.count ?? 1;
    if (c >= 4) return `bg-rose-600 ${base}`;
    if (c === 3) return `bg-rose-500 ${base}`;
    if (c === 2) return `bg-rose-400 ${base}`;
    return `bg-rose-300 ${base}`;
  };

  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-rose-500" />
          <span className="text-base sm:text-lg font-bold text-gray-900">
            학습 그리드
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex gap-1 sm:gap-1.5 w-full overflow-hidden"
      >
        {/* 요일 라벨 */}
        <div className="flex flex-col gap-1 sm:gap-1.5 pt-0">
          {dayLabels.map((d) => (
            <div
              key={d}
              className="h-4 sm:h-5 flex items-center justify-end pr-1"
            >
              <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium">
                {d}
              </span>
            </div>
          ))}
        </div>

        {/* 메인 그리드 (가운데 정렬) */}
        <div className="flex gap-1 sm:gap-1.5 flex-1 justify-center">
          {gridData.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1 sm:gap-1.5">
              {week.map((day, di) => (
                <div
                  key={`${wi}-${di}`}
                  onClick={() => {
                    if (day.isFuture) return;
                    const count = day.item?.count ?? 0;
                    const text = day.item?.attended
                      ? `${day.dateStr}: ${count}회 학습 완료`
                      : `${day.dateStr}: 학습 기록 없음`;
                    setSelectedInfo(text);
                  }}
                  className={`
                    w-4 h-4 sm:w-5 sm:h-5 rounded-[3px] sm:rounded 
                    ${getColor(day.item, day.isFuture)} 
                    transition-all duration-200 cursor-pointer hover:scale-110 hover:ring-1 hover:ring-rose-200
                  `}
                  title={`${day.dateStr}${
                    day.isFuture
                      ? ""
                      : day.item?.attended
                      ? ` • 출석 (${day.item.count}회)`
                      : " • 미출석"
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 h-4 text-right">
        {selectedInfo ? (
          <span className="text-xs text-rose-600 font-bold animate-fade-in bg-rose-50 px-2 py-1 rounded-md">
            {selectedInfo}
          </span>
        ) : (
          <span className="text-xs text-gray-400">
            날짜를 클릭하여 기록을 확인하세요
          </span>
        )}
      </div>
    </div>
  );
};

// --- Main Page ---

const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthLoading, logout } = useAuth();
  const { profile, isProfileLoading } = useProfile();

  const [attendanceStats, setAttendanceStats] = useState<AttendanceStat[]>([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);

  const isLoading = isAuthLoading || isProfileLoading;

  useEffect(() => {
    if (!isLoading && profile === null) {
      navigate("/");
    }
  }, [profile, isLoading, navigate]);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (profile) {
        const data = await getMyAttendance();
        setAttendanceStats(data);
        setIsAttendanceLoading(false);
      }
    };
    if (!isProfileLoading && profile) {
      fetchAttendance();
    }
  }, [isProfileLoading, profile]);

  const gridInputData = useMemo(() => {
    return attendanceStats.map((stat) => ({
      date: stat.date,
      attended: stat.count > 0,
      count: stat.count,
    }));
  }, [attendanceStats]);

  if (isLoading || isAttendanceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const stats = {
    streak: profile.streak_count ?? 0,
    totalStudyTime: profile.total_study_time ?? 0,
    completedLessons: profile.completed_lessons ?? 0,
    currentLevel: profile.level ?? "A1",
    nextLevelProgress: profile.level_progress ?? 0,
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("[MyPage] logout failed:", err);
    } finally {
      navigate("/", { replace: true });
      window.location.reload();
    }
  };

  const handleOpenProfile = () => navigate("/my/profile");
  const handleOpenHistory = () => navigate("/my/history");

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-gray-900">
      {/* Header Section */}
      <div className="bg-white p-6 sm:p-8 shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 sm:gap-6 mb-6">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-3xl sm:text-4xl font-bold text-rose-500 shadow-sm">
              {profile.name ? profile.name.charAt(0) : profile.email.charAt(0)}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <h1
                className="text-2xl sm:text-3xl font-black mb-1 tracking-tight truncate text-gray-900"
                title={profile.name ?? profile.email}
              >
                {profile.name ?? profile.email}
              </h1>
              <p className="text-gray-500 text-sm sm:text-base font-medium">
                {profile.email}
              </p>
            </div>
          </div>

          {/* Level Progress Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm sm:text-base text-gray-900">
                  현재 레벨 (CEFR)
                </span>
              </div>
              <span className="px-3 py-1 rounded-lg bg-white text-rose-600 text-xs sm:text-sm font-bold border border-gray-200 shadow-sm">
                {stats.currentLevel}
              </span>
            </div>

            {/* Progress Bar Track */}
            <div
              className="w-full bg-gray-200 h-2.5 rounded-full mb-2 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={stats.nextLevelProgress}
            >
              {/* Progress Bar Fill */}
              <div
                className="h-full bg-linear-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, stats.nextLevelProgress)
                  )}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 font-medium">
              <span>다음 레벨까지</span>
              <span className="text-rose-600 font-bold">
                {stats.nextLevelProgress}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats Section (원본 유지) */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              학습 통계
            </h2>
            <p className="text-sm text-gray-500">
              나의 학습 데이터를 한눈에 확인하세요
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            <StatCard
              icon={<Flame className="w-6 h-6 sm:w-7 sm:h-7" />}
              value={stats.streak}
              label="연속 학습일"
            />
            <StatCard
              icon={<Clock className="w-6 h-6 sm:w-7 sm:h-7" />}
              value={formatStudyTime(stats.totalStudyTime)}
              label="총 학습 시간"
            />
            <StatCard
              icon={<Award className="w-6 h-6 sm:w-7 sm:h-7" />}
              value={stats.completedLessons}
              label="완료한 레슨"
            />
          </div>
        </section>

        {/* Attendance Section (원본 유지) */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              출석 현황
            </h2>
            <p className="text-sm text-gray-500">
              매일매일 꾸준함이 실력의 비결입니다
            </p>
          </div>
          <AttendanceGrid data={gridInputData} />
        </section>

        {/* Account Section (원본 유지) */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              계정 관리
            </h2>
          </div>

          <div className="space-y-3">
            <NavigateRow
              icon={
                <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500" />
              }
              title="히스토리"
              subtitle="상세한 학습 기록을 확인하세요"
              onClick={handleOpenHistory}
              colorClass="bg-indigo-50 border-indigo-100"
            />

            <NavigateRow
              icon={<User className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" />}
              title="프로필 관리"
              subtitle="개인정보 수정 및 회원탈퇴"
              onClick={handleOpenProfile}
              colorClass="bg-blue-50 border-blue-100"
            />
          </div>

          <div className="mt-8">
            {/* 로그아웃 버튼: 텍스트 스타일 유지, 컬러만 회색 계열로 변경하여 포인트 컬러 비중 조절 */}
            <button
              className="w-full h-14 border-2 border-gray-200 text-gray-500 rounded-2xl font-bold hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
              onClick={handleLogout}
              type="button"
            >
              <LogOut className="w-5 h-5" />
              로그아웃
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MyPage;
