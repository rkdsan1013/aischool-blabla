// backend/src/services/levelTestStore.ts
// Simple in-memory session store for level tests (development/testing use)

type LevelTestMessage = {
  role: "user" | "ai";
  content: string;
  createdAt: number;
};

type LevelTestSession = {
  sessionId: number;
  userId: number | null;
  level: string;
  createdAt: number;
  messages: LevelTestMessage[];
  metadata?: Record<string, any>;
  expiresAt?: number | null;
};

class LevelTestStore {
  private map: Map<number, LevelTestSession> = new Map();
  private nextId = 1;
  private ttlMs: number | null = 30 * 60 * 1000; // 30 minutes default

  constructor(ttlMs?: number | null) {
    if (typeof ttlMs === "number") this.ttlMs = ttlMs;
    if (this.ttlMs) {
      setInterval(
        () => this.cleanupExpired(),
        Math.max(60_000, this.ttlMs / 6)
      );
    }
  }

  create(userId: number | null, level: string, initialAiText?: string) {
    const id = this.nextId++;
    const now = Date.now();
    const session: LevelTestSession = {
      sessionId: id,
      userId,
      level,
      createdAt: now,
      messages: [],
      metadata: {},
      expiresAt: this.ttlMs ? now + this.ttlMs : null,
    };
    if (initialAiText) {
      session.messages.push({
        role: "ai",
        content: initialAiText,
        createdAt: now,
      });
    }
    this.map.set(id, session);
    return session;
  }

  get(sessionId: number) {
    const s = this.map.get(sessionId) ?? null;
    if (!s) return null;
    if (s.expiresAt && Date.now() > s.expiresAt) {
      this.map.delete(sessionId);
      return null;
    }
    return s;
  }

  appendMessage(sessionId: number, role: "user" | "ai", content: string) {
    const s = this.map.get(sessionId);
    if (!s) return null;
    const msg = { role, content, createdAt: Date.now() };
    s.messages.push(msg);
    if (s.expiresAt) s.expiresAt = Date.now() + (this.ttlMs ?? 0);
    return msg;
  }

  setMetadata(sessionId: number, key: string, value: any) {
    const s = this.map.get(sessionId);
    if (!s) return false;
    s.metadata = s.metadata ?? {};
    s.metadata[key] = value;
    if (s.expiresAt) s.expiresAt = Date.now() + (this.ttlMs ?? 0);
    return true;
  }

  delete(sessionId: number) {
    return this.map.delete(sessionId);
  }

  list() {
    return Array.from(this.map.values());
  }

  cleanupExpired() {
    const now = Date.now();
    for (const [id, s] of this.map.entries()) {
      if (s.expiresAt && now > s.expiresAt) {
        this.map.delete(id);
      }
    }
  }
}

export const levelTestStore = new LevelTestStore();
export type { LevelTestSession, LevelTestMessage };
