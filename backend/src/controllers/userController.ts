// backend/src/controllers/userController.ts
import { Request, Response } from "express";
import {
  getUserById,
  updateUserProfile,
  deleteUserById,
  changeUserPassword,
  updateUserLevel,
  getConversationDetail,
} from "../services/userService";
import {
  getUserAttendanceStats,
  getUserHistoryStats,
} from "../models/userModel";

/**
 * GET /api/user/me
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
 */
export async function updateMyProfileHandler(req: Request, res: Response) {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { name, profile_img } = req.body as {
      name?: string;
      profile_img?: string | null;
    };

    const payload: { name?: string; profile_img?: string | null } = {};
    if (typeof name === "string") payload.name = name.trim();
    if (profile_img === null || typeof profile_img === "string") {
      payload.profile_img = profile_img;
    }

    await updateUserProfile(userId, payload);

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
 * PUT /api/user/me/level
 */
export async function updateLevelHandler(req: Request, res: Response) {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { level, levelProgress } = req.body;

    if (!level) {
      return res.status(400).json({ message: "Level is required" });
    }

    const progress = typeof levelProgress === "number" ? levelProgress : 0;

    await updateUserLevel(userId, level, progress);

    return res.json({
      message: "Level updated successfully",
      level,
      levelProgress: progress,
    });
  } catch (err: any) {
    console.error("[USER CONTROLLER] updateLevel error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to update level" });
  }
}

/**
 * PUT /api/user/me/password
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

/**
 * GET /api/user/me/history/conversation/:sessionId
 * 회화 상세 내역 조회
 */
export async function getConversationDetailHandler(
  req: Request,
  res: Response
) {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const numericId = parseInt(sessionId, 10);
    if (isNaN(numericId)) {
      return res.status(400).json({ message: "Invalid session ID format" });
    }

    const detail = await getConversationDetail(userId, numericId);
    if (!detail) {
      return res
        .status(404)
        .json({ message: "Conversation not found or access denied" });
    }

    return res.json(detail);
  } catch (err) {
    console.error("[User Controller] Conversation Detail fetch error:", err);
    return res
      .status(500)
      .json({ error: "Failed to fetch conversation detail" });
  }
}
