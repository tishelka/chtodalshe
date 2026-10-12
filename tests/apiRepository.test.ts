import { describe, expect, it, vi } from "vitest";
import {
  ApiRepository,
  ApiError,
  API_PAGE_SIZE,
  type ApiFetch,
} from "../src/data/apiRepository";
import type { KeyValueStorage } from "../src/data/repository";
import { catalog } from "../src/data/catalog";
import {
  DEFAULT_FILTERS,
  emptyUserData,
  type HistoryEntry,
} from "../src/types/domain";

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  async getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
const TOKEN = "test-opaque-session-token-000000000000000000000";
const SESSION = {
  accessToken: TOKEN,
  tokenType: "bearer",
  userId: "20000000-0000-4000-8000-000000000001",
};
const ENTRY: HistoryEntry = {
  id: "30000000-0000-4000-8000-000000000001",
  activityId: catalog[0]!.id,
  createdAt: "2026-10-12T12:00:00Z",
  filters: { ...DEFAULT_FILTERS },
  chosen: false,
};
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function fixture(failurePath?: string, storage = new MemoryStorage()) {
  const requests: { url: URL; init: RequestInit }[] = [];
  const transport: ApiFetch = async (input, init) => {
    const url = new URL(input);
    requests.push({ url, init });
    if (url.pathname === failurePath)
      return json({ detail: "unavailable" }, 503);
    if (url.pathname === "/sessions/anonymous") return json(SESSION, 201);
    if (init.method !== "GET") return new Response(null, { status: 204 });
    if (url.pathname === "/activities") return json(catalog);
    if (url.pathname === "/me/preferences")
      return json({
        interests: ["walks"],
        onboardingCompleted: true,
        lastFilters: DEFAULT_FILTERS,
      });
    if (url.pathname === "/me/favorites") return json([catalog[0]!.id]);
    if (url.pathname === "/me/history") return json([ENTRY]);
    return json({ detail: "not found" }, 404);
  };
  return {
    requests,
    storage,
    transport,
    repo: new ApiRepository("http://api.example.test", storage, transport),
  };
}

