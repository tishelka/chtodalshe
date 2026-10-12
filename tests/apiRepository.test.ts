import { describe, expect, it, vi } from "vitest";
import {
  ApiRepository,
  ApiError,
  API_PAGE_SIZE,
  type ApiFetch,
} from "../src/data/apiRepository";
import { catalog } from "../src/data/catalog";
import {
  DEFAULT_FILTERS,
  emptyUserData,
  type HistoryEntry,
} from "../src/types/domain";

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
function fixture(failurePath?: string) {
  const requests: { url: URL; init: RequestInit }[] = [];
  const transport: ApiFetch = async (input, init) => {
    const url = new URL(input);
    requests.push({ url, init });
    if (url.pathname === failurePath)
      return json({ detail: "unavailable" }, 503);
    if (init.method !== "GET") return new Response(null, { status: 204 });
    if (url.pathname === "/activities") return json(catalog);
    if (url.pathname === "/preferences")
      return json({
        interests: ["walks"],
        onboardingCompleted: true,
        lastFilters: DEFAULT_FILTERS,
      });
    if (url.pathname === "/favorites") return json([catalog[0]!.id]);
    if (url.pathname === "/history") return json([ENTRY]);
    return json({ detail: "not found" }, 404);
  };
  return {
    requests,
    transport,
    repo: new ApiRepository("http://api.example.test", transport),
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
        await new ApiRepository("http://api.example.test").getActivities(),
      ).toEqual(catalog);
    } finally {
      spy.mockRestore();
    }
  });
  it("загружает данные прямыми GET-запросами без токенов и регистрации", async () => {
    const { repo, requests } = fixture();
    expect(await repo.getActivities()).toEqual(catalog);
    const data = await repo.load();
    expect(data.preferences.interests).toEqual(["walks"]);
    expect(data.favorites).toEqual([catalog[0]!.id]);
    expect(data.history).toEqual([ENTRY]);
    expect(requests.map(({ url }) => url.pathname).sort()).toEqual([
      "/activities",
      "/favorites",
      "/history",
      "/preferences",
    ]);
    expect(
      requests.every(
        ({ init }) =>
          init.method === "GET" &&
          !new Headers(init.headers).has("Authorization"),
      ),
    ).toBe(true);
  });
  it("после перезапуска снова читает сохранённые данные с сервера", async () => {
    const { repo, transport } = fixture();
    const initial = await repo.load();
    expect(
      await new ApiRepository("http://api.example.test/", transport).load(),
    ).toEqual(initial);
  });
  it("записывает настройки, избранное, историю и отметку выбора через HTTP", async () => {
    const { repo, requests } = fixture();
    await repo.savePreferences(emptyUserData().preferences);
    await repo.setFavorite(catalog[0]!.id, true);
    await repo.setFavorite(catalog[0]!.id, false);
    await repo.addHistory(ENTRY);
    await repo.setHistoryChosen(ENTRY.id, true);
    await repo.clearHistory();
    expect(requests.map(({ init }) => init.method)).toEqual([
      "PUT",
      "PUT",
      "DELETE",
      "PUT",
      "PATCH",
      "DELETE",
    ]);
    expect(JSON.parse(String(requests[3]!.init.body))).toEqual(ENTRY);
    expect(JSON.parse(String(requests[4]!.init.body))).toEqual({
      chosen: true,
    });
    expect(
      requests.every(
        ({ init }) => !new Headers(init.headers).has("Authorization"),
      ),
    ).toBe(true);
  });
  it.each(["/activities", "/history", "/favorites", "/preferences"])(
    "передаёт ошибку загрузки %s",
    async (path) => {
      const { repo } = fixture(path);
      await expect(
        path === "/activities" ? repo.getActivities() : repo.load(),
      ).rejects.toBeInstanceOf(ApiError);
    },
  );
  it("передаёт ошибку записи", async () => {
    const { repo } = fixture(`/favorites/${catalog[0]!.id}`);
    await expect(repo.setFavorite(catalog[0]!.id, true)).rejects.toMatchObject({
      status: 503,
    });
  });
  it("читает вторую страницу большого каталога", async () => {
    const offsets: string[] = [];
    const repo = new ApiRepository("http://api.example.test", async (input) => {
      const offset = new URL(input).searchParams.get("offset")!;
      offsets.push(offset);
      return json(
        offset === "0"
          ? Array.from({ length: API_PAGE_SIZE }, () => catalog[0])
          : [catalog[1]],
      );
    });
    expect(await repo.getActivities()).toHaveLength(501);
    expect(offsets).toEqual(["0", "500"]);
  });
  it("проверяет данные, пришедшие с сервера", async () => {
    const repo = new ApiRepository("http://api.example.test", async () =>
      json([{ title: "incomplete" }]),
    );
    await expect(repo.getActivities()).rejects.toThrow("invalid activity");
  });
  it("прерывает зависший запрос по тайм-ауту", async () => {
    const repo = new ApiRepository(
      "http://api.example.test",
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
  it("dispose прерывает активный запрос и запрещает новые", async () => {
    const started = Promise.withResolvers<void>();
    const repo = new ApiRepository(
      "http://api.example.test",
      async (_input, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
          started.resolve();
        }),
    );
    const pending = expect(repo.getActivities()).rejects.toThrow("aborted");
    await started.promise;
    repo.dispose();
    await pending;
    await expect(repo.getActivities()).rejects.toThrow("repository disposed");
  });
  it.each([
    "ftp://example.test",
    "http://user:password@example.test",
    "http://example.test?token=secret",
  ])("отклоняет неверный адрес %s", (url) =>
    expect(() => new ApiRepository(url)).toThrow(),
  );
});
