export default [
  {
    files: [
      "src/**/*.js",
      "tests/**/*.js",
      "migrations/**/*.js",
      "scripts/migrate.js",
      "scripts/adopt-existing.js",
      "scripts/check-release.js",
      "scripts/export-research.js",
      "scripts/seed-demo.js",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        fetch: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/public/js/**/*.js"],
    languageOptions: {
      globals: { document: "readonly", AbortSignal: "readonly" },
    },
  },
];
