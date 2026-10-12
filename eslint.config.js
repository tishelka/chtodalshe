const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  {
    ignores: [
      "backend/.venv/**",
      "dist/**",
      ".tools/**",
      ".npm-cache/**",
      "test-results/**",
      "playwright-report/**",
      ".expo/**",
    ],
  },
]);
