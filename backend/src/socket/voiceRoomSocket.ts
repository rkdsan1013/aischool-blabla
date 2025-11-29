// backend/src/socket/voiceRoomSocket.ts
import { Server, Socket } from "socket.io";
import { pool } from "../config/db";
import {
  addRoomParticipant,
  removeRoomParticipant,
  deleteVoiceRoomRow,
  findVoiceRoomById,
  checkIsBanned,
  banUser,
} from "../models/voiceroomModel";
import { transcribeAudio } from "../ai/audio";
import { generateFeedbackOnly } from "../ai/generators/feedback";

interface User {
  socketId: string;
  userId: number;
  name: string;
  level?: string;
  isMuted: boolean;
}

interface AudioMessagePayload {
  audio: Buffer;
  tempId: string;
  context: string[];
}

interface TextMessagePayload {
  id: string;
  text: string;
  context: string[];
}

const users: Record<string, User[]> = {};
const socketToRoom: Record<string, string> = {};

export default function voiceRoomSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`✅ [Socket] Connected: ${socket.id}`);

    // ... [기존 join_room, sending_signal 등 로직은 동일하므로 생략 가능, 아래는 수정된 부분 위주] ...

    // 1. 방 입장
    socket.on("join_room", async (data) => {
      const { roomId, userId, name, userLevel = "A1", isMuted = false } = data;
      const rId = Number(roomId);

      try {
        const isBanned = await checkIsBanned(pool, rId, userId);
        if (isBanned) {
          socket.emit("error_message", "강퇴당한 방에는 재입장할 수 없습니다.");
          socket.disconnect(true);
          return;
        }
      } catch (err) {
        console.error("Ban check error:", err);
        return;
      }

      try {
        const roomData = await findVoiceRoomById(pool, rId);
        if (!roomData) {
          socket.emit("error_message", "존재하지 않는 방입니다.");
          socket.disconnect(true);
          return;
        }
        if (roomData.current_participants >= roomData.max_participants) {
          socket.emit("room_full");
          socket.disconnect(true);
          return;
        }
      } catch (err) {
        return;
      }

      const newUser: User = {
        socketId: socket.id,
        userId,
        name,
        level: userLevel,
        isMuted: !!isMuted,
      };

      if (!users[roomId]) users[roomId] = [];
      if (!users[roomId].find((u) => u.socketId === socket.id)) {
        users[roomId].push(newUser);
      }

      socketToRoom[socket.id] = roomId;
      socket.join(roomId);

      try {
        await addRoomParticipant(pool, rId, userId);
      } catch (e) {}

      const usersInThisRoom = users[roomId].filter(
        (u) => u.socketId !== socket.id
      );
      socket.emit("all_users", usersInThisRoom);
      console.log(`👤 Joined: ${name} (${userId}) Room:${roomId}`);
    });

    // ... [Signaling 및 Mute 관련 코드는 기존 유지] ...

    socket.on("sending_signal", (p) =>
      io.to(p.userToSignal).emit("user_joined", {
        signal: p.signal,
        callerID: p.callerID,
        userInfo: p.userInfo,
      })
    );

    socket.on("returning_signal", (p) =>
      io.to(p.callerID).emit("receiving_returned_signal", {
        signal: p.signal,
        id: socket.id,
      })
    );

    socket.on("local_transcript", (p) => {
      const r = socketToRoom[socket.id];
      if (r) socket.to(r).emit("transcript_item", p); // io.to -> socket.to (자신에게 다시 보낼 필요 없음)
    });

    socket.on("toggle_mute", (isMuted: boolean) => {
      const roomId = socketToRoom[socket.id];
      if (roomId && users[roomId]) {
        const user = users[roomId].find((u) => u.socketId === socket.id);
        if (user) user.isMuted = isMuted;
        socket
          .to(roomId)
          .emit("user_mute_change", { socketId: socket.id, isMuted });
      }
    });

    // -------------------------------------------------------------
    // ✅ [수정 1] 오디오 메시지 처리 (독립 스코프 보장)
    // -------------------------------------------------------------
    socket.on("audio_message", async (payload: AudioMessagePayload) => {
      // payload에서 구조분해 할당하여 로컬 변수로 사용 (경합 방지)
      const { audio, tempId, context } = payload;
      const roomId = socketToRoom[socket.id];

      if (!roomId || !users[roomId]) return;
      const user = users[roomId].find((u) => u.socketId === socket.id);
      if (!user) return;

      try {
        // 1. Whisper STT
        const transcribedText = await transcribeAudio(audio, "webm");

        if (!transcribedText || transcribedText.trim().length === 0) {
          // 텍스트가 없으면 그냥 로딩만 해제하거나 무시
          return;
        }

        // 2. AI Feedback
        const contextString = context.join("\n");
        const feedback = await generateFeedbackOnly(
          transcribedText,
          user.level || "A1",
          contextString
        );

        // 3. 결과 전송 (tempId를 그대로 돌려주어 해당 메시지만 업데이트)
        io.to(roomId).emit("transcript_complete", {
          id: tempId,
          text: transcribedText,
          feedback: feedback,
          speaker: user.name,
        });
      } catch (err) {
        console.error("🚨 Audio processing error:", err);
        socket.emit("error_message", "음성 처리 중 오류가 발생했습니다.");
      }
    });

    // -------------------------------------------------------------
    // ✅ [수정 2] 텍스트 분석 요청 처리 (새로 추가됨)
    // -------------------------------------------------------------
    socket.on("text_analysis", async (payload: TextMessagePayload) => {
      // 클라이언트가 보낸 고유 ID 사용
      const { id, text, context } = payload;
      const roomId = socketToRoom[socket.id];

      if (!roomId || !users[roomId]) return;
      const user = users[roomId].find((u) => u.socketId === socket.id);
      if (!user) return;

      try {
        const contextString = context.join("\n");

        // 텍스트는 이미 있으므로 피드백만 생성
        const feedback = await generateFeedbackOnly(
          text,
          user.level || "A1",
          contextString
        );

        // transcript_complete를 사용하여 클라이언트의 isAnalyzing 상태를 false로 변경
        io.to(roomId).emit("transcript_complete", {
          id: id,
          text: text,
          feedback: feedback,
          speaker: user.name,
        });
      } catch (err) {
        console.error("🚨 Text analysis error:", err);
        // 에러 발생 시에도 로딩을 풀고 싶다면 에러 메시지와 함께 emit 하거나 별도 처리
      }
    });

    // ... [강퇴 및 disconnect 로직 기존 유지] ...

    socket.on("kick_user", async (data) => {
      const { roomId, targetUserId, targetSocketId } = data;
      const rId = Number(roomId);
      try {
        const roomData = await findVoiceRoomById(pool, rId);
        const requester = users[roomId]?.find((u) => u.socketId === socket.id);

        if (roomData && requester && roomData.host_id === requester.userId) {
          await banUser(pool, rId, targetUserId);

          const targetSocket = io.sockets.sockets.get(targetSocketId);
          if (targetSocket) {
            targetSocket.emit("kicked");
            targetSocket.disconnect(true);
          }

          socket.to(roomId).emit("user_left", targetSocketId);
          if (users[roomId]) {
            users[roomId] = users[roomId].filter(
              (u) => u.socketId !== targetSocketId
            );
          }
        }
      } catch (err) {
        console.error("Kick failed:", err);
      }
    });

    socket.on("disconnect", async () => {
      const roomId = socketToRoom[socket.id];
      if (roomId) {
        const rId = Number(roomId);
        const leavingUser = users[roomId]?.find(
          (u) => u.socketId === socket.id
        );

        if (users[roomId]) {
          users[roomId] = users[roomId].filter((u) => u.socketId !== socket.id);
        }

        socket.to(roomId).emit("user_left", socket.id);
        delete socketToRoom[socket.id];

        if (leavingUser) {
          try {
            const roomData = await findVoiceRoomById(pool, rId);
            if (roomData && roomData.host_id === leavingUser.userId) {
              socket.to(roomId).emit("room_closed");
              const socketsInRoom = await io.in(roomId).fetchSockets();
              socketsInRoom.forEach((s) => s.disconnect(true));

              await deleteVoiceRoomRow(pool, rId);
              delete users[roomId];
              return;
            }

            const currentCount = await removeRoomParticipant(
              pool,
              rId,
              leavingUser.userId
            );
            if (
              currentCount <= 0 &&
              (!users[roomId] || users[roomId].length === 0)
            ) {
              await deleteVoiceRoomRow(pool, rId);
              delete users[roomId];
            }
          } catch (err) {
            console.error(err);
          }
        }
      }
    });
  });
}
