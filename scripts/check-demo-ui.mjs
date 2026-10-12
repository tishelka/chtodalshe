import { spawnSync } from "node:child_process";
const env = { ...process.env, EXPO_PUBLIC_API_URL: "" };
const build = spawnSync(
  process.execPath,
  ["node_modules/expo/bin/cli", "export", "--platform", "web", "--clear"],
  { env, stdio: "inherit" },
);
if (build.status !== 0) process.exit(build.status ?? 1);
const tests = spawnSync(
  process.execPath,
  ["node_modules/playwright/cli.js", "test"],
  { stdio: "inherit" },
);
process.exit(tests.status ?? 1);
