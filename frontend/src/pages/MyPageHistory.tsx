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
} from "lucide-react";
import { getMyHistory, type HistoryRecord } from "../services/userService";

// --- Components ---

/* CustomDropdown: 필터 선택을 위한 드롭다운 컴포넌트 */
const CustomDropdown: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  id?: string;
  label?: React.ReactNode;
}> = ({ value, onChange, options, id, label }) => {
  const uidRef = useRef(id ?? `cd-${Math.random().toString(36).slice(2, 9)}`);
  const uid = uidRef.current;
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    options.findIndex((o) => o.value === value)
  );

  useEffect(() => {
    setActiveIndex(options.findIndex((o) => o.value === value));
  }, [value, options]);

  // [수정] 외부 클릭 감지 로직 개선
  // 1. open 상태일 때만 리스너 부착 (불필요한 이벤트 감지 방지)
  // 2. 외부 클릭 시 focus() 호출 제거 (스크롤 튐 방지)
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
      // [중요] btnRef.current?.focus(); <-- 이 코드가 스크롤 튐의 원인이었으므로 삭제함
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, [open]); // open 상태가 변할 때만 이펙트 재실행

  // 드롭다운 열릴 때 포커스 이동 (키보드 접근성)
  useEffect(() => {
    if (open && panelRef.current) {
      const el = panelRef.current.querySelector<HTMLElement>(
        '[data-selected="true"]'
      ) as HTMLElement | null;
      if (el) {
        el.focus();
        el.scrollIntoView({ block: "nearest" });
      } else {
        const first = panelRef.current.querySelector<HTMLElement>(
          'li[role="option"]'
        ) as HTMLElement | null;
        first?.focus();
      }
    }
  }, [open]);

  const toggleOpen = () => setOpen((s) => !s);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(options.length - 1, i === -1 ? 0 : i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.max(0, i === -1 ? 0 : i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else if (activeIndex >= 0) {
        onChange(options[activeIndex].value);
        setOpen(false);
        btnRef.current?.focus(); // 키보드로 선택했을 때는 포커스 복귀 유지
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      btnRef.current?.focus(); // ESC 닫기는 포커스 복귀 유지
    }
  };

  const onOptionClick = (index: number) => {
    onChange(options[index].value);
    setOpen(false);
    // 마우스 클릭 시에는 포커스를 강제로 버튼으로 옮기지 않음 (자연스러운 흐름 유지)
  };

  return (
    <div className="relative inline-block w-full">
      {label}
      <button
        ref={btnRef}
        id={uid}
        aria-haspopup="listbox"
        aria-expanded={open}
        type="button"
        onClick={toggleOpen}
        onKeyDown={onKeyDown}
        className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 bg-white border border-gray-200 text-sm transition focus:outline-none focus:ring-2 focus:ring-rose-300"
      >
        <span className="truncate">
          {options.find((o) => o.value === value)?.label}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
          aria-hidden
        />
      </button>

      <div
        ref={panelRef}
        role="listbox"
        aria-labelledby={uid}
        tabIndex={-1}
        className={`absolute z-50 w-full rounded-md bg-white shadow-sm ring-1 ring-gray-100 transform transition-all duration-200 ease-out ${
          open
            ? "opacity-100 scale-y-100 pointer-events-auto"
            : "opacity-0 scale-y-75 pointer-events-none"
        } top-full mt-2 origin-top`}
        style={{ maxHeight: "14rem" }}
        onKeyDown={onKeyDown}
      >
        <ul className="max-h-56 overflow-auto py-1">
          {options.map((opt, i) => {
            const selected = opt.value === value;
            const isActive = i === activeIndex;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                data-selected={selected ? "true" : "false"}
                onClick={() => onOptionClick(i)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                  selected
                    ? "bg-rose-50 text-rose-700"
                    : isActive
                    ? "bg-gray-100"
                    : "bg-white"
                }`}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

// --- Helpers ---
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

// --- Main Page Component ---
const MyPageHistory: React.FC = () => {
  const navigate = useNavigate();

  // 데이터 상태
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 필터 상태
  const [startDate, setStartDate] = useState<string>(""); // yyyy-mm-dd
  const [endDate, setEndDate] = useState<string>(""); // yyyy-mm-dd
  const [typeFilter, setTypeFilter] = useState<string>("all"); // all | CONVERSATION | TRAINING
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>("all");

  // 데이터 로드
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

  // 서브 카테고리 목록 (동적 생성)
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

  // 날짜 범위 계산
  const toDayStart = (d?: string) =>
    d ? new Date(d + "T00:00:00").getTime() : null;
  const toDayEnd = (d?: string) =>
    d ? new Date(d + "T23:59:59.999").getTime() : null;

  // 필터링 로직
  const filteredHistory = historyData.filter((item) => {
    const itemTime = new Date(item.date).getTime();
    const s = toDayStart(startDate);
    const e = toDayEnd(endDate);

    // 1. 날짜 필터
    if (s && itemTime < s) return false;
    if (e && itemTime > e) return false;

    // 2. 타입 필터
    if (typeFilter !== "all" && item.type !== typeFilter) return false;

    // 3. 서브 카테고리 필터
    if (subCategoryFilter !== "all" && item.subType !== subCategoryFilter)
      return false;

    return true;
  });

  // 드롭다운 옵션 - 대분류
  const typeOptions = [
    { value: "all", label: "전체" },
    { value: "CONVERSATION", label: "회화" },
    { value: "TRAINING", label: "학습" },
  ];

  // 드롭다운 옵션 - 소분류 (대분류 선택에 따라 동적 변경)
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
      { value: "all", label: "전체" },
      ...list.map((s) => ({ value: s, label: s })),
    ];
  })();

  // typeFilter 변경 시 subCategory 초기화
  useEffect(() => {
    setSubCategoryFilter("all");
  }, [typeFilter]);

  // 클릭 핸들러 (상세 페이지 이동)
  const handleItemClick = (item: HistoryRecord) => {
    if (item.type === "CONVERSATION") {
      const sessionId = item.id.replace("conv-", "");
      navigate(`/ai-talk/chat/${sessionId}`);
    } else {
      alert(`학습 상세 보기: ${item.title} (준비 중)`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <header className="bg-rose-500 text-white py-4 shadow-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold mb-0 leading-tight truncate">
              학습 히스토리
            </h1>
            <p className="text-white/80 text-sm sm:text-base truncate">
              회화 및 트레이닝 기록을 확인하세요
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center text-white/90 hover:bg-white/10 transition p-2 rounded"
            aria-label="닫기"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* 필터 영역 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 items-end">
          <div className="flex gap-2 w-full sm:w-auto flex-1">
            <div className="w-36 sm:w-40">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                구분
              </label>
              <CustomDropdown
                id="history-type"
                value={typeFilter}
                onChange={setTypeFilter}
                options={typeOptions}
              />
            </div>

            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                카테고리
              </label>
              <CustomDropdown
                id="history-subcategory"
                value={subCategoryFilter}
                onChange={setSubCategoryFilter}
                options={subCategoryOptions}
              />
            </div>
          </div>

          <div className="flex gap-2 items-end w-full sm:w-auto">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                시작일
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                종료일
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 w-full"
              />
            </div>
            <div className="flex items-center pb-1">
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setTypeFilter("all");
                  setSubCategoryFilter("all");
                }}
                className="ml-2 text-sm text-gray-600 underline whitespace-nowrap"
              >
                초기화
              </button>
            </div>
          </div>
        </div>

        {/* 결과 요약 */}
        {filteredHistory.length > 0 && (
          <p className="text-sm text-gray-600 mb-4">
            총 {filteredHistory.length}개의 기록
          </p>
        )}

        {/* 리스트 영역 */}
        <div className="space-y-3">
          {filteredHistory.map((item) => {
            const isTraining = item.type === "TRAINING";

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-5 cursor-pointer hover:border-rose-300 hover:shadow-md transition group"
              >
                <div className="flex items-start gap-4">
                  {/* 아이콘 */}
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300 ${
                      isTraining ? "bg-indigo-500" : "bg-rose-500"
                    }`}
                  >
                    {isTraining ? (
                      <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-100" />
                    ) : (
                      <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-rose-100" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                        {item.title}
                      </h3>
                      {/* 카테고리 뱃지 */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          isTraining
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-rose-100 text-rose-600"
                        }`}
                      >
                        {item.subType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(item.date)}</span>
                      <span className="text-gray-300">|</span>
                      <span>{formatTime(item.date)}</span>
                    </div>

                    {/* 내용 요약 */}
                    {isTraining ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-700">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          <span>{item.score}점</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDuration(item.durationSeconds)}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-1 mb-2">
                          {item.preview || "대화 내용 없음"}
                        </p>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{item.messageCount}개의 메시지</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredHistory.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-600 text-sm sm:text-base">
              {startDate ||
              endDate ||
              typeFilter !== "all" ||
              subCategoryFilter !== "all"
                ? "조건에 맞는 기록이 없습니다."
                : "아직 학습 기록이 없습니다."}
            </p>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              새로운 학습이나 대화를 시작해보세요!
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default MyPageHistory;
