import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";
import path from "path";

// 参照用アプリ（src_ref）の設定
// npm run dev:ref で port 5174 として起動
// _mzfw は src/_mzfw を共有する
export default defineConfig({
  // MPA モードにすることで SPA フォールバック（→ index.html）を無効にする
  // これにより Vite が src/router/index.ts を読み込むことを防ぐ
  appType: "mpa",
  base: "./",
  publicDir: "public",
  server: {
    port: 5174,
    open: "/",
  },
  // プリバンドルのスキャン対象を index.ref.html に限定する
  // （デフォルトの index.html → src/router/index.ts がスキャンされるのを防ぐ）
  optimizeDeps: {
    entries: ["index.ref.html"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src_ref"),
      mzfw: path.resolve(__dirname, "src/_mzfw"),
      mzfw_backend: path.resolve(__dirname, "src/backend/_mzfw"),
    },
  },
  plugins: [
    vue(),
    UnoCSS({
      inspector: false,
    }),
    // dev サーバー: ブラウザのナビゲーションリクエスト（Accept: text/html）のみ
    // /index.ref.html へリライトして SPA フォールバックを実現する
    // Vite 内部のモジュール解決リクエストは Accept ヘッダーで区別して除外する
    {
      name: "ref-entry-rewrite",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = (req.url ?? "/").split("?")[0];
          const acceptsHtml = (req.headers.accept ?? "").includes("text/html");
          if (acceptsHtml && !url.includes(".")) {
            req.url = "/index.ref.html";
          }
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, "index.ref.html"),
    },
  },
});
