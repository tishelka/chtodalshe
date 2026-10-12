import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1024 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>body{margin:0}</style>${await readFile("assets/brand.svg", "utf8")}`,
  );
  await page.screenshot({ path: "assets/icon.png" });
} finally {
  await browser.close();
}
