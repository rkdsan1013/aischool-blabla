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
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfile";

// --- Helper: 시간 포맷팅 ---
const formatStudyTime = (totalSeconds: number) => {
  if (totalSeconds < 60) {
    return "1분 미만";
  }

  const totalMinutes = Math.floor(totalSeconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes}분`;
  }

  // 1시간 이상은 소수점 1자리까지 시간 단위로 표시 (예: 1.5시간)
  const hours = (totalMinutes / 60).toFixed(1);
  // 정수로 딱 떨어지면 .0 제거
  return hours.endsWith(".0") ? `${parseInt(hours)}시간` : `${hours}시간`;
};

// --- Components ---

const StatCard: React.FC<{
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}> = ({ icon, value, label }) => (
  <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 p-4 sm:p-6">
    <div className="flex flex-col items-center text-center">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-rose-500 flex items-center justify-center mb-3 sm:mb-4 shadow-md">
        {icon}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
        {value}
      </p>
      <p className="text-xs sm:text-sm text-gray-600 font-medium">{label}</p>
    </div>
  </div>
);

const NavigateRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}> = ({ icon, title, subtitle, onClick }) => (
  <div
    className="bg-white shadow rounded-xl p-4 flex items-center justify-between cursor-pointer hover:shadow-lg transition group"
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyPress={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        onClick();
      }
    }}
  >
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-rose-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <div>
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600">{subtitle}</p>
      </div>
    </div>
    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 group-hover:text-rose-500 group-hover:translate-x-1 transition-all duration-300" />
  </div>
);

// --- Attendance Grid Logic ---

const AttendanceGrid: React.FC<{
  data: { date: string; attended: boolean; count?: number }[];
}> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numWeeks, setNumWeeks] = useState(20);

  useEffect(() => {
    if (!containerRef.current) return;

    const calculateWeeks = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const availableWidth = width - 30;
        const itemSize = window.innerWidth >= 640 ? 17.5 : 15.5;
        const calculated = Math.floor(availableWidth / itemSize);
        setNumWeeks(Math.max(5, calculated));
      }
    };

    calculateWeeks();

    const resizeObserver = new ResizeObserver(() => {
      calculateWeeks();
    });

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
    if (isFuture) return "bg-transparent border border-gray-100";
    if (!item || !item.attended) return "bg-gray-100";
    const c = item.count ?? 1;
    if (c >= 4) return "bg-rose-700";
    if (c === 3) return "bg-rose-600";
    if (c === 2) return "bg-rose-500";
    return "bg-rose-400";
  };

  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-rose-500" />
          <span className="text-sm sm:text-base font-semibold text-gray-900">
            출석 그리드
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-gray-100" />
            <span className="text-xs text-gray-500">미출석</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-rose-400" />
            <span className="text-xs text-gray-500">1회</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-rose-600" />
            <span className="text-xs text-gray-500">3회+</span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex gap-2 w-full overflow-hidden">
        <div className="flex flex-col gap-[3px] pt-[0px]">
          {dayLabels.map((d) => (
            <div
              key={d}
              className="h-3 sm:h-3.5 flex items-center justify-end pr-1"
            >
              <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium">
                {d}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-[3px] flex-1">
          {gridData.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div
                  key={`${wi}-${di}`}
                  className={`
                    w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[2px] sm:rounded-sm 
                    ${getColor(day.item, day.isFuture)} 
                    transition-colors duration-200
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
    </div>
  );
};

// --- Main Page ---

const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthLoading, logout } = useAuth();
  const { profile, isProfileLoading } = useProfile();

  const isLoading = isAuthLoading || isProfileLoading;

  useEffect(() => {
    if (!isLoading && profile === null) {
      navigate("/");
    }
  }, [profile, isLoading, navigate]);

  const attendanceData = useMemo(() => {
    const today = new Date();
    const days = 365;
    const arr: { date: string; attended: boolean; count?: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${dd}`;

      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const attended = isWeekend ? Math.random() < 0.3 : Math.random() < 0.7;
      const count = attended ? Math.ceil(Math.random() * 5) : undefined;

      arr.push({ date: dateStr, attended, count });
    }
    return arr;
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const stats = {
    streak: profile.streak_count ?? 0,
    totalStudyTime: profile.total_study_time ?? 0, // 초 단위
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
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-rose-500 text-white p-4 sm:p-6 shadow-md">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 flex items-center justify-center text-2xl sm:text-3xl font-bold"
              aria-hidden
            >
              {profile.name ? profile.name.charAt(0) : profile.email.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <h1
                className="text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1 tracking-tight truncate"
                title={profile.name ?? profile.email}
              >
                {profile.name ?? profile.email}
              </h1>
              <p className="text-white/80 text-xs sm:text-sm">
                {profile.email}
              </p>
            </div>
          </div>

          <div className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-white/90" />
                <span className="font-semibold text-sm sm:text-base">
                  언어 수준 (CEFR)
                </span>
              </div>
              <span className="px-2 py-1 rounded bg-white/20 text-white text-xs sm:text-sm">
                {stats.currentLevel}
              </span>
            </div>

            <div
              className="w-full bg-white/20 h-2 rounded mb-2"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={stats.nextLevelProgress}
            >
              <div
                className="h-2 bg-gradient-to-r from-gray-100 to-white rounded"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, stats.nextLevelProgress)
                  )}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] sm:text-xs text-white/80">
              <span>다음 레벨까지</span>
              <span className="font-semibold">{stats.nextLevelProgress}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            출석 현황
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            매일의 학습 기록을 확인하세요 (우측이 오늘입니다)
          </p>
        </div>

        <div className="mb-6 sm:mb-8">
          <AttendanceGrid data={attendanceData} />
        </div>

        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            학습 통계
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            나의 학습 데이터 요약
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <StatCard
            icon={<Flame className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
            value={stats.streak}
            label="연속 학습일"
          />
          <StatCard
            icon={<Clock className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
            // [수정] 초 단위를 포맷팅하여 표시
            value={formatStudyTime(stats.totalStudyTime)}
            label="총 학습 시간"
          />
          <StatCard
            icon={<Award className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
            value={stats.completedLessons}
            label="완료한 레슨"
          />
        </div>

        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            계정 관리
          </h2>
        </div>

        <div className="space-y-2">
          <NavigateRow
            icon={<BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
            title="히스토리"
            subtitle="상세한 학습 기록을 확인하세요"
            onClick={handleOpenHistory}
          />

          <NavigateRow
            icon={<User className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
            title="프로필 관리"
            subtitle="개인정보를 수정하세요"
            onClick={handleOpenProfile}
          />
        </div>

        <div className="mt-6">
          <button
            className="w-full h-12 border border-rose-500 text-rose-500 rounded-xl font-semibold hover:bg-rose-50 transition"
            onClick={handleLogout}
            type="button"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyPage;
