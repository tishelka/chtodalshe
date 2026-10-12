import { expect, test, onboard, apiUrl } from "./helpers";

test("другой браузер видит общий профиль без локального хранилища и токенов", async ({
  page,
  browser,
  request,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Local storage unavailable");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Local storage unavailable");
    };
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const apiRequests: string[] = [];
  page.on("request", (req) => {
    if (req.url().startsWith(apiUrl)) {
      apiRequests.push(req.url());
      expect(req.headers().authorization).toBeUndefined();
    }
  });
  await onboard(page, false);
  await page.getByRole("button", { name: "Удиви меня", exact: true }).click();
  const title = await page.getByTestId("activity-title").innerText();
  await page.getByRole("button", { name: "В избранное", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "В избранном", exact: true }),
  ).toBeVisible();
  expect(await (await request.get(`${apiUrl}/favorites`)).json()).toHaveLength(
    1,
  );
  const context = await browser.newContext();
  try {
    const anotherPage = await context.newPage();
    await anotherPage.goto("http://127.0.0.1:4173/favorites");
    await expect(anotherPage.getByText(title, { exact: true })).toBeVisible();
    await anotherPage.goto("http://127.0.0.1:4173/profile");
    await expect(
      anotherPage.getByRole("button", { name: "Настольные игры", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  } finally {
    await context.close();
  }
  expect(errors).toEqual([]);
  expect(apiRequests.length).toBeGreaterThan(0);
});
