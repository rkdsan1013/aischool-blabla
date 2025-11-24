// backend/src/routes/voiceroomRouter.ts
// cspell:ignore voiceroom

import express, { Request, Response, NextFunction } from "express";
import { pool } from "../config/db";
import { requireAuth } from "../middlewares/auth"; // ✅ 인증 미들웨어
import {
  createRoom as controllerCreateRoom,
  listRooms as controllerListRooms,
  getRoomById as controllerGetRoomById,
  updateRoom as controllerUpdateRoom,
  patchRoom as controllerPatchRoom,
  deleteRoom as controllerDeleteRoom,
} from "../controllers/voiceroomController";

const router = express.Router();

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error("[route error]", req.method, req.originalUrl, {
        query: req.query,
        body: req.body,
        err: err && err.stack ? err.stack : err,
      });
      next(err);
    });
}

/**
 * POST /voice-room
 * 방 생성 (로그인 필수)
 */
router.post(
  "/",
  requireAuth, // ✅ 인증 필요
  asyncHandler(async (req: Request, res: Response) => {
    // [Fix] req.user 타입 명시 (user_id 포함)
    // requireAuth 미들웨어에서 user_id와 name 등을 토큰에서 추출해 넣습니다.
    const user = req.user as { user_id: number; name: string } | undefined;

    // 컨트롤러에 user 정보 전달
    const created = await controllerCreateRoom(pool, req.body, user);
    res.status(201).json(created);
  })
);

/**
 * GET /voice-room
 * 방 목록 조회
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const size = Math.min(100, Math.max(1, Number(req.query.size || 20)));
    const level = req.query.level;
    const rooms = await controllerListRooms(pool, { page, size, level });
    res.json(rooms);
  })
);

/**
 * GET /voice-room/:id
 * 단일 방 조회
 */
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const room = await controllerGetRoomById(pool, req.params.id);
    res.json(room);
  })
);

/**
 * PUT /voice-room/:id
 * 전체 수정 (로그인 필수)
 */
router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await controllerUpdateRoom(pool, req.params.id, req.body);
    res.json(updated);
  })
);

/**
 * PATCH /voice-room/:id
 * 부분 수정 (로그인 필수)
 */
router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const patched = await controllerPatchRoom(pool, req.params.id, req.body);
    res.json(patched);
  })
);

/**
 * DELETE /voice-room/:id
 * 삭제 (로그인 필수)
 */
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    await controllerDeleteRoom(pool, req.params.id);
    res.status(204).send();
  })
);

export default router;
