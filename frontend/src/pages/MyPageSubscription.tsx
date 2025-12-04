// frontend/src/pages/MyPageSubscription.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  CreditCard,
  CheckCircle2,
  Zap,
  Calendar,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Check,
} from "lucide-react";

// [Type Definition] 플랜 타입 정의
type PlanType = "BASIC" | "PRO";

// [Dummy Data] 2025년 기준 데이터
const NEXT_BILLING_DATE = "2026년 1월 25일";

// 결제 내역 2025년 하반기 기준
const BILLING_HISTORY = [
  { date: "2025.12.25", amount: "9,900원", status: "결제 완료" },
  { date: "2025.11.25", amount: "9,900원", status: "결제 완료" },
  { date: "2025.10.25", amount: "9,900원", status: "결제 완료" },
];

const MyPageSubscription: React.FC = () => {
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);

  // [State] 현재 플랜 상태 관리 (BASIC | PRO)
  const [currentPlan] = useState<PlanType>("PRO");

  // 결제 주기는 Pro 플랜 내부에서만 제어
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  const handleCancelSubscription = () => {
    setLoadingCancel(true);
    setTimeout(() => {
      setLoadingCancel(false);
      setShowCancelModal(false);
      alert("구독이 해지되었습니다. (더미 기능)");
    }, 1500);
  };

  const proPrice = billingCycle === "MONTHLY" ? 9900 : 99000;
  const proPriceText = `₩${proPrice.toLocaleString()}`;
  const proPeriodText = billingCycle === "MONTHLY" ? "/ 월" : "/ 년";

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
              aria-label="뒤로 가기"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">구독 관리</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Section 1: 현재 이용 중인 플랜 요약 */}
        <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-rose-500 fill-rose-100" />
              <h2 className="text-lg font-bold text-gray-900">현재 플랜</h2>
            </div>

            {currentPlan === "PRO" ? (
              <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <ShieldCheck className="w-24 h-24 text-rose-600" />
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-white text-rose-600 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm border border-rose-100">
                      Active
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-rose-900 mb-1">
                    Pro Plan{" "}
                    <span className="text-base font-normal opacity-80">
                      (월간)
                    </span>
                  </h3>
                  <p className="text-rose-700/80 font-medium text-sm mb-4">
                    무제한 학습을 즐기고 계시네요!
                  </p>
                  <div className="flex items-center gap-2 text-sm text-rose-800 font-medium">
                    <Calendar className="w-4 h-4" />
                    <span>다음 결제일: {NEXT_BILLING_DATE}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-white text-gray-600 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm border border-gray-200">
                      Active
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-1">
                    Basic Plan
                  </h3>
                  <p className="text-gray-500 font-medium text-sm">
                    기본 플랜을 이용 중입니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 2: 멤버십 플랜 변경 */}
        <section className="space-y-4">
          <div className="px-1 mb-2">
            <h2 className="text-lg font-bold text-gray-900">멤버십 변경</h2>
          </div>

          {/* 1. Pro Plan */}
          <div
            className={`bg-white rounded-3xl border p-6 sm:p-8 transition-all ${currentPlan === "PRO"
                ? "border-rose-200 ring-2 ring-rose-500/10 shadow-md relative overflow-hidden"
                : "border-gray-200 shadow-sm hover:border-rose-100"
              }`}
          >
            {/* Pro Background Deco */}
            {currentPlan === "PRO" && (
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-rose-400 to-orange-400" />
            )}

            {/* Header & Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg text-gray-900">Pro Plan</h3>
                  <span className="bg-rose-100 text-rose-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    BEST
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  모든 기능을 제한 없이 이용하세요
                </p>
              </div>

              {/* Pro-specific Toggle */}
              <div className="bg-gray-100 p-1 rounded-xl inline-flex self-start sm:self-auto">
                <button
                  onClick={() => setBillingCycle("MONTHLY")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${billingCycle === "MONTHLY"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  월간
                </button>
                <button
                  onClick={() => setBillingCycle("YEARLY")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${billingCycle === "YEARLY"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  연간
                  <span className="text-[9px] bg-rose-500 text-white px-1.5 rounded-full">
                    -16%
                  </span>
                </button>
              </div>
            </div>

            {/* Price Display */}
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-3xl font-black text-gray-900">
                {proPriceText}
              </span>
              <span className="text-sm font-medium text-gray-500">
                {proPeriodText}
              </span>

              <span
                className={`ml-2 text-sm text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-lg transition-opacity duration-200 ${billingCycle === "YEARLY"
                    ? "opacity-100 visible"
                    : "opacity-0 invisible"
                  }`}
              >
                2개월 무료
              </span>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                "모든 학습 콘텐츠 무제한",
                "상세한 AI 발음/문법 교정",
                "학습 기록 무제한 보관",
                "우선 고객 지원",
              ].map((feat, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-sm text-gray-700 font-medium"
                >
                  <div className="w-5 h-5 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  {feat}
                </li>
              ))}
            </ul>

            <button
              disabled={currentPlan === "PRO"}
              className={`w-full py-4 rounded-2xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 ${currentPlan === "PRO"
                  ? "bg-rose-50 text-rose-600 cursor-default shadow-none border border-rose-100"
                  : "bg-rose-600 text-white hover:bg-rose-700 hover:shadow-rose-200"
                }`}
            >
              {currentPlan === "PRO"
                ? "현재 이용 중인 플랜"
                : billingCycle === "YEARLY"
                  ? "연간 결제로 시작하기"
                  : "월간 결제로 시작하기"}
            </button>
          </div>

          {/* 2. Basic Plan (동그라미 제거) */}
          <div
            className={`bg-white rounded-3xl border p-6 sm:p-8 transition-all ${currentPlan === "BASIC"
                ? "border-gray-300 ring-2 ring-gray-200 shadow-sm"
                : "border-gray-200 shadow-sm hover:border-rose-100"
              }`}
          >
            {/* [수정] 우상단 체크 아이콘 제거 -> 심플하게 타이틀과 가격만 배치 */}
            <div className="mb-4">
              <h3 className="font-bold text-lg text-gray-900">Basic Plan</h3>
              <p className="text-xl font-bold text-gray-900 mt-1">무료</p>
            </div>

            <ul className="space-y-2 mb-6">
              {[
                "일일 학습 제한적 이용",
                "기본 AI 피드백",
                "학습 기록 30일 보관",
              ].map((feat, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <CheckCircle2 className="w-4 h-4 text-gray-400 shrink-0" />
                  {feat}
                </li>
              ))}
            </ul>
            <button
              disabled={currentPlan === "BASIC"}
              className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all ${currentPlan === "BASIC"
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
            >
              {currentPlan === "BASIC" ? "현재 이용 중" : "Basic으로 변경"}
            </button>
          </div>
        </section>

        {/* Section 3: 결제 수단 및 내역 */}
        <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <CreditCard className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-bold text-gray-900">결제 관리</h2>
            </div>

            {/* 결제 수단 */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-500 mb-3 ml-1">
                등록된 결제 수단
              </h3>
              <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-500 shadow-sm">
                    VISA
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      Hyundai **** 4532
                    </p>
                    <p className="text-xs text-gray-500">다음 결제에 사용됨</p>
                  </div>
                </div>
                <button className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:underline">
                  변경
                </button>
              </div>
            </div>

            {/* 결제 내역 */}
            <div>
              <div className="flex items-center justify-between mb-3 ml-1">
                <h3 className="text-sm font-bold text-gray-500">
                  최근 결제 내역 (2025)
                </h3>
                <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  전체보기 <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {BILLING_HISTORY.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {item.status}
                        </p>
                        <p className="text-xs text-gray-500">{item.date}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {item.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: 구독 해지 */}
        <section className="bg-red-50/50 rounded-3xl border border-red-100 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-2xl text-red-500 shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                구독 해지
              </h2>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                구독을 해지하면 다음 결제일부터 유료 기능을 사용할 수 없습니다.
                남은 기간 동안은 계속 이용하실 수 있습니다.
              </p>
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2.5 rounded-2xl border border-red-200 bg-white text-red-600 text-sm font-bold hover:bg-red-50 hover:border-red-300 transition-all active:scale-[0.98] shadow-sm"
              >
                구독 해지하기
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-gray-100 animate-scale-in">
            <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-5 bg-red-50 text-red-500">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              정말 해지하시겠어요?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-8 leading-relaxed">
              지금 해지하셔도 남은 기간 동안은
              <br />
              Pro 플랜을 이용하실 수 있습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 rounded-2xl border border-gray-200 px-4 py-3.5 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition active:scale-[0.98]"
              >
                유지하기
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={loadingCancel}
                className="flex-1 rounded-2xl bg-gray-900 text-white px-4 py-3.5 text-sm font-bold hover:bg-gray-800 transition active:scale-[0.98] shadow-lg disabled:opacity-50"
              >
                {loadingCancel ? "처리 중..." : "해지하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPageSubscription;