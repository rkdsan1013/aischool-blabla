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

interface User {
  socketId: string;
  userId: number;
  name: string;
  level?: string;
  isMuted: boolean;
}

const users: Record<string, User[]> = {};
const socketToRoom: Record<string, string> = {};

export default function voiceRoomSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`✅ [Socket] Connected: ${socket.id}`);

    // 1. 방 입장
    socket.on("join_room", async (data) => {
      const { roomId, userId, name, userLevel = "A1", isMuted = false } = data;
      const rId = Number(roomId);

      // ✅ [Critical] 강퇴 여부 최우선 확인
      try {
        const isBanned = await checkIsBanned(pool, rId, userId);
        if (isBanned) {
          console.warn(
            `🚫 Banned user attempted entry: ${userId} in room ${roomId}`
          );
          socket.emit("error_message", "강퇴당한 방에는 재입장할 수 없습니다.");
          socket.disconnect(true); // 서버 측에서 즉시 연결 끊기
          return; // 로직 중단
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
        // DB상 인원 마감 체크
        if (roomData.current_participants >= roomData.max_participants) {
          socket.emit("room_full");
          socket.disconnect(true);
          return;
        }
      } catch (err) {
        return;
      }

      // --- 이하 정상 입장 로직 ---
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

    socket.on("local_transcript", (p) => {
      const r = socketToRoom[socket.id];
      if (r) io.to(r).emit("transcript_item", p);
    });

    // Mute Sync
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

    // 강퇴
    socket.on(
      "kick_user",
      async (data: {
        roomId: string;
        targetUserId: number;
        targetSocketId: string;
      }) => {
        const { roomId, targetUserId, targetSocketId } = data;
        const rId = Number(roomId);
        try {
          const roomData = await findVoiceRoomById(pool, rId);
          const requester = users[roomId]?.find(
            (u) => u.socketId === socket.id
          );

          if (roomData && requester && roomData.host_id === requester.userId) {
            await banUser(pool, rId, targetUserId);

            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
              targetSocket.emit("kicked");
              targetSocket.disconnect(true); // 강퇴 시 강제 끊기
            }

            // 메모리 정리 및 전파
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
      }
    );

    // Disconnect
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
              console.log(`👑 Host left. Closing room...`);
              socket.to(roomId).emit("room_closed");

              // 방에 남은 사람들 강제 퇴장 처리
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
