import config from "@bq/config/eslint/next";

export default [
  ...config,
  { ignores: ["next-env.d.ts", ".next/**"] },
];
