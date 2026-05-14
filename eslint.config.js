import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    files: ["src/**/*.ts"],
    extends: [tseslint.configs.base],
    rules: {
      "no-console": ["error", { allow: ["error", "warn"] }],
    },
  },
);