describe("ApiRepository", () => {
  it("вызывает браузерный fetch без привязки к экземпляру репозитория", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(function (
      this: unknown,
    ) {
      if (this instanceof ApiRepository) throw new Error("illegal invocation");
      return Promise.resolve(json(catalog));
    });
    try {
      expect(
        await new ApiRepository(
          "http://api.example.test",
          new MemoryStorage(),
        ).getActivities(),
      ).toEqual(catalog);
    } finally {
      spy.mockRestore();
    }
  });
  it("получает каталог без авторизации и загружает личные данные после анонимного входа", async () => {
    const { repo, requests } = fixture();
    expect(await repo.getActivities()).toEqual(catalog);
    const data = await repo.load();
    expect(data.preferences.interests).toEqual(["walks"]);
    expect(data.history).toEqual([ENTRY]);
    expect(
      requests.filter(
        (request) => request.url.pathname === "/sessions/anonymous",
      ),
    ).toHaveLength(1);
    expect(
      requests
        .filter((request) => request.url.pathname.startsWith("/me/"))
        .every(
          (request) =>
            new Headers(request.init.headers).get("Authorization") ===
            `Bearer ${TOKEN}`,
        ),
    ).toBe(true);
    expect(new Headers(requests[0]!.init.headers).has("Authorization")).toBe(
      false,
    );
  });
  it("параллельные запросы создают одну сессию", async () => {
    const { repo, requests } = fixture();
    await Promise.all([repo.load(), repo.setFavorite(catalog[0]!.id, true)]);
    expect(
      requests.filter(
        (request) => request.url.pathname === "/sessions/anonymous",
      ),
    ).toHaveLength(1);
  });
  it("после перезапуска использует сохранённый токен", async () => {
    const { repo, requests, storage, transport } = fixture();
    await repo.load();
    await new ApiRepository(
      "http://api.example.test/",
      storage,
      transport,
    ).load();
    expect(
      requests.filter(
        (request) => request.url.pathname === "/sessions/anonymous",
      ),
    ).toHaveLength(1);
  });
  it("хранит сессии разных серверов и локальные данные раздельно", async () => {
    const { repo, storage, transport } = fixture();
    await repo.load();
    const another = new ApiRepository(
      "http://another.example.test",
      storage,
      transport,
    );
    await another.load();
    expect(another.sessionKey).not.toBe(repo.sessionKey);
    expect(storage.values.size).toBe(2);
    expect(
      [...storage.values.keys()].every((key) =>
        key.startsWith("whatnext.api.session.v1:"),
      ),
    ).toBe(true);
  });
  it("записывает настройки, избранное, историю и отметку выбора через HTTP", async () => {
    const { repo, requests } = fixture();
    await repo.savePreferences(emptyUserData().preferences);
    await repo.setFavorite(catalog[0]!.id, true);
    await repo.setFavorite(catalog[0]!.id, false);
    await repo.addHistory(ENTRY);
    await repo.setHistoryChosen(ENTRY.id, true);
    await repo.clearHistory();
    const writes = requests.filter((request) =>
      request.url.pathname.startsWith("/me/"),
    );
    expect(writes.map((request) => request.init.method)).toEqual([
      "PUT",
      "PUT",
      "DELETE",
      "PUT",
      "PATCH",
      "DELETE",
    ]);
    expect(JSON.parse(String(writes[3]!.init.body))).toEqual(ENTRY);
    expect(JSON.parse(String(writes[4]!.init.body))).toEqual({ chosen: true });
  });
  it.each(["/activities", "/me/history", "/me/favorites"])(
    "передаёт ошибку %s без скрытого fallback",
    async (path) => {
      const { repo } = fixture(path);
      await expect(
        path === "/activities" ? repo.getActivities() : repo.load(),
      ).rejects.toBeInstanceOf(ApiError);
    },
  );
  it("ошибка записи не игнорируется", async () => {
    const { repo } = fixture(`/me/favorites/${catalog[0]!.id}`);
    await expect(repo.setFavorite(catalog[0]!.id, true)).rejects.toMatchObject({
      status: 503,
    });
  });
  it("401 не создаёт новый аккаунт и не заменяет сохранённую сессию", async () => {
    const storage = new MemoryStorage();
    const repo = new ApiRepository(
      "http://api.example.test",
      storage,
      async () => json({}, 401),
    );
    const saved = JSON.stringify(SESSION);
    await storage.setItem(repo.sessionKey, saved);
    await expect(repo.load()).rejects.toMatchObject({ status: 401 });
    expect(storage.values.get(repo.sessionKey)).toBe(saved);
  });
  it("читает вторую страницу большого каталога", async () => {
    const offsets: string[] = [];
    const repo = new ApiRepository(
      "http://api.example.test",
      new MemoryStorage(),
      async (input) => {
        const offset = new URL(input).searchParams.get("offset")!;
        offsets.push(offset);
        return json(
          offset === "0"
            ? Array.from({ length: API_PAGE_SIZE }, () => catalog[0])
            : [catalog[1]],
        );
      },
    );
    expect(await repo.getActivities()).toHaveLength(501);
    expect(offsets).toEqual(["0", "500"]);
  });
  it("проверяет данные, пришедшие с сервера", async () => {
    const repo = new ApiRepository(
      "http://api.example.test",
      new MemoryStorage(),
      async () => json([{ title: "incomplete" }]),
    );
    await expect(repo.getActivities()).rejects.toThrow("invalid activity");
  });
  it("прерывает зависший запрос по тайм-ауту", async () => {
    const repo = new ApiRepository(
      "http://api.example.test",
      new MemoryStorage(),
      async (_input, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        }),
      10,
    );
    await expect(repo.getActivities()).rejects.toThrow("aborted");
  });
  it("не перезаписывает повреждённое хранилище сессии", async () => {
    const { repo, storage } = fixture();
    await storage.setItem(repo.sessionKey, "broken");
    await expect(repo.load()).rejects.toThrow();
    expect(storage.values.get(repo.sessionKey)).toBe("broken");
  });
  it.each([
    "ftp://example.test",
    "http://user:password@example.test",
    "http://example.test?token=secret",
  ])("отклоняет неверный адрес %s", (url) =>
    expect(() => new ApiRepository(url, new MemoryStorage())).toThrow(),
  );
});
