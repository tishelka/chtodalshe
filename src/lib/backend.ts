import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DataMode } from "../types/domain";
import type { Repository } from "../data/repository";
import { LocalRepository } from "../data/localRepository";
import { ApiRepository } from "../data/apiRepository";

const url = process.env.EXPO_PUBLIC_API_URL;
export const hasBackendConfiguration = Boolean(url);
export function createRepository(mode: DataMode): Repository {
  if (mode === "demo") return new LocalRepository(AsyncStorage);
  if (!url) throw new Error("API URL missing");
  return new ApiRepository(url, AsyncStorage);
}
