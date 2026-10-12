import type {
  Activity,
  HistoryEntry,
  Preferences,
  UserData,
} from "../types/domain";
import type { Repository } from "./repository";
import { parseActivity, parseHistory, parsePreferences } from "./validation";

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
export class ApiRepository implements Repository {
  readonly baseUrl: string;
  private controllers = new Set<AbortController>();
  private disposed = false;
  constructor(
    url: string,
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
  }
  private async request(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<unknown> {
    if (this.disposed) throw new Error("repository disposed");
    const controller = new AbortController();
    this.controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.transport(`${this.baseUrl}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok)
        throw new ApiError(
          response.status,
          "Не удалось выполнить запрос к серверу.",
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
  ): Promise<T[]> {
    const items: T[] = [];
    for (let offset = 0; ; offset += API_PAGE_SIZE) {
      const data = await this.request(
        `${path}?offset=${offset}&limit=${API_PAGE_SIZE}`,
        "GET",
        undefined,
      );
      if (!Array.isArray(data)) throw new Error("invalid page response");
      items.push(...data.map(parse));
      if (data.length < API_PAGE_SIZE) return items;
    }
  }
  getActivities(): Promise<readonly Activity[]> {
    return this.pages("/activities", parseActivity);
  }
  async load(): Promise<UserData> {
    const [preferences, favorites, history] = await Promise.all([
      this.request("/preferences").then(parsePreferences),
      this.pages("/favorites", (value) => {
        if (typeof value !== "string") throw new Error("invalid favorite");
        return value;
      }),
      this.pages("/history", parseHistory),
    ]);
    return {
      preferences,
      favorites: [...new Set(favorites)],
      history: history.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }
  async savePreferences(preferences: Preferences) {
    await this.request("/preferences", "PUT", preferences);
  }
  async setFavorite(activityId: string, saved: boolean) {
    await this.request(
      `/favorites/${encodeURIComponent(activityId)}`,
      saved ? "PUT" : "DELETE",
    );
  }
  async addHistory(entry: HistoryEntry) {
    await this.request(
      `/history/${encodeURIComponent(entry.id)}`,
      "PUT",
      entry,
    );
  }
  async setHistoryChosen(entryId: string, chosen: boolean) {
    await this.request(`/history/${encodeURIComponent(entryId)}`, "PATCH", {
      chosen,
    });
  }
  async clearHistory() {
    await this.request("/history", "DELETE");
  }
  dispose() {
    this.disposed = true;
    for (const controller of this.controllers) controller.abort();
  }
}
