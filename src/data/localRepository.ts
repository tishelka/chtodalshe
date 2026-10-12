import { catalog } from "./catalog";
import type { KeyValueStorage, Repository } from "./repository";
import { parseUserData } from "./validation";
import {
  emptyUserData,
  type HistoryEntry,
  type Preferences,
  type UserData,
} from "../types/domain";

export const DEMO_STORAGE_KEY = "whatnext.demo.v1";
export class LocalRepository implements Repository {
  readonly mode = "demo" as const;
  private queue: Promise<void> = Promise.resolve();
  constructor(private readonly storage: KeyValueStorage) {}
  async load(): Promise<UserData> {
    await this.queue;
    return this.read();
  }
  private async read(): Promise<UserData> {
    const raw = await this.storage.getItem(DEMO_STORAGE_KEY);
    if (raw === null) return emptyUserData();
    const envelope: unknown = JSON.parse(raw);
    if (
      typeof envelope !== "object" ||
      envelope === null ||
      !("version" in envelope) ||
      envelope.version !== 1 ||
      !("data" in envelope)
    )
      throw new Error("unsupported storage version");
    return parseUserData(envelope.data);
  }
  async getActivities() {
    return catalog;
  }
  private update(change: (data: UserData) => UserData): Promise<void> {
    const action = this.queue.then(async () => {
      const data = change(await this.read());
      await this.storage.setItem(
        DEMO_STORAGE_KEY,
        JSON.stringify({ version: 1, data }),
      );
    });
    // Ошибка записи не блокирует последующие повторные попытки.
    this.queue = action.catch(() => undefined);
    return action;
  }
  savePreferences(preferences: Preferences) {
    return this.update((data) => ({
      ...data,
      preferences: parseUserData({ ...data, preferences }).preferences,
    }));
  }
  setFavorite(activityId: string, saved: boolean) {
    return this.update((data) => ({
      ...data,
      favorites: saved
        ? [...new Set([...data.favorites, activityId])]
        : data.favorites.filter((id) => id !== activityId),
    }));
  }
  addHistory(entry: HistoryEntry) {
    return this.update((data) => ({
      ...data,
      history: [
        entry,
        ...data.history.filter((item) => item.id !== entry.id),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }));
  }
  setHistoryChosen(entryId: string, chosen: boolean) {
    return this.update((data) => ({
      ...data,
      history: data.history.map((entry) =>
        entry.id === entryId ? { ...entry, chosen } : entry,
      ),
    }));
  }
  clearHistory() {
    return this.update((data) => ({ ...data, history: [] }));
  }
}
