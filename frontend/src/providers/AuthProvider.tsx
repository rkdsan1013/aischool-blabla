// frontend/src/providers/AuthProvider.tsx
import { useState, useCallback, type ReactNode } from "react";
import { AuthContext } from "../contexts/authContext";
import { logout as logoutService } from "../services/authService";

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  const logout = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      await logoutService();
      // 로그아웃 후에는 보통 메인으로 이동하거나 로그인 페이지로 이동합니다.
      // ProfileProvider의 profile 상태 초기화는 새로고침이나 페이지 이동으로 처리됩니다.
      window.location.href = "/";
    } catch (err) {
      console.error("[AuthProvider] logout failed:", err);
      // 에러가 나더라도 클라이언트 측에서는 로그아웃 처리(이동)를 하는 것이 UX상 좋습니다.
      window.location.href = "/";
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    // api/index.ts의 인터셉터가 자동으로 refresh를 수행하므로
    // 수동 호출은 거의 필요하지 않으나, 인터페이스 유지를 위해 남겨둡니다.
    return;
  }, []);

  const value = {
    // isLoggedIn은 AuthProvider에서 관리하지 않습니다.
    // **useProfile()** 훅을 사용하여 profile 객체의 유무로 판단하세요.
    isLoggedIn: false,
    isAuthLoading,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
