import { spawnSync } from "node:child_process";
const env = {
  ...process.env,
  EXPO_PUBLIC_API_URL: process.env.TEST_API_URL ?? "http://127.0.0.1:8000",
};
const build = spawnSync(
  process.execPath,
  [
    "node_modules/expo/bin/cli",
    "export",
    "--platform",
    "web",
    "--clear",
    "--output-dir",
    ".tools/remote-test-dist",
  ],
  { env, stdio: "inherit" },
);
if (build.status !== 0) process.exit(build.status ?? 1);
const tests = spawnSync(
  process.execPath,
  [
    "node_modules/playwright/cli.js",
    "test",
    "--config",
    "tests/e2e/remote.config.ts",
  ],
  { stdio: "inherit" },
);
process.exit(tests.status ?? 1);
