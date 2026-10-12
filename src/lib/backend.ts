import type { Repository } from "../data/repository";
import { ApiRepository } from "../data/apiRepository";

const url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
export function createRepository(): Repository {
  return new ApiRepository(url);
}
