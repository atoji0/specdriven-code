import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";
import path from "path";

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
  ],
});
