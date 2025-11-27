// frontend/src/pages/AuthPage.tsx
// cspell:ignore Blabla
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Trophy, Sparkles, ArrowRight, CheckCircle2, X } from "lucide-react";
import {
  login as loginService,
  signup as signupService,
} from "../services/authService";
import { ServiceError } from "../api";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfile";

/* --- Types --- */
type AuthMode = "login" | "signup";

/* --- UI Components --- */

function Label({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-bold text-gray-500 mb-1 ml-1"
    >
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-3.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-200"
    />
  );
}

function Button({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
}) {
  return (
    <button
      {...props}
      className={`w-full rounded-xl px-4 py-4 text-base font-bold shadow-md active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200 ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * 탭 스위처 (로그인/회원가입)
 */
function SegmentedControl({
  value,
  onChange,
}: {
  value: AuthMode;
  // ✅ [수정됨] any 제거, 구체적인 타입 명시
  onChange: (val: AuthMode) => void;
}) {
  return (
    <div className="bg-gray-100 p-1 rounded-xl flex relative mb-6">
      {[
        { label: "로그인", value: "login" as const },
        { label: "회원가입", value: "signup" as const },
      ].map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 z-10 ${
              isActive
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // --- State Initialization ---
  const resultState = location.state as { level?: string } | null;
  const initialLevel = resultState?.level;

  // 결과가 있으면 무조건 signup 탭으로 시작
  const [tab, setTab] = useState<AuthMode>(() => {
    if (initialLevel) return "signup";
    const params = new URLSearchParams(location.search);
    return (params.get("mode") === "signup" ? "signup" : "login") as AuthMode;
  });

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { isAuthLoading } = useAuth();
  const { profile, isProfileLoading, refreshProfile } = useProfile();

  const loginFormRef = useRef<HTMLFormElement | null>(null);
  const signupFormRef = useRef<HTMLFormElement | null>(null);

  // --- Effects ---
  // 이미 로그인 된 경우 리디렉션
  useEffect(() => {
    if (!isAuthLoading && !isProfileLoading && profile) {
      navigate("/home", { replace: true });
    }
  }, [profile, isAuthLoading, isProfileLoading, navigate]);

  // URL 파라미터 변경 감지 (결과 모드가 아닐 때만)
  useEffect(() => {
    if (initialLevel) return;
    const params = new URLSearchParams(location.search);
    const mode = params.get("mode");
    if (mode === "signup") setTab("signup");
    else if (mode === "login") setTab("login");
  }, [location.search, initialLevel]);

  // --- Handlers ---
  const handleLogin = async () => {
    try {
      await loginService(loginEmail, loginPassword);
      await refreshProfile();
    } catch (err: unknown) {
      if (err instanceof ServiceError) setError(err.message);
      else setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async () => {
    try {
      await signupService(
        signupName,
        signupEmail,
        signupPassword,
        initialLevel
      );
      setTab("login");
      setLoginEmail(signupEmail);
      setLoginPassword("");
      setSignupName("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupConfirmPassword("");
      alert("회원가입 완료! 로그인해주세요.");
    } catch (err: unknown) {
      if (err instanceof ServiceError) setError(err.message);
      else setError("회원가입 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isAuthLoading) return;
    setIsSubmitting(true);
    setError("");

    if (tab === "login") {
      if (!loginEmail || !loginPassword) {
        setError("이메일과 비밀번호를 입력해주세요.");
        setIsSubmitting(false);
        return;
      }
      await handleLogin();
    } else {
      if (
        !signupName ||
        !signupEmail ||
        !signupPassword ||
        !signupConfirmPassword
      ) {
        setError("모든 정보를 입력해주세요.");
        setIsSubmitting(false);
        return;
      }
      if (signupPassword !== signupConfirmPassword) {
        setError("비밀번호가 서로 다릅니다.");
        setIsSubmitting(false);
        return;
      }
      await handleSignup();
    }
  };

  const submitActiveForm = () => {
    const form = tab === "login" ? loginFormRef.current : signupFormRef.current;
    if (form) {
      if (typeof form.requestSubmit === "function") form.requestSubmit();
      else
        form.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        );
    }
  };

  // --- Render ---
  return (
    // ✅ [수정됨] h-[100dvh] -> h-dvh
    <div className="h-dvh w-full bg-white flex flex-col lg:flex-row overflow-hidden">
      {/* [Desktop Left Panel] - Rose Color */}
      <div className="hidden lg:flex lg:w-5/12 bg-rose-500 relative overflow-hidden text-white flex-col p-12">
        {/* 배경 데코 */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-orange-400/20 rounded-full blur-3xl" />

        {/* 상단: 로고 */}
        <div className="relative z-10 mt-2">
          <h1 className="text-4xl font-extrabold tracking-tight">Blabla</h1>
          <p className="text-rose-100 font-medium text-lg mt-1">
            AI Language Partner
          </p>
        </div>

        {/* 중앙: 컨텐츠 (Slogan or Result) */}
        <div className="flex-1 flex flex-col justify-center relative z-10 pb-20">
          {initialLevel ? (
            <div className="space-y-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-sm font-bold shadow-sm">
                <Sparkles size={16} />
                <span>테스트 분석 완료</span>
              </div>
              <div>
                <h2 className="text-5xl font-black mb-4 leading-tight">
                  Level {initialLevel}
                  <br />
                  달성을 축하해요!
                </h2>
                <p className="text-lg text-rose-100 leading-relaxed max-w-md">
                  지금 가입하면 분석된 레벨 정보가
                  <br />
                  프로필에 자동으로 저장됩니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-5xl font-black leading-tight">
                Stop typing,
                <br />
                Start talking.
              </h2>
              <p className="text-lg text-rose-100">
                가장 자연스러운 AI 영어 회화 파트너와
                <br />
                지금 바로 대화를 시작하세요.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* [Right Panel / Mobile Main] */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* 모바일 헤더 (닫기 버튼) */}
        <div className="flex-none flex items-center justify-between px-4 py-3 lg:hidden">
          <h1 className="text-xl font-extrabold text-rose-500">Blabla</h1>
          <button
            onClick={() => navigate("/")}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* 메인 컨텐츠 영역 */}
        <div className="flex-1 w-full max-w-md mx-auto px-6 flex flex-col justify-center overflow-y-auto lg:overflow-y-visible scrollbar-hide pb-24 lg:pb-0">
          {/* 1. 모드에 따른 상단 영역 */}
          {initialLevel ? (
            // [결과 저장 모드]
            <div className="mb-6 animate-slide-down flex-none">
              <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-lg shadow-slate-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/20 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-rose-300 text-xs font-bold mb-1">
                      <Trophy size={14} />
                      <span>분석 완료</span>
                    </div>
                    <div className="text-xl font-bold">
                      Level{" "}
                      <span className="text-rose-400 text-2xl ml-1">
                        {initialLevel}
                      </span>{" "}
                      달성!
                    </div>
                    <div className="text-xs text-slate-400 mt-1.5">
                      회원가입하고 학습을 바로 이어가세요.
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl animate-bounce">
                    🎉
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // [일반 모드]
            <>
              <div className="mb-6 text-center lg:text-left flex-none">
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                  {tab === "signup" ? "계정 만들기" : "다시 오셨군요!"}
                </h2>
                <p className="text-sm text-gray-500">
                  {tab === "signup"
                    ? "나만의 AI 튜터와 대화를 시작해보세요."
                    : "이메일로 간편하게 로그인하세요."}
                </p>
              </div>
              {/* 탭 스위처 (일반 모드에서만 보임) */}
              <div className="flex-none">
                <SegmentedControl value={tab} onChange={setTab} />
              </div>
            </>
          )}

          {/* 2. 폼 영역 */}
          <div className="w-full flex-none">
            {/* --- 로그인 폼 --- */}
            {tab === "login" && (
              <form
                ref={loginFormRef}
                onSubmit={handleSubmit}
                className="space-y-4 animate-fade-in"
              >
                <div>
                  <Label htmlFor="loginEmail">이메일</Label>
                  <Input
                    id="loginEmail"
                    type="email"
                    placeholder="hello@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="loginPassword">비밀번호</Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {error && (
                  <div className="text-xs text-red-500 bg-red-50 px-3 py-2.5 rounded-lg flex items-center gap-2">
                    <CheckCircle2 size={14} className="rotate-180" />
                    <span>{error}</span>
                  </div>
                )}
              </form>
            )}

            {/* --- 회원가입 폼 --- */}
            {tab === "signup" && (
              <form
                ref={signupFormRef}
                onSubmit={handleSubmit}
                className="space-y-3 animate-fade-in"
              >
                <div>
                  <Label htmlFor="signupName">이름</Label>
                  <Input
                    id="signupName"
                    placeholder="홍길동"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="signupEmail">이메일</Label>
                  <Input
                    id="signupEmail"
                    type="email"
                    placeholder="hello@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* 비밀번호 필드 수직 배치 */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="signupPassword">비밀번호</Label>
                    <Input
                      id="signupPassword"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="signupConfirm">비밀번호 확인</Label>
                    <Input
                      id="signupConfirm"
                      type="password"
                      placeholder="••••••••"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-xs text-red-500 bg-red-50 px-3 py-2.5 rounded-lg flex items-center gap-2">
                    <CheckCircle2 size={14} className="rotate-180" />
                    <span>{error}</span>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>

        {/* 하단 고정 버튼 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t border-gray-100 lg:static lg:border-0 lg:bg-transparent lg:px-6 lg:pb-8 lg:pt-0 lg:max-w-md lg:mx-auto lg:w-full z-20">
          <Button
            onClick={submitActiveForm}
            disabled={isSubmitting || isAuthLoading}
            className="flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {tab === "login"
                    ? "로그인하기"
                    : initialLevel
                    ? "가입하고 결과 저장하기"
                    : "회원가입하기"}
                </span>
                <ArrowRight size={18} className="opacity-80" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
