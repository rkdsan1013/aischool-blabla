// backend/src/controllers/userController.ts
import { Request, Response } from "express";
import {
  getUserById,
  updateUserProfile,
  deleteUserById,
  changeUserPassword,
} from "../services/userService";
import { getUserAttendanceStats } from "../models/userModel"; // [추가]

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

// [추가] 출석 통계 조회 핸들러
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
