import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMenuStore } from '@/stores/menu'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
    { path: '/403', name: 'forbidden', component: () => import('@/views/ForbiddenView.vue'), meta: { title: '无访问权限' } },
    {
      path: '/',
      component: () => import('@/layout/AdminLayout.vue'),
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: '运行总览', permission: 'system:dashboard:view' } },
        { path: 'tasks', name: 'tasks', component: () => import('@/views/TasksView.vue'), meta: { title: '巡检任务', permission: 'system:task:list' } },
        { path: 'tickets', name: 'tickets', component: () => import('@/views/TicketsView.vue'), meta: { title: '工单看板', permission: 'system:ticket:list' } },
        { path: 'facilities', name: 'facilities', component: () => import('@/views/FacilitiesView.vue'), meta: { title: '设施档案', permission: 'system:facility:list' } },
        { path: 'routes', name: 'routes', component: () => import('@/views/RoutesView.vue'), meta: { title: '巡检路线', permission: 'system:route:list' } },
        { path: 'plans', name: 'plans', component: () => import('@/views/PlansView.vue'), meta: { title: '周期计划', permission: 'system:plan:list' } },
        { path: 'audit', name: 'audit', component: () => import('@/views/AuditView.vue'), meta: { title: '业务审计', permission: 'system:businessLog:list' } },
        { path: 'statistics', name: 'statistics', component: () => import('@/views/StatisticsView.vue'), meta: { title: '统计分析', permission: 'system:statistics:list' } },
        { path: 'messages', name: 'messages', component: () => import('@/views/MessagesView.vue'), meta: { title: '消息中心', permission: 'system:message:list' } },
        { path: 'categories', name: 'categories', component: () => import('@/views/CategoriesView.vue'), meta: { title: '设施分类', permission: 'system:category:list' } },
        { path: 'ai', name: 'ai', component: () => import('@/views/AiChatView.vue'), meta: { title: 'AI 助手', permission: 'system:ai:chat' } },
        { path: 'system/users', name: 'system-users', component: () => import('@/views/system/UserManagementView.vue'), meta: { title: '用户管理', permission: 'system:user:list' } },
        { path: 'system/roles', name: 'system-roles', component: () => import('@/views/system/RoleManagementView.vue'), meta: { title: '角色管理', permission: 'system:role:list' } },
        { path: 'system/menus', name: 'system-menus', component: () => import('@/views/system/MenuManagementView.vue'), meta: { title: '菜单管理', permission: 'system:menu:list' } },
        { path: 'system/depts', name: 'system-depts', component: () => import('@/views/system/DeptManagementView.vue'), meta: { title: '部门管理', permission: 'system:dept:list' } },
        { path: 'system/posts', name: 'system-posts', component: () => import('@/views/system/PostManagementView.vue'), meta: { title: '岗位管理', permission: 'system:post:list' } },
        { path: 'system/dicts', name: 'system-dicts', component: () => import('@/views/system/DictManagementView.vue'), meta: { title: '字典管理', permission: 'system:dict:list' } },
        { path: 'system/operlog', name: 'system-operlog', component: () => import('@/views/system/OperationLogView.vue'), meta: { title: '操作日志', permission: 'monitor:operlog:list' } },
        { path: 'system/logininfor', name: 'system-logininfor', component: () => import('@/views/system/LoginLogView.vue'), meta: { title: '登录日志', permission: 'monitor:logininfor:list' } }
      ]
    },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

router.beforeEach(async to => {
  const auth = useAuthStore()
  const menuStore = useMenuStore()
  if (to.meta.public) {
    if (auth.token && to.path === '/login') {
      if (!auth.user) {
        try { await auth.fetchProfile() } catch { return true }
      }
      if (!menuStore.loaded) await menuStore.load()
      const firstPath = menuStore.firstPath()
      if (firstPath) return { path: firstPath }
    }
    return true
  }
  if (!auth.token) return { path: '/login', query: { redirect: to.fullPath } }
  if (!auth.user) {
    try { await auth.fetchProfile() } catch { return '/login' }
  }
  if (to.path === '/403') return true
  if (!menuStore.loaded) await menuStore.load()

  const firstPath = menuStore.firstPath()
  if (!firstPath) return { path: '/403', query: { reason: 'empty' } }
  const requiredPermission = String(to.meta.permission || '')
  if (requiredPermission && !auth.hasPermission(requiredPermission)) {
    return { path: '/403', query: { from: to.fullPath } }
  }
  if (to.path === '/' || (to.path === '/dashboard' && !menuStore.hasPath(to.path))) {
    return { path: firstPath }
  }
  if (!menuStore.hasPath(to.path)) {
    return { path: '/403', query: { from: to.fullPath } }
  }
  return true
})

export default router
