// frontend/src/routes/routes.tsx
import type { RouteObject } from "react-router-dom";

import LayoutWithoutNav from "../layouts/LayoutWithoutNav";
import LayoutWithNav from "../layouts/LayoutWithNav";

import LandingPage from "../pages/LandingPage";
import AuthPage from "../pages/AuthPage";
import HomePage from "../pages/HomePage";
import MyPage from "../pages/MyPage";
import AITalk from "../pages/AITalkPage";
import VoiceRoomPage from "../pages/VoiceRoomPage";
import TrainingPage from "../pages/Training";
import TrainingResult from "../pages/TrainingResult";
import VoiceRoomDetail from "../pages/VoiceRoomDetail";
import VoiceRoomCreate from "../pages/VoiceRoomCreate";
import AITalkPageDetail from "../pages/AITalkPageDetail";
import AITalkCustomScenario from "../pages/AITalkCustomScenario";
import MyPageHistory from "../pages/MyPageHistory";
import MyPageProfile from "../pages/MyPageProfile";
import HomeLeaderBoard from "../pages/HomeLeaderBoard";
import LevelTestPage from "../pages/LevelTestPage"; // 레벨 테스트 페이지 임포트 추가

import PublicOnlyRoute from "./PublicOnlyRoute";
import ProtectedRoute from "./ProtectedRoute";

export const routes: RouteObject[] = [
  // ----------------------------------------------------------------
  // 1. 네비게이션 바가 없는 레이아웃 그룹 (집중이 필요한 페이지, 랜딩, 인증 등)
  // ----------------------------------------------------------------
  {
    element: <LayoutWithoutNav />,
    children: [
      // [PublicOnly] 로그인한 유저는 접근 불가 (홈으로 리다이렉트)
      {
        path: "/",
        element: (
          <PublicOnlyRoute redirectTo="/home">
            <LandingPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: "/auth",
        element: (
          <PublicOnlyRoute redirectTo="/home">
            <AuthPage />
          </PublicOnlyRoute>
        ),
      },

      // [Open Access] 게스트/로그인 유저 모두 접근 가능
      // - 게스트: 테스트 후 결과 세션 저장 -> 회원가입 유도
      // - 회원: 테스트 후 결과 즉시 업데이트
      {
        path: "/ai-talk/level-test",
        element: <LevelTestPage />,
      },

      // [Protected] 로그인 필요 (미로그인 시 /auth로 리다이렉트)
      {
        path: "/training",
        element: (
          <ProtectedRoute redirectTo="/auth">
            <TrainingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/training/result",
        element: (
          <ProtectedRoute redirectTo="/auth">
            <TrainingResult />
          </ProtectedRoute>
        ),
      },
      {
        path: "/voiceroom/:id",
        element: (
          <ProtectedRoute redirectTo="/auth">
            <VoiceRoomDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "/voiceroom/create",
        element: (
          <ProtectedRoute redirectTo="/auth">
            <VoiceRoomCreate />
          </ProtectedRoute>
        ),
      },
      {
        path: "/ai-talk/custom-scenario",
        element: (
          <ProtectedRoute redirectTo="/auth">
            <AITalkCustomScenario />
          </ProtectedRoute>
        ),
      },
      {
        path: "/ai-talk/chat",
        element: (
          <ProtectedRoute redirectTo="/auth">
            <AITalkPageDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "/my/history",
        element: (
          <ProtectedRoute redirectTo="/auth">
            <MyPageHistory />
          </ProtectedRoute>
        ),
      },
      {
        path: "/my/profile",
        element: (
          <ProtectedRoute redirectTo="/auth">
            <MyPageProfile />
          </ProtectedRoute>
        ),
      },
      {
        path: "/leaderboard",
        element: (
          <ProtectedRoute redirectTo="/auth">
            <HomeLeaderBoard />
          </ProtectedRoute>
        ),
      },
    ],
  },

  // ----------------------------------------------------------------
  // 2. 네비게이션 바가 있는 레이아웃 그룹 (메인 서비스 페이지)
  // ----------------------------------------------------------------
  {
    element: <LayoutWithNav />,
    children: [
      {
        path: "/home",
        element: (
          <ProtectedRoute redirectTo="/auth">
            <HomePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/ai-talk",
        element: (
          <ProtectedRoute redirectTo="/auth">
            <AITalk />
          </ProtectedRoute>
        ),
      },
      {
        path: "/voiceroom",
        element: (
          <ProtectedRoute redirectTo="/auth">
            <VoiceRoomPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/my",
        element: (
          <ProtectedRoute redirectTo="/auth">
            <MyPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
];
