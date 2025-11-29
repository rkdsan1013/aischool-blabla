// frontend/src/pages/MyPageHistory.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Calendar,
  MessageCircle,
  X,
  BookOpen,
  Clock,
  Trophy,
  Filter,
  ChevronLeft,
  Search,
} from "lucide-react";
import { getMyHistory, type HistoryRecord } from "../services/userService";

const CustomDropdown: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  id?: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ value, onChange, options, id, label, icon }) => {
  const uidRef = useRef(id ?? `cd-${Math.random().toString(36).slice(2, 9)}`);
  const uid = uidRef.current;
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: Event) {
      if (!btnRef.current || !panelRef.current) return;
      const target = e.target as Node | null;
      if (
        target &&
        (btnRef.current.contains(target) || panelRef.current.contains(target))
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, [open]);

  const toggleOpen = () => setOpen((s) => !s);
  const onOptionClick = (index: number) => {
    onChange(options[index].value);
    setOpen(false);
  };

  return (
    <div className="relative w-full">
      {label && (
        <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <button
        ref={btnRef}
        id={uid}
        type="button"
        onClick={toggleOpen}
        className={`w-full flex items-center justify-between rounded-xl px-4 py-3 bg-white border border-gray-200 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 ${
          open ? "ring-2 ring-rose-500/20 border-rose-500" : ""
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-gray-400">{icon}</span>}
          <span
            className={`truncate ${
              value === "all" ? "text-gray-500" : "text-gray-900 font-medium"
            }`}
          >
            {options.find((o) => o.value === value)?.label}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      <div
        ref={panelRef}
        className={`absolute z-50 w-full rounded-xl bg-white shadow-xl border border-gray-100 transform transition-all duration-200 ease-out origin-top mt-2 ${
          open
            ? "opacity-100 scale-y-100"
            : "opacity-0 scale-y-95 pointer-events-none"
        }`}
      >
        <ul className="max-h-60 overflow-auto py-1.5 scrollbar-hide">
          {options.map((opt, i) => {
            const selected = opt.value === value;
            return (
              <li
                key={opt.value}
                onClick={() => onOptionClick(i)}
                className={`cursor-pointer px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                  selected
                    ? "bg-rose-50 text-rose-600 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
                {selected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (seconds?: number) => {
  if (seconds === undefined) return "";
  if (seconds < 60) return "<1분";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}분 ${s}초`;
};

const MyPageHistory: React.FC = () => {
  const navigate = useNavigate();

  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getMyHistory();
        setHistoryData(data);
      } catch (error) {
        console.error("Failed to load history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const allSubTypes = Array.from(new Set(historyData.map((r) => r.subType)));
  const trainingSubTypes = Array.from(
    new Set(
      historyData.filter((r) => r.type === "TRAINING").map((r) => r.subType)
    )
  );
  const conversationSubTypes = Array.from(
    new Set(
      historyData.filter((r) => r.type === "CONVERSATION").map((r) => r.subType)
    )
  );

  const toDayStart = (d?: string) =>
    d ? new Date(d + "T00:00:00").getTime() : null;
  const toDayEnd = (d?: string) =>
    d ? new Date(d + "T23:59:59.999").getTime() : null;

  const filteredHistory = historyData.filter((item) => {
    const itemTime = new Date(item.date).getTime();
    const s = toDayStart(startDate);
    const e = toDayEnd(endDate);

    if (s && itemTime < s) return false;
    if (e && itemTime > e) return false;
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (subCategoryFilter !== "all" && item.subType !== subCategoryFilter)
      return false;

    return true;
  });

  const typeOptions = [
    { value: "all", label: "전체 기록" },
    { value: "CONVERSATION", label: "회화 연습" },
    { value: "TRAINING", label: "학습 세션" },
  ];

  const subCategoryOptions = (() => {
    let list: string[] = [];
    if (typeFilter === "CONVERSATION") {
      list = conversationSubTypes;
    } else if (typeFilter === "TRAINING") {
      list = trainingSubTypes;
    } else {
      list = allSubTypes;
    }

    return [
      { value: "all", label: "전체 카테고리" },
      ...list.map((s) => ({ value: s, label: s })),
    ];
  })();

  useEffect(() => {
    setSubCategoryFilter("all");
  }, [typeFilter]);

  // [수정됨] 상세 페이지 이동 핸들러
  // ID가 이미 순수 숫자이므로 그대로 사용합니다.
  const handleItemClick = (item: HistoryRecord) => {
    if (item.type === "CONVERSATION") {
      navigate(`/history/ai/${item.id}`);
    } else if (item.type === "TRAINING") {
      // 숫자 ID 그대로 URL로 전달 (예: /history/training/20)
      navigate(`/history/training/${item.id}`);
    } else {
      console.warn("Unknown history type:", item.type);
    }
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setTypeFilter("all");
    setSubCategoryFilter("all");
  };

  const hasActiveFilters =
    startDate || endDate || typeFilter !== "all" || subCategoryFilter !== "all";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/my")}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
              aria-label="뒤로 가기"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              학습 히스토리
            </h1>
          </div>

          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`p-2 rounded-full transition-colors sm:hidden ${
              hasActiveFilters
                ? "bg-rose-50 text-rose-600"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Filters */}
        <div
          className={`bg-white rounded-3xl border border-gray-200 p-5 shadow-sm transition-all duration-300 ${
            isFilterOpen ? "block" : "hidden sm:block"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Filter className="w-4 h-4 text-rose-500" />
              필터 검색
            </h2>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-medium text-gray-500 hover:text-rose-500 flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                초기화
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CustomDropdown
              id="history-type"
              label="학습 유형"
              value={typeFilter}
              onChange={setTypeFilter}
              options={typeOptions}
              icon={<BookOpen className="w-4 h-4" />}
            />

            <CustomDropdown
              id="history-subcategory"
              label="카테고리"
              value={subCategoryFilter}
              onChange={setSubCategoryFilter}
              options={subCategoryOptions}
              icon={<Filter className="w-4 h-4" />}
            />

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">
                시작일
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">
                종료일
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-gray-900 text-lg">최근 활동</h3>
            <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
              총 {filteredHistory.length}개
            </span>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 border-dashed">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-900 font-medium mb-1">기록이 없습니다</p>
              <p className="text-gray-500 text-sm">
                {hasActiveFilters
                  ? "검색 조건을 변경해보세요."
                  : "새로운 학습을 시작해보세요!"}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredHistory.map((item) => {
                const isTraining = item.type === "TRAINING";

                return (
                  <div
                    // [중요] ID 중복 방지를 위해 key는 type+id 조합 사용
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleItemClick(item)}
                    className="group relative bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md hover:border-rose-100 transition-all duration-300 cursor-pointer hover:-translate-y-1 active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border transition-transform duration-300 group-hover:scale-110 ${
                          isTraining
                            ? "bg-indigo-50 text-indigo-500 border-indigo-100"
                            : "bg-rose-50 text-rose-500 border-rose-100"
                        }`}
                      >
                        {isTraining ? (
                          <BookOpen className="w-6 h-6" />
                        ) : (
                          <MessageCircle className="w-6 h-6" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-base sm:text-lg font-bold text-gray-900 truncate group-hover:text-rose-600 transition-colors">
                            {item.title}
                          </h4>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap border ${
                              isTraining
                                ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                                : "bg-rose-50 text-rose-600 border-rose-100"
                            }`}
                          >
                            {item.subType}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(item.date)}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span>{formatTime(item.date)}</span>
                        </div>

                        {isTraining ? (
                          <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="flex items-center gap-1.5">
                              <Trophy className="w-4 h-4 text-amber-500" />
                              <span className="text-sm font-bold text-gray-900">
                                {item.score}점
                              </span>
                            </div>
                            <div className="w-px h-3 bg-gray-300" />
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {formatDuration(item.durationSeconds)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-sm text-gray-600 line-clamp-1 mb-2 font-medium">
                              "{item.preview || "대화 내용 없음"}"
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{item.messageCount}개의 메시지</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyPageHistory;
