import js from "@eslint/js";

// TypeScript is type-checked by `tsc --noEmit` in the build. ESLint here covers
// the plain JavaScript build/serve scripts, keeping the dependency surface
// small (no extra TypeScript-ESLint toolchain for an 18-year file).
export default [
  {
    ignores: [
      "dist/**",
      "site/dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "src/**",
      "tests/**",
      "*.ts",
    ],
  },
  js.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
      },
    },
  },
];
