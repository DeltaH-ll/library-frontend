import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path"; // ✅ 新增这行

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // ✅ 让 @ 指向 src 目录
    },
  },
});
