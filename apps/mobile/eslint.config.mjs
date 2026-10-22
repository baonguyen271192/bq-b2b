import config from "@bq/config/eslint/expo";

export default [
  ...config,
  // ios/ và android/ do `expo prebuild` sinh ra (Continuous Native Generation),
  // bị gitignore — không lint code máy sinh.
  { ignores: ["expo-env.d.ts", ".expo/**", "dist/**", "dist-*/**", "ios/**", "android/**"] },

  // Màn hình CHỈ được ghép component. Chặn ở lint thay vì chỉ dựa vào grep:
  // grep chỉ chạy khi ai đó nhớ chạy, lint chạy trong CI.
  {
    files: ["app/**/*.tsx", "app/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{
          name: "react-native",
          importNames: ["Text", "Pressable", "TouchableOpacity", "TouchableHighlight", "Switch"],
          message:
            "Màn hình chỉ ghép component từ @/components/ui: `T`/`Num` cho chữ, "
            + "`Pill`/`IconButton`/`TextButton`/`ListRow`/`RadioCard` cho thứ bấm được, "
            + "`Switch` của ui cho công tắc. Thành phần gốc không gắn với token nên cỡ "
            + "chữ, màu, bo góc và vùng chạm sẽ trôi khỏi design system.",
        }],
      }],
    },
  },
];
