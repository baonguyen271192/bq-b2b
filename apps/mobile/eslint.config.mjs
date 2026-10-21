import config from "@bq/config/eslint/expo";

export default [
  ...config,
  // ios/ và android/ do `expo prebuild` sinh ra (Continuous Native Generation),
  // bị gitignore — không lint code máy sinh.
  { ignores: ["expo-env.d.ts", ".expo/**", "dist/**", "dist-web/**", "ios/**", "android/**"] },

  // Màn hình CHỈ được ghép component. Chặn ở lint thay vì chỉ dựa vào grep:
  // grep chỉ chạy khi ai đó nhớ chạy, lint chạy trong CI.
  {
    files: ["app/**/*.tsx", "app/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{
          name: "react-native",
          importNames: ["Text"],
          message:
            "Dùng `T` (chữ) hoặc `Num` (số, có tabular-nums) từ @/components/ui. "
            + "Text gốc không gắn với token nên cỡ chữ và màu sẽ trôi khỏi design system.",
        }],
      }],
    },
  },
];
