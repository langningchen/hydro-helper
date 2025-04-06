import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";


export default defineConfig([
  globalIgnores(["res/libs", "out"]),
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { files: ["res/html/*.js"], languageOptions: { globals: { ...globals.browser } } },
  { files: ["src/**/*.ts"], languageOptions: { globals: { ...globals.node } } },
  { files: ["**/*.{js,mjs,cjs,ts}"], plugins: { js }, extends: ["js/recommended"] },
  tseslint.configs.recommended,
]);
