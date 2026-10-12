import { expect, test as base, type Page } from "@playwright/test";

export { expect };
export const apiUrl = process.env.TEST_API_URL!;
export const test = base.extend<{ resetSharedProfile: void }>({
  resetSharedProfile: [
    async ({ request }, use) => {
      // Очистка разрешена только в отдельной базе, созданной run_e2e.py.
      if (process.env.WHATNEXT_E2E_ISOLATED !== "1" || !apiUrl)
        throw new Error(
          "Запускайте проверки через npm run test:e2e: он создаёт отдельную базу.",
        );
      expect((await request.delete(`${apiUrl}/history`)).ok()).toBe(true);
      const favorites = (await (
        await request.get(`${apiUrl}/favorites?limit=500`)
      ).json()) as string[];
      for (const id of favorites)
        expect((await request.delete(`${apiUrl}/favorites/${id}`)).ok()).toBe(
          true,
        );
      expect(
        (
          await request.put(`${apiUrl}/preferences`, {
            data: {
              interests: [],
              onboardingCompleted: false,
              lastFilters: null,
            },
          })
        ).ok(),
      ).toBe(true);
      await use();
    },
    { auto: true },
  ],
});

export async function onboard(page: Page, skip = true) {
  await page.goto("/");
  await page.getByRole("button", { name: "Начать", exact: true }).click();
  if (!skip)
    await page
      .getByRole("button", { name: "Настольные игры", exact: true })
      .click();
  await page
    .getByRole("button", {
      name: skip ? "Пропустить" : "Продолжить",
      exact: true,
    })
    .click();
  await expect(page.getByText("Чем займёмся?", { exact: true })).toBeVisible();
}
