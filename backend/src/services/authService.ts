// backend/src/services/authService.ts
import bcrypt from "bcrypt";
import {
  createUserAndProfileTransaction,
  findUserByEmail,
} from "../models/userModel";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token";
import { Response, Request } from "express";

// 회원가입 (level 파라미터 처리 수정)
export async function registerUser(
  name: string | undefined, // name은 없을 수도 있으므로 undefined 허용
  email: string,
  password: string,
  level?: string // 레벨 테스트 결과
) {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error("이미 존재하는 이메일입니다.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // name이 없으면 이메일의 앞부분(@ 앞)을 사용
  const profileName = name || (email.split("@")[0] ?? "User");

  // ✅ [수정됨] TS 에러 해결: exactOptionalPropertyTypes 대응
  // level이 undefined일 경우, 객체 속성 자체를 넣지 않도록 Spread 문법 사용
  await createUserAndProfileTransaction({
    name: profileName,
    email,
    password: hashedPassword,
    ...(level ? { level } : {}), // level 값이 있을 때만 속성 추가
  });

  return { message: "회원가입 성공" };
}

// 로그인
export async function loginUser(
  email: string,
  password: string,
  res: Response
) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error("존재하지 않는 이메일입니다.");
  }

  if (!user.password) {
    throw new Error("비밀번호가 설정되지 않은 계정입니다.");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("비밀번호가 올바르지 않습니다.");
  }

  // Access / Refresh Token 발급
  const accessToken = await generateAccessToken({ id: user.user_id });
  const refreshToken = await generateRefreshToken({ id: user.user_id });

  // HttpOnly 쿠키 저장
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000, // 15분
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
  });

  return { message: "로그인 성공" };
}

// 토큰 재발급
export async function refreshUserToken(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) throw new Error("리프레시 토큰이 없습니다.");

  try {
    const { payload } = await verifyRefreshToken(refreshToken);

    const userId = payload.id as number;

    // 새 Access Token 발급
    const newAccessToken = await generateAccessToken({
      id: userId,
    });

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15분
    });

    return { message: "토큰 재발급 성공" };
  } catch (err) {
    throw new Error("리프레시 토큰이 유효하지 않습니다.");
  }
}

// 로그아웃
export async function logoutUser(res: Response) {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return { message: "로그아웃 성공" };
}
