import config from "@bq/config/eslint/expo";

export default [
  ...config,
  // ios/ và android/ do `expo prebuild` sinh ra (Continuous Native Generation),
  // bị gitignore — không lint code máy sinh.
  { ignores: ["expo-env.d.ts", ".expo/**", "dist/**", "ios/**", "android/**"] },
];
