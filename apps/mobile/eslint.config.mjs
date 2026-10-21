import config from "@bq/config/eslint/expo";

export default [
  ...config,
  { ignores: ["expo-env.d.ts", ".expo/**", "dist/**"] },
];
