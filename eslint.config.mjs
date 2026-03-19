// @ts-check
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["build/", "out/", "node_modules/"] },
  ...tseslint.configs.recommended,
);
