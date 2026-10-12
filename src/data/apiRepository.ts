import type {
  Activity,
  HistoryEntry,
  Preferences,
  UserData,
} from "../types/domain";
import type { KeyValueStorage, Repository } from "./repository";
import {
  isRecord,
  parseActivity,
  parseHistory,
  parsePreferences,
} from "./validation";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export type ApiFetch = (input: string, init: RequestInit) => Promise<Response>;
export const API_PAGE_SIZE = 500;
interface Session {
  accessToken: string;
  tokenType: "bearer";
  userId: string;
}
function parseSession(value: unknown): Session {
  if (
    !isRecord(value) ||
    typeof value.accessToken !== "string" ||
    value.accessToken.length < 20 ||
    value.tokenType !== "bearer" ||
    typeof value.userId !== "string"
  )
    throw new Error("invalid session");
  return {
    accessToken: value.accessToken,
    tokenType: "bearer",
    userId: value.userId,
  };
}

export class ApiRepository implements Repository {
  readonly mode = "api" as const;
  readonly baseUrl: string;
  readonly sessionKey: string;
  private token: string | null = null;
  private sessionPromise: Promise<string> | null = null;
  private controllers = new Set<AbortController>();
  private disposed = false;
  constructor(
    url: string,
    private readonly storage: KeyValueStorage,
    private readonly transport: ApiFetch = (input, init) => fetch(input, init),
    private readonly timeoutMs = 15000,
  ) {
    const parsed = new URL(url);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    )
      throw new Error("invalid API URL");
    this.baseUrl = parsed.toString().replace(/\/+$/, "");
    this.sessionKey = `whatnext.api.session.v1:${this.baseUrl}`;
  }
  private async authenticate(): Promise<string> {
    if (this.token) return this.token;
    if (!this.sessionPromise) {
      this.sessionPromise = (async () => {
        const saved = await this.storage.getItem(this.sessionKey);
        let session: Session;
        if (saved !== null) session = parseSession(JSON.parse(saved));
        else {
          session = parseSession(
            await this.request("/sessions/anonymous", "POST", undefined, false),
          );
          await this.storage.setItem(this.sessionKey, JSON.stringify(session));
        }
        this.token = session.accessToken;
        return this.token;
      })().finally(() => {
        this.sessionPromise = null;
      });
    }
    return this.sessionPromise;
  }
  private async request(
    path: string,
    method = "GET",
    body?: unknown,
    authenticated = true,
  ): Promise<unknown> {
    if (this.disposed) throw new Error("repository disposed");
    const token = authenticated ? await this.authenticate() : null;
    if (this.disposed) throw new Error("repository disposed");
    const controller = new AbortController();
    this.controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.transport(`${this.baseUrl}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok)
        throw new ApiError(
          response.status,
          response.status === 401
            ? "Сессия недействительна. Данные не были удалены."
            : "Не удалось выполнить запрос к серверу.",
        );
      return response.status === 204 ? undefined : await response.json();
    } finally {
      clearTimeout(timer);
      this.controllers.delete(controller);
    }
  }
  private async pages<T>(
    path: string,
    parse: (item: unknown) => T,
    authenticated = true,
  ): Promise<T[]> {
    const items: T[] = [];
    for (let offset = 0; ; offset += API_PAGE_SIZE) {
      const data = await this.request(
        `${path}?offset=${offset}&limit=${API_PAGE_SIZE}`,
        "GET",
        undefined,
        authenticated,
      );
      if (!Array.isArray(data)) throw new Error("invalid page response");
      items.push(...data.map(parse));
      if (data.length < API_PAGE_SIZE) return items;
    }
  }
  getActivities(): Promise<readonly Activity[]> {
    return this.pages("/activities", parseActivity, false);
  }
  async load(): Promise<UserData> {
    const [preferences, favorites, history] = await Promise.all([
      this.request("/me/preferences").then(parsePreferences),
      this.pages("/me/favorites", (value) => {
        if (typeof value !== "string") throw new Error("invalid favorite");
        return value;
      }),
      this.pages("/me/history", parseHistory),
    ]);
    return {
      preferences,
      favorites: [...new Set(favorites)],
      history: history.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }
  async savePreferences(preferences: Preferences) {
    await this.request("/me/preferences", "PUT", preferences);
  }
  async setFavorite(activityId: string, saved: boolean) {
    await this.request(
      `/me/favorites/${encodeURIComponent(activityId)}`,
      saved ? "PUT" : "DELETE",
    );
  }
  async addHistory(entry: HistoryEntry) {
    await this.request(
      `/me/history/${encodeURIComponent(entry.id)}`,
      "PUT",
      entry,
    );
  }
  async setHistoryChosen(entryId: string, chosen: boolean) {
    await this.request(`/me/history/${encodeURIComponent(entryId)}`, "PATCH", {
      chosen,
    });
  }
  async clearHistory() {
    await this.request("/me/history", "DELETE");
  }
  dispose() {
    this.disposed = true;
    for (const controller of this.controllers) controller.abort();
  }
}
