// Metro trong monorepo: mặc định Metro chỉ theo dõi thư mục của app, nên các
// package workspace (@bq/types, @bq/core, @bq/api-client) sẽ "không tìm thấy" dù
// pnpm đã symlink đúng. Hai dòng watchFolders/nodeModulesPaths dưới đây là bắt buộc.
//
// Tài liệu: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Theo dõi cả workspace để sửa packages/* là app hot-reload ngay.
config.watchFolders = [workspaceRoot];

// 2. Tìm module ở cả node_modules của app lẫn của workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Chỉ lấy package từ hai nơi trên, tránh Metro tự đi lên cây thư mục và nạp
//    nhầm bản react/react-native khác version.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
