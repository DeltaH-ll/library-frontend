import { createRouter, createWebHistory } from "vue-router";
import { useUserStore } from "@/store/user";

// 导入页面组件（确保路径正确）
const Login = () => import("@/views/Login.vue");
const Register = () => import("@/views/Register.vue");
const AdminHome = () => import("@/views/admin/Home.vue");
const AdminDashboard = () => import("@/views/admin/Dashboard.vue");
const AdminBooks = () => import("@/views/admin/Books.vue");
const AdminBorrow = () => import("@/views/admin/Borrow.vue");
const AdminUsers = () => import("@/views/admin/Users.vue");
const UserHome = () => import("@/views/user/Home.vue");
const UserBookList = () => import("@/views/user/BookList.vue");
const UserMyBorrow = () => import("@/views/user/MyBorrow.vue");
const UserProfile = () => import("@/views/user/Profile.vue");

// 路由规则
const routes = [
  { path: "/", redirect: "/login" }, // 默认重定向到登录页
  { path: "/login", component: Login, meta: { isPublic: true } },
  { path: "/register", component: Register, meta: { isPublic: true } },

  // 管理员端路由
  {
    path: "/admin",
    component: AdminHome,
    meta: { requiresAuth: true, role: "admin" },
    redirect: "/admin/dashboard",
    children: [
      { path: "dashboard", component: AdminDashboard },
      { path: "books", component: AdminBooks },
      { path: "borrow", component: AdminBorrow },
      { path: "users", component: AdminUsers },
    ],
  },

  // 普通用户端路由
  {
    path: "/user",
    component: UserHome,
    meta: { requiresAuth: true, role: "user" },
    redirect: "/user/book-list",
    children: [
      { path: "book-list", component: UserBookList },
      { path: "my-borrow", component: UserMyBorrow },
      { path: "profile", component: UserProfile },
    ],
  },

  // 404页面（重定向到登录页）
  { path: "/:pathMatch(.*)*", redirect: "/login" },
];

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 全局路由守卫（修复循环问题）
router.beforeEach((to, from, next) => {
  const userStore = useUserStore();

  // 1. 初始化：仅当未加载状态且需要认证时，从localStorage恢复
  if (!userStore.token && to.meta.requiresAuth) {
    userStore.load();
  }

  const { token, role } = userStore;

  // 2. 公开页面（登录/注册）：已登录则跳首页，未登录则放行
  if (to.meta.isPublic) {
    return token
      ? role === "admin"
        ? next("/admin/dashboard")
        : next("/user/book-list")
      : next();
  }

  // 3. 需认证页面：未登录则跳登录页
  if (!token) {
    return next("/login");
  }

  // 4. 权限校验：角色匹配则放行，不匹配则跳对应首页
  if (to.meta.role && to.meta.role !== role) {
    return role === "admin"
      ? next("/admin/dashboard")
      : next("/user/book-list");
  }

  // 5. 所有条件满足，放行
  next();
});

export default router;
