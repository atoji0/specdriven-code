import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  publicDir: "public",
  build: {
    outDir: "../docs",
    emptyOutDir: true,
  },
  // index.ref.html も同フォルダにあるため、スキャン対象を index.html に限定する
  optimizeDeps: {
    entries: ["index.html"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      mzfw: path.resolve(__dirname, "src/_mzfw"),
      mzfw_backend: path.resolve(__dirname, "src/backend/_mzfw"),
    },
  },
  plugins: [
    vue(),
    UnoCSS({
      inspector: false,
    }),
    VitePWA({
      // 新しいバージョンのビルドを検知したら自動で SW を更新してページをリロード
      registerType: "autoUpdate",
      // ビルド時に sw.js と manifest を自動生成
      injectRegister: null,
      workbox: {
        // SPA のルーティング: 全ナビゲーションを index.html にフォールバック
        navigateFallback: "index.html",
        // キャッシュ対象のファイルパターン
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,json}"],
        // GitHub Pages の相対パス対応: SW のスコープをルートに限定しない
        globIgnores: ["env/**"],
        // exceljs 等の大きなチャンクに対応（デフォルト 2MB → 10MB）
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
      manifest: {
        name: "車両不具合管理",
        short_name: "不具合管理",
        description: "車両不具合記録管理アプリ",
        theme_color: "#409eff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "logo.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "logo.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
