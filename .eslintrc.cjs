/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:react-refresh/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ["@typescript-eslint", "react-hooks", "react-refresh"],
  rules: {
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
  ignorePatterns: ["node_modules/", "build/", "dist/", "*.config.*"],
};

