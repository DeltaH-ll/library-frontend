// src/main.js
import { createApp } from "vue";
import App from "./App.vue";

// Element Plus
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

// Pinia 状态管理
import { createPinia } from "pinia";

// Vue Router
import router from "./router";

// 全局样式（可选）
import "./style.css";

// 创建应用实例
const app = createApp(App);

// 注册插件
app.use(ElementPlus);
app.use(createPinia()); // ✅ 注册 Pinia
app.use(router); // ✅ 使用独立的 router 配置

// 挂载应用
app.mount("#app");
