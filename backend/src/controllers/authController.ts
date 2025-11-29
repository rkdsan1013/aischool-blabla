// backend/src/controllers/authController.ts
import { Request, Response } from "express";
import {
  registerUser,
  loginUser,
  refreshUserToken,
  logoutUser,
} from "../services/authService";

// ✅ [수정됨] score 제거, level만 받음
export async function register(req: Request, res: Response) {
  // name, level 필드 추가 (score 제외)
  const { name, email, password, level } = req.body;
  console.log("📥 [REGISTER 요청 바디]", req.body);

  if (!email || !password) {
    return res.status(400).json({ message: "필수 정보를 입력해주세요." });
  }

  try {
    // registerUser로 level만 전달
    const result = await registerUser(name, email, password, level);
    console.log("✅ [REGISTER 성공]", result);
    res.status(201).json(result);
  } catch (err: any) {
    console.error("❌ [REGISTER 에러]", err.message);
    if (err.message === "이미 존재하는 이메일입니다.") {
      return res.status(409).json({ message: err.message });
    }
    res.status(400).json({ message: err.message });
  }
}

// 로그인
export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  console.log("📥 [LOGIN 요청 바디]", req.body);

  try {
    const result = await loginUser(email, password, res);
    console.log("✅ [LOGIN 성공]", result);
    res.json(result);
  } catch (err: any) {
    console.error("❌ [LOGIN 에러]", err.message);
    res.status(400).json({ message: err.message });
  }
}

// 토큰 재발급
export async function refresh(req: Request, res: Response) {
  console.log("♻️ [REFRESH 요청]");
  try {
    const result = await refreshUserToken(req, res);
    console.log("✅ [REFRESH 성공]", result);
    res.json(result);
  } catch (err: any) {
    console.error("❌ [REFRESH 에러]", err.message);
    res.status(401).json({ message: err.message });
  }
}

// 로그아웃
export async function logout(req: Request, res: Response) {
  try {
    const result = await logoutUser(res);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
}
