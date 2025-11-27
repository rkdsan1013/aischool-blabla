// frontend/src/pages/AuthPage.tsx
// cspell:ignore Blabla
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  login as loginService,
  signup as signupService,
} from "../services/authService";
import { ServiceError } from "../api";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfile";

/* UI primitives (Label, Input, Button, Tabs) */
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
      className="block text-xs font-medium text-gray-600"
    >
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
    />
  );
}

function Button({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={
        "w-full rounded-xl bg-rose-500 px-4 py-4 text-base font-semibold text-white shadow-sm hover:bg-rose-600 active:bg-rose-700 disabled:opacity-50 transition-colors " +
        className
      }
    >
      {children}
    </button>
  );
}

function Tabs({
  tab,
  setTab,
}: {
  tab: "login" | "signup";
  setTab: (t: "login" | "signup") => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-center gap-6">
      <button
        type="button"
        onClick={() => setTab("login")}
        className={`pb-2 text-sm font-semibold ${
          tab === "login"
            ? "text-rose-600 border-b-2 border-rose-600"
            : "text-gray-500 border-b-2 border-transparent"
        }`}
      >
        로그인
      </button>
      <button
        type="button"
        onClick={() => setTab("signup")}
        className={`pb-2 text-sm font-semibold ${
          tab === "signup"
            ? "text-rose-600 border-b-2 border-rose-600"
            : "text-gray-500 border-b-2 border-transparent"
        }`}
      >
        회원가입
      </button>
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  // Location Hook 사용 (LevelTestResultPage에서 보낸 state 수신)
  const location = useLocation();

  // URL 쿼리 파라미터 확인 (?mode=signup 처리)
  // 초기 로드 시 한 번만 확인하도록 useState 초기값으로 사용
  const [tab, setTab] = useState<"login" | "signup">(() => {
    const params = new URLSearchParams(location.search);
    return params.get("mode") === "signup" ? "signup" : "login";
  });

  // 레벨 테스트 결과가 있다면 가져오기 (score는 무시)
  const resultState = location.state as {
    level?: string;
    score?: number;
  } | null;
  const initialLevel = resultState?.level;

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Auth and Profile contexts
  const { isAuthLoading } = useAuth();
  const { profile, isProfileLoading, refreshProfile } = useProfile();

  const loginFormRef = useRef<HTMLFormElement | null>(null);
  const signupFormRef = useRef<HTMLFormElement | null>(null);

  // 전체 로딩 상태: 인증 또는 프로필 로딩 중이면 true
  const isLoading = isAuthLoading || isProfileLoading;
  const isLoggedIn = !!profile;

  // 페이지 로드 시 이미 로그인 상태면 /home으로 리디렉션
  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      navigate("/home", { replace: true });
    }
  }, [isLoggedIn, isLoading, navigate]);

  // ✅ [수정됨] mode 쿼리 파라미터 변경 감지 및 탭 전환
  // 의존성 배열 문제를 해결하기 위해 searchParams 변수를 Effect 내부에서 생성
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get("mode");
    if (mode === "signup") setTab("signup");
    else if (mode === "login") setTab("login");
  }, [location.search]);

  const handleLogin = async () => {
    try {
      const data = await loginService(loginEmail, loginPassword);
      console.log("로그인 성공:", data?.message ?? "OK");

      // 로그인 성공 후 프로필 갱신하여 전역 상태를 최신화
      await refreshProfile();
    } catch (err: unknown) {
      if (err instanceof ServiceError) {
        setError(err.message);
      } else {
        setError("알 수 없는 오류가 발생했습니다.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async () => {
    try {
      // signup 호출 시 initialLevel만 전달 (score 제외)
      await signupService(
        signupName,
        signupEmail,
        signupPassword,
        initialLevel // 테스트 결과 레벨 (없으면 undefined)
      );

      // 회원가입 성공 후 바로 로그인 탭으로 전환 및 이메일 자동 입력
      setTab("login");
      setLoginEmail(signupEmail);
      setLoginPassword("");

      // 입력 필드 초기화
      setSignupName("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupConfirmPassword("");

      alert("회원가입이 완료되었습니다! 로그인해주세요.");
    } catch (err: unknown) {
      if (err instanceof ServiceError) {
        setError(err.message);
      } else {
        setError("알 수 없는 오류가 발생했습니다.");
      }
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
        setError("이메일과 비밀번호를 입력하세요.");
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
        setError("모든 필드를 입력하세요.");
        setIsSubmitting(false);
        return;
      }
      if (signupPassword !== signupConfirmPassword) {
        setError("비밀번호가 일치하지 않습니다.");
        setIsSubmitting(false);
        return;
      }
      await handleSignup();
    }
  };

  const submitActiveForm = () => {
    const form = tab === "login" ? loginFormRef.current : signupFormRef.current;
    if (!form) return;
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
    } else {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
    }
  };

  return (
    <div className="min-h-screen w-full bg-white lg:flex relative">
      {/* 테스트 결과 적용 안내 배너 (회원가입 탭일 때만) */}
      {tab === "signup" && initialLevel && (
        <div className="hidden lg:block absolute top-8 right-8 animate-fade-in z-20">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl shadow-sm text-sm font-medium">
            🎉 레벨 테스트 결과(<strong>{initialLevel}</strong>)가 적용됩니다!
          </div>
        </div>
      )}

      {/* 데스크톱 좌측 */}
      <div className="hidden lg:flex lg:w-1/2 bg-rose-500 text-white">
        <div className="w-full flex items-center justify-center p-16">
          <div className="max-w-lg space-y-6">
            <h1 className="text-5xl font-extrabold">Blabla</h1>
            <p className="text-2xl font-semibold">Stop typing, Start talking</p>
          </div>
        </div>
      </div>

      {/* 오른쪽/모바일: 폼 영역 */}
      <div className="flex w-full lg:w-1/2 items-start lg:items-center justify-center bg-white">
        <div className="w-full max-w-md lg:max-w-lg flex flex-col">
          {/* 모바일 헤더 */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 lg:hidden">
            <div className="px-4 py-4 flex items-center justify-between">
              <button
                onClick={() => navigate("/")}
                className="text-xl leading-none text-gray-500 hover:text-gray-700"
                aria-label="닫기"
              >
                ×
              </button>
              <h1 className="text-lg font-extrabold text-rose-600">Blabla</h1>
              <div className="w-6" />
            </div>
            <Tabs tab={tab} setTab={setTab} />
          </div>

          {/* 데스크톱: 탭 상단 배치 */}
          <div className="hidden lg:block px-8 pt-12">
            <Tabs tab={tab} setTab={setTab} />
          </div>

          {/* 설명 텍스트 (레벨 적용 문구 포함) */}
          <div className="px-4 lg:px-8 pt-6 pb-2">
            <p className="text-sm text-gray-600">
              {tab === "login"
                ? "계정에 로그인하여 계속 진행하세요."
                : initialLevel
                ? `가입 시 레벨 테스트 결과(${initialLevel})가 자동으로 저장됩니다.`
                : "몇 가지 정보만 입력하면 바로 시작할 수 있어요."}
            </p>
          </div>

          {/* 폼 컨테이너 */}
          <div className="relative px-4 lg:px-8 flex-1">
            <div className="relative min-h-[480px]">
              {/* 로그인 폼 */}
              <form
                ref={loginFormRef}
                onSubmit={handleSubmit}
                className={`absolute inset-0 transition-opacity duration-200 ${
                  tab === "login"
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-0 pointer-events-none"
                }`}
                aria-hidden={tab !== "login"}
              >
                <div className="space-y-6">
                  <section className="space-y-3">
                    <Label htmlFor="loginEmail">이메일</Label>
                    <Input
                      id="loginEmail"
                      type="email"
                      placeholder="example@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={isSubmitting || isAuthLoading}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          loginFormRef.current?.requestSubmit?.();
                        }
                      }}
                    />
                  </section>
                  <section className="space-y-3">
                    <Label htmlFor="loginPassword">비밀번호</Label>
                    <Input
                      id="loginPassword"
                      type="password"
                      placeholder="비밀번호"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={isSubmitting || isAuthLoading}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          loginFormRef.current?.requestSubmit?.();
                        }
                      }}
                    />
                  </section>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                      {error}
                    </div>
                  )}
                </div>

                <button type="submit" className="sr-only" aria-hidden />
              </form>

              {/* 회원가입 폼 */}
              <form
                ref={signupFormRef}
                onSubmit={handleSubmit}
                className={`absolute inset-0 transition-opacity duration-200 ${
                  tab === "signup"
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-0 pointer-events-none"
                }`}
                aria-hidden={tab !== "signup"}
              >
                <div className="space-y-6">
                  <section className="space-y-3">
                    <Label htmlFor="signupName">이름</Label>
                    <Input
                      id="signupName"
                      type="text"
                      placeholder="홍길동"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      disabled={isSubmitting || isAuthLoading}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          signupFormRef.current?.requestSubmit?.();
                        }
                      }}
                    />
                  </section>
                  <section className="space-y-3">
                    <Label htmlFor="signupEmail">이메일</Label>
                    <Input
                      id="signupEmail"
                      type="email"
                      placeholder="example@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      disabled={isSubmitting || isAuthLoading}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          signupFormRef.current?.requestSubmit?.();
                        }
                      }}
                    />
                  </section>
                  <section className="space-y-3">
                    <Label htmlFor="signupPassword">비밀번호</Label>
                    <Input
                      id="signupPassword"
                      type="password"
                      placeholder="비밀번호"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      disabled={isSubmitting || isAuthLoading}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          signupFormRef.current?.requestSubmit?.();
                        }
                      }}
                    />
                  </section>
                  <section className="space-y-3">
                    <Label htmlFor="signupConfirmPassword">비밀번호 확인</Label>
                    <Input
                      id="signupConfirmPassword"
                      type="password"
                      placeholder="비밀번호를 다시 입력하세요"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      disabled={isSubmitting || isAuthLoading}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          signupFormRef.current?.requestSubmit?.();
                        }
                      }}
                    />
                  </section>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                      {error}
                    </div>
                  )}
                </div>

                <button type="submit" className="sr-only" aria-hidden />
              </form>
            </div>
          </div>

          {/* 데스크톱: 폼 영역 내부 하단에 고정된 CTA (lg 이상에서 보임) */}
          <div className="hidden lg:block sticky bottom-0 lg:mt-4 lg:px-8">
            <div className="w-full max-w-lg mx-auto py-4 bg-white border-t border-gray-100">
              <Button
                type="button"
                disabled={isSubmitting || isAuthLoading}
                onClick={() => {
                  submitActiveForm();
                }}
              >
                {isSubmitting
                  ? tab === "login"
                    ? "로그인 중..."
                    : "가입 중..."
                  : tab === "login"
                  ? "로그인"
                  : "회원가입"}
              </Button>
            </div>
          </div>

          {/* 모바일: 하단 고정 CTA는 lg:hidden 영역으로 따로 렌더됨 */}
          <div className="lg:hidden" />
        </div>
      </div>

      {/* 모바일 전용 고정 하단 CTA (lg:hidden) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden">
        <div
          className="mx-auto w-full max-w-md px-4 py-3"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          }}
        >
          <Button
            type="button"
            disabled={isSubmitting || isAuthLoading}
            onClick={() => {
              submitActiveForm();
            }}
          >
            {isSubmitting
              ? tab === "login"
                ? "로그인 중..."
                : "가입 중..."
              : tab === "login"
              ? "로그인"
              : "회원가입"}
          </Button>
        </div>
      </div>
    </div>
  );
}
