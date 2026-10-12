import type { FullConfig } from "@playwright/test";
export default async function teardown(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (baseURL)
    await fetch(`${baseURL}/__test_shutdown`, {
      method: "POST",
      signal: AbortSignal.timeout(3000),
    }).catch(() => undefined);
}
