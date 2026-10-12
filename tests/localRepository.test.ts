import { describe, expect, it } from "vitest";
import { LocalRepository, DEMO_STORAGE_KEY } from "../src/data/localRepository";
import type { KeyValueStorage } from "../src/data/repository";
import {
  emptyUserData,
  DEFAULT_FILTERS,
  type HistoryEntry,
} from "../src/types/domain";
class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  failNextWrite = false;
  async getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new Error("disk full");
    }
    this.values.set(key, value);
  }
}
function entry(id = "history-1"): HistoryEntry {
  return {
    id,
    activityId: "activity-1",
    createdAt: "2026-10-09T12:00:00Z",
    filters: { ...DEFAULT_FILTERS },
    chosen: false,
  };
}

describe("Локальное хранение", () => {
  it("работает без сети и конфигурации backend", async () => {
    const repo = new LocalRepository(new MemoryStorage());
    expect(await repo.load()).toEqual(emptyUserData());
    expect(await repo.getActivities()).toHaveLength(70);
  });
  it("повторное добавление в избранное не создаёт дубликаты", async () => {
    const repo = new LocalRepository(new MemoryStorage());
    await Promise.all([
      repo.setFavorite("a", true),
      repo.setFavorite("a", true),
      repo.setFavorite("b", true),
    ]);
    expect((await repo.load()).favorites).toEqual(["a", "b"]);
    await repo.setFavorite("a", false);
    expect((await repo.load()).favorites).toEqual(["b"]);
  });
  it("восстанавливает интересы, онбординг и прошлые фильтры после перезапуска", async () => {
    const storage = new MemoryStorage();
    const repo = new LocalRepository(storage);
    const preferences = {
      interests: ["walks", "reading"] as const,
      onboardingCompleted: true,
      lastFilters: { ...DEFAULT_FILTERS, participants: 3 },
    };
    await repo.savePreferences({
      ...preferences,
      interests: [...preferences.interests],
    });
    expect((await new LocalRepository(storage).load()).preferences).toEqual(
      preferences,
    );
  });
  it("сохраняет историю и статус выбранного занятия", async () => {
    const storage = new MemoryStorage();
    const repo = new LocalRepository(storage);
    await repo.addHistory(entry());
    await repo.setHistoryChosen("history-1", true);
    expect((await new LocalRepository(storage).load()).history).toEqual([
      { ...entry(), chosen: true },
    ]);
  });
  it("одна активность может встречаться в разных записях истории", async () => {
    const repo = new LocalRepository(new MemoryStorage());
    await repo.addHistory(entry("one"));
    await repo.addHistory(entry("two"));
    await repo.setHistoryChosen("two", true);
    const history = (await repo.load()).history;
    expect(history).toHaveLength(2);
    expect(history.find((item) => item.id === "one")?.chosen).toBe(false);
    expect(history.find((item) => item.id === "two")?.chosen).toBe(true);
  });
  it("повторная запись того же ID идемпотентна", async () => {
    const repo = new LocalRepository(new MemoryStorage());
    await repo.addHistory(entry());
    await repo.addHistory(entry());
    expect((await repo.load()).history).toHaveLength(1);
  });
  it("история упорядочена от новых рекомендаций к старым", async () => {
    const repo = new LocalRepository(new MemoryStorage());
    await repo.addHistory({
      ...entry("old"),
      createdAt: "2026-10-08T12:00:00Z",
    });
    await repo.addHistory(entry("new"));
    expect((await repo.load()).history.map((item) => item.id)).toEqual([
      "new",
      "old",
    ]);
  });
  it("очистка истории не удаляет избранное и интересы", async () => {
    const repo = new LocalRepository(new MemoryStorage());
    await repo.savePreferences({
      ...emptyUserData().preferences,
      interests: ["cooking"],
    });
    await repo.setFavorite("a", true);
    await repo.addHistory(entry());
    await repo.clearHistory();
    const data = await repo.load();
    expect(data.history).toEqual([]);
    expect(data.favorites).toEqual(["a"]);
    expect(data.preferences.interests).toEqual(["cooking"]);
  });
  it("ошибка записи не уничтожает данные и разрешает повторную попытку", async () => {
    const storage = new MemoryStorage();
    const repo = new LocalRepository(storage);
    await repo.setFavorite("a", true);
    storage.failNextWrite = true;
    await expect(repo.setFavorite("b", true)).rejects.toThrow("disk full");
    expect((await repo.load()).favorites).toEqual(["a"]);
    await repo.setFavorite("b", true);
    expect((await repo.load()).favorites).toEqual(["a", "b"]);
  });
  it("не перезаписывает повреждённые данные пустым состоянием", async () => {
    const storage = new MemoryStorage();
    storage.values.set(DEMO_STORAGE_KEY, "broken json");
    const repo = new LocalRepository(storage);
    await expect(repo.load()).rejects.toThrow();
    await expect(repo.setFavorite("a", true)).rejects.toThrow();
    expect(storage.values.get(DEMO_STORAGE_KEY)).toBe("broken json");
  });
  it("не загружает неизвестную версию локального формата", async () => {
    const storage = new MemoryStorage();
    storage.values.set(
      DEMO_STORAGE_KEY,
      JSON.stringify({ version: 9, data: emptyUserData() }),
    );
    await expect(new LocalRepository(storage).load()).rejects.toThrow(
      "unsupported storage version",
    );
  });
});
