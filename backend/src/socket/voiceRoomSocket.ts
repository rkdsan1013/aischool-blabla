// backend/src/socket/voiceRoomSocket.ts
import { Server, Socket } from "socket.io";
import { pool } from "../config/db";
import {
  addRoomParticipant,
  removeRoomParticipant,
  deleteVoiceRoomRow,
  findVoiceRoomById,
} from "../models/voiceroomModel";

interface User {
  socketId: string;
  userId: number;
  name: string;
  level?: string;
}

const users: Record<string, User[]> = {};
const socketToRoom: Record<string, string> = {};

export default function voiceRoomSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`✅ [Socket] New Client Connected: ${socket.id}`);

    // 1. 방 입장
    socket.on("join_room", async (data) => {
      console.log(`📩 [Socket] join_room 요청:`, data);

      const { roomId, userId, name, userLevel = "A1" } = data;
      const rId = Number(roomId);

      // DB 상태 확인 (방 존재 여부, 인원수 체크)
      try {
        const roomData = await findVoiceRoomById(pool, rId);
        if (!roomData) {
          socket.emit("error_message", "존재하지 않는 방입니다.");
          return;
        }
        if (roomData.current_participants >= roomData.max_participants) {
          // 이미 내가 참여중인지 확인하지 않고 단순 인원 체크 시 재접속 문제가 있을 수 있으나,
          // 여기서는 일단 단순 인원수로 차단
          socket.emit("room_full");
          return;
        }
      } catch (err) {
        return;
      }

      // 메모리 관리
      const newUser = { socketId: socket.id, userId, name, level: userLevel };
      if (users[roomId]) {
        if (!users[roomId].find((u) => u.socketId === socket.id)) {
          users[roomId].push(newUser);
        }
      } else {
        users[roomId] = [newUser];
      }

      socketToRoom[socket.id] = roomId;
      socket.join(roomId);

      // ✅ [DB Update] 실제 유저 등록 (프로필 이미지 표시를 위해 필수)
      try {
        await addRoomParticipant(pool, rId, userId);
      } catch (err) {
        console.error(`Failed to add participant DB:`, err);
      }

      const usersInThisRoom = users[roomId].filter(
        (u) => u.socketId !== socket.id
      );
      socket.emit("all_users", usersInThisRoom);
    });

    // Signaling
    socket.on("sending_signal", (p) =>
      io
        .to(p.userToSignal)
        .emit("user_joined", {
          signal: p.signal,
          callerID: p.callerID,
          userInfo: p.userInfo,
        })
    );
    socket.on("returning_signal", (p) =>
      io
        .to(p.callerID)
        .emit("receiving_returned_signal", { signal: p.signal, id: socket.id })
    );
    socket.on("toggle_mute", (m) => {
      const r = socketToRoom[socket.id];
      if (r)
        socket
          .to(r)
          .emit("user_mute_change", { socketId: socket.id, isMuted: m });
    });
    socket.on("local_transcript", (p) => {
      const r = socketToRoom[socket.id];
      if (r) io.to(r).emit("transcript_item", p);
    });

    // 5. Disconnect
    socket.on("disconnect", async () => {
      console.log(`❌ [Socket] Disconnected: ${socket.id}`);
      const roomId = socketToRoom[socket.id];

      if (roomId) {
        // 나가는 유저 정보 찾기 (userId 필요)
        const leavingUser = users[roomId]?.find(
          (u) => u.socketId === socket.id
        );

        // 메모리 정리
        if (users[roomId]) {
          users[roomId] = users[roomId].filter((u) => u.socketId !== socket.id);
        }

        socket.to(roomId).emit("user_left", socket.id);
        delete socketToRoom[socket.id];

        // ✅ [DB Update] 유저 제거 및 빈 방 삭제
        if (leavingUser) {
          try {
            const rId = Number(roomId);
            const currentCount = await removeRoomParticipant(
              pool,
              rId,
              leavingUser.userId
            );

            if (
              currentCount <= 0 &&
              (!users[roomId] || users[roomId].length === 0)
            ) {
              console.log(`🧹 Room ${roomId} empty. Deleting...`);
              await deleteVoiceRoomRow(pool, rId);
              delete users[roomId];
            }
          } catch (err) {
            console.error("Failed to remove participant on disconnect:", err);
          }
        }
      }
    });
  });
}
