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

// --- Types ---

// 1. 회화, 학습 공통/개별 속성을 아우르는 타입 정의
type HistoryType = "CONVERSATION" | "TRAINING";

interface HistoryRecord {
  id: string;
  type: HistoryType; // 구분 (회화 vs 학습)
  subType: string; // 소분류 (예: '카페', '단어', '작문')
  title: string; // 제목 (시나리오 제목 or 학습 유형 이름)
  date: Date;

  // 회화 전용 필드
  messageCount?: number;
  preview?: string;

  // 학습 전용 필드
  score?: number;
  durationSeconds?: number;
}

// --- Components ---

/* CustomDropdown (기존 유지) */
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

  useEffect(() => {
    function onDocClick(e: Event) {
      if (!btnRef.current || !panelRef.current) return;
      const target = e.target as Node | null;
      if (
        target &&
        (btnRef.current.contains(target) || panelRef.current.contains(target))
      )
        return;
      setOpen(false);
      btnRef.current?.focus();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

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
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else if (activeIndex >= 0) {
        onChange(options[activeIndex].value);
        setOpen(false);
        btnRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      btnRef.current?.focus();
    }
  };

  const onOptionClick = (index: number) => {
    onChange(options[index].value);
    setOpen(false);
    btnRef.current?.focus();
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

// --- Dummy Data (Conversations + Training) ---
const historySeed: HistoryRecord[] = [
  // 1. 회화 데이터
  {
    id: "conv-1",
    type: "CONVERSATION",
    subType: "카페",
    title: "카페에서 주문하기",
    date: new Date(2025, 0, 14, 14, 30),
    messageCount: 12,
    preview: "Hello! Welcome to our coffee shop...",
  },
  {
    id: "conv-2",
    type: "CONVERSATION",
    subType: "쇼핑",
    title: "옷 가게 점원과 대화",
    date: new Date(2025, 0, 13, 16, 20),
    messageCount: 18,
    preview: "Hi there! Are you looking for something...",
  },
  // 2. 학습 데이터
  {
    id: "train-1",
    type: "TRAINING",
    subType: "단어",
    title: "필수 영단어 (초급)",
    date: new Date(2025, 0, 12, 10, 15),
    score: 90,
    durationSeconds: 300, // 5분
  },
  {
    id: "train-2",
    type: "TRAINING",
    subType: "문장",
    title: "문장 배열 연습",
    date: new Date(2025, 0, 11, 19, 0),
    score: 80,
    durationSeconds: 420, // 7분
  },
  {
    id: "train-3",
    type: "TRAINING",
    subType: "작문",
    title: "자기소개 하기",
    date: new Date(2025, 0, 10, 20, 30),
    score: 100,
    durationSeconds: 600, // 10분
  },
  {
    id: "conv-3",
    type: "CONVERSATION",
    subType: "면접",
    title: "영어 면접 실전",
    date: new Date(2025, 0, 9, 11, 0),
    messageCount: 22,
    preview: "Could you tell me about yourself?",
  },
  {
    id: "train-4",
    type: "TRAINING",
    subType: "스피킹",
    title: "발음 교정 (th 사운드)",
    date: new Date(2025, 0, 8, 15, 45),
    score: 75,
    durationSeconds: 180, // 3분
  },
];

// --- Helpers ---
const formatDate = (date: Date) =>
  date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const formatTime = (date: Date) =>
  date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

const formatDuration = (seconds?: number) => {
  if (seconds === undefined) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}분 ${s}초`;
};

// --- Main Page Component ---
const MyPageHistory: React.FC = () => {
  const navigate = useNavigate();

  // 필터 상태
  const [startDate, setStartDate] = useState<string>(""); // yyyy-mm-dd
  const [endDate, setEndDate] = useState<string>(""); // yyyy-mm-dd
  const [typeFilter, setTypeFilter] = useState<string>("all"); // all | CONVERSATION | TRAINING
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>("all");

  // 서브 카테고리 목록 정의
  const trainingSubTypes = ["단어", "문장", "빈칸", "작문", "스피킹"];
  const conversationSubTypes = [
    "카페",
    "쇼핑",
    "면접",
    "여행",
    "자유",
    "나만의 시나리오",
  ];

  // 모든 카테고리 (중복 제거)
  const allSubTypes = Array.from(new Set(historySeed.map((r) => r.subType)));

  // 날짜 범위 계산
  const toDayStart = (d?: string) => (d ? new Date(d + "T00:00:00") : null);
  const toDayEnd = (d?: string) => (d ? new Date(d + "T23:59:59.999") : null);

  // 1. 날짜 필터링
  const filterByDateRange = (list: HistoryRecord[]) => {
    const s = toDayStart(startDate);
    const e = toDayEnd(endDate);
    if (!s && !e) return list;
    return list.filter((c) => {
      if (s && c.date < s) return false;
      if (e && c.date > e) return false;
      return true;
    });
  };

  // 2. 타입 및 카테고리 필터링
  const filterByTypeAndSub = (list: HistoryRecord[]) => {
    let res = list;
    // 대분류 (전체/회화/학습)
    if (typeFilter !== "all") {
      res = res.filter((c) => c.type === typeFilter);
    }
    // 소분류 (카테고리)
    if (subCategoryFilter !== "all") {
      res = res.filter((c) => c.subType === subCategoryFilter);
    }
    return res;
  };

  // 최종 리스트
  const filteredHistory = filterByTypeAndSub(filterByDateRange(historySeed));
  // 최신순 정렬
  filteredHistory.sort((a, b) => b.date.getTime() - a.date.getTime());

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
      // 전체일 때: 데이터에 있는 모든 subtype + 기본 목록 합집합
      list = Array.from(
        new Set([...conversationSubTypes, ...trainingSubTypes, ...allSubTypes])
      );
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

  // 클릭 핸들러 (상세 페이지 이동 등)
  const handleItemClick = (item: HistoryRecord) => {
    if (item.type === "CONVERSATION") {
      navigate(`/my/conversation-history/${item.id}`);
    } else {
      // 학습 기록 상세 페이지 (예: 결과 화면 재활용 또는 전용 히스토리 뷰)
      // 지금은 결과 페이지로 모의 이동하거나, 추후 구현된 상세 모달을 띄울 수 있음
      // 여기서는 예시로 result 페이지로 이동시킴 (실제 구현 시 route 수정 필요)
      // navigate(`/training/result/${item.id}`);
      alert("학습 상세 기록 보기 (준비 중): " + item.title);
    }
  };

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
                  {/* 아이콘: 학습 vs 회화 구분 */}
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300 ${
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

                    {/* 내용 요약 (타입에 따라 다르게 표시) */}
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
                          {item.preview}
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
