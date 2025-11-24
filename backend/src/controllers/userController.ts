import { Request, Response } from "express";
import {
  getUserById,
  updateUserProfile,
  deleteUserById,
  changeUserPassword,
} from "../services/userService";
// [수정] getUserHistoryStats 추가 import
import {
  getUserAttendanceStats,
  getUserHistoryStats,
} from "../models/userModel";

/**
 * GET /api/user/me
 * 현재 로그인한 사용자의 프로필 조회
 */
export async function getMyProfileHandler(req: Request, res: Response) {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userProfile = await getUserById(userId);
    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    // 필요한 필드만 깔끔하게 반환
    return res.json({
      user_id: userProfile.user_id,
      email: userProfile.email,
      name: userProfile.name,
      level: userProfile.level,
      level_progress: userProfile.level_progress,
      streak_count: userProfile.streak_count,
      total_study_time: userProfile.total_study_time,
      completed_lessons: userProfile.completed_lessons,
      profile_img: userProfile.profile_img,
      score: userProfile.score,
      tier: userProfile.tier,
    });
  } catch (err) {
    console.error("[USER CONTROLLER] getMyProfile error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

/**
 * PUT /api/user/me
 * 현재 로그인한 사용자의 프로필 수정
 */
export async function updateMyProfileHandler(req: Request, res: Response) {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // 업데이트 가능한 필드만 추출
    const { name, profile_img } = req.body as {
      name?: string;
      profile_img?: string | null;
    };

    // 간단한 유효성 체크
    const payload: { name?: string; profile_img?: string | null } = {};
    if (typeof name === "string") payload.name = name.trim();
    if (profile_img === null || typeof profile_img === "string") {
      payload.profile_img = profile_img;
    }

    await updateUserProfile(userId, payload);

    // 변경 후 최신 프로필 반환 (프론트가 갱신하기 편하도록)
    const updated = await getUserById(userId);
    return res.json({
      message: "Profile updated successfully",
      profile: updated
        ? {
            user_id: updated.user_id,
            email: updated.email,
            name: updated.name,
            level: updated.level,
            level_progress: updated.level_progress,
            streak_count: updated.streak_count,
            total_study_time: updated.total_study_time,
            completed_lessons: updated.completed_lessons,
            profile_img: updated.profile_img,
            score: updated.score,
            tier: updated.tier,
          }
        : null,
    });
  } catch (err) {
    console.error("[USER CONTROLLER] updateMyProfile error:", err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
}

/**
 * PUT /api/user/me/password
 * 현재 로그인한 사용자의 비밀번호 변경
 */
export async function changePasswordHandler(req: Request, res: Response) {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    // 간단한 유효성 검증
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Missing password fields" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters" });
    }

    await changeUserPassword(userId, currentPassword, newPassword);

    return res.json({ message: "Password changed successfully" });
  } catch (err: any) {
    console.error("[USER CONTROLLER] changePassword error:", err);
    // 서비스 레이어에서 던진 에러 메시지 기준으로 400 처리
    const msg =
      typeof err?.message === "string"
        ? err.message
        : "Failed to change password";
    const isClientError =
      msg.includes("incorrect") ||
      msg.includes("not found") ||
      msg.includes("Missing");
    return res.status(isClientError ? 400 : 500).json({ error: msg });
  }
}

/**
 * DELETE /api/user/me
 * 현재 로그인한 사용자의 계정 삭제
 */
export async function deleteMyAccountHandler(req: Request, res: Response) {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    await deleteUserById(userId);
    return res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("[USER CONTROLLER] deleteMyAccount error:", err);
    return res.status(500).json({ error: "Failed to delete account" });
  }
}

/**
 * GET /api/user/me/attendance
 * 내 출석(학습) 통계 조회
 */
export async function getMyAttendanceHandler(req: Request, res: Response) {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const stats = await getUserAttendanceStats(userId);
    return res.json(stats);
  } catch (err) {
    console.error("[User Controller] Attendance fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch attendance data" });
  }
}

/**
 * GET /api/user/me/history
 * [신규] 통합 히스토리 조회 핸들러
 */
export async function getMyHistoryHandler(req: Request, res: Response) {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const history = await getUserHistoryStats(userId);
    return res.json(history);
  } catch (err) {
    console.error("[User Controller] History fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch history" });
  }
}
