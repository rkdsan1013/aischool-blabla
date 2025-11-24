// backend/src/socket/voiceRoomSocket.ts
import { Server, Socket } from "socket.io";
import { pool } from "../config/db";
import {
  incrementParticipants,
  decrementParticipants,
  deleteVoiceRoomRow,
  findVoiceRoomById, // ✅ [추가] 방 정보 조회용
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

      // ✅ [Critical Fix] DB에서 방 정보 및 현재 인원 확인 (임의 접속 차단)
      try {
        const roomData = await findVoiceRoomById(pool, rId);

        if (!roomData) {
          // 방이 없는 경우
          socket.emit("error_message", "존재하지 않는 방입니다.");
          return;
        }

        // 방이 꽉 찼는지 DB 기준 체크
        if (roomData.current_participants >= roomData.max_participants) {
          console.warn(
            `⛔ Room ${roomId} is full (DB check). Rejecting ${socket.id}`
          );
          socket.emit("room_full");
          return;
        }
      } catch (err) {
        console.error("DB Error checking room capacity:", err);
        return;
      }

      // 메모리 상의 유저 관리
      const newUser = { socketId: socket.id, userId, name, level: userLevel };
      if (users[roomId]) {
        // 메모리상 이중 체크 (Socket Room 기준)
        if (users[roomId].length >= 8) {
          // 하드 리미트
          socket.emit("room_full");
          return;
        }
        users[roomId].push(newUser);
      } else {
        users[roomId] = [newUser];
      }

      socketToRoom[socket.id] = roomId;
      socket.join(roomId);

      // DB Update: 참여자 수 증가
      try {
        await incrementParticipants(pool, rId);
      } catch (err) {
        console.error(
          `⚠️ Failed to increment participants for room ${roomId}:`,
          err
        );
      }

      const usersInThisRoom = users[roomId].filter(
        (user) => user.socketId !== socket.id
      );

      socket.emit("all_users", usersInThisRoom);

      console.log(
        `👤 [Socket] User joined: ${name} (${userId}) in Room ${roomId}`
      );
    });

    // Signaling - Offer
    socket.on("sending_signal", (payload) => {
      io.to(payload.userToSignal).emit("user_joined", {
        signal: payload.signal,
        callerID: payload.callerID,
        userInfo: payload.userInfo,
      });
    });

    // Signaling - Answer
    socket.on("returning_signal", (payload) => {
      io.to(payload.callerID).emit("receiving_returned_signal", {
        signal: payload.signal,
        id: socket.id,
      });
    });

    // Mute Toggle
    socket.on("toggle_mute", (isMuted: boolean) => {
      const roomId = socketToRoom[socket.id];
      if (roomId) {
        socket
          .to(roomId)
          .emit("user_mute_change", { socketId: socket.id, isMuted });
      }
    });

    // Local Transcript Relay
    socket.on("local_transcript", (payload) => {
      const roomId = socketToRoom[socket.id];
      if (!roomId) return;
      io.to(roomId).emit("transcript_item", payload);
    });

    // 5. Disconnect (퇴장 및 방 삭제)
    socket.on("disconnect", async () => {
      console.log(`❌ [Socket] Disconnected: ${socket.id}`);
      const roomId = socketToRoom[socket.id];

      if (roomId) {
        // 메모리 정리
        let room = users[roomId];
        if (room) {
          room = room.filter((user) => user.socketId !== socket.id);
          users[roomId] = room;
        }

        socket.to(roomId).emit("user_left", socket.id);
        delete socketToRoom[socket.id];

        // DB Update
        try {
          const rId = Number(roomId);
          const currentCount = await decrementParticipants(pool, rId);

          // 0명이면 방 삭제
          if (
            currentCount <= 0 &&
            (!users[roomId] || users[roomId].length === 0)
          ) {
            console.log(`🧹 Room ${roomId} is empty. Deleting from DB...`);
            await deleteVoiceRoomRow(pool, rId);
            delete users[roomId];
          }
        } catch (err) {
          console.error("Failed to update/delete room on disconnect:", err);
        }
      }
    });
  });
}
