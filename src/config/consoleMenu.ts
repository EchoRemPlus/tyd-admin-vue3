/**
 * Vue 3 控制台菜单映射。
 *
 * 控制台导航由后端 sys_menu（/getRouters）驱动：后端决定"有哪些菜单、当前用户能看到哪些"，
 * 前端负责把菜单的 component 映射到已注册的路由与图标，并保持统一的显示顺序。
 * 未在映射表中的菜单（如参数设置、系统监控等旧管理端页面）会被忽略，不会产生死链。
 */
export interface ConsoleMenuItem {
  path: string
  title: string
  icon: string
  order: number
}

interface ComponentRoute {
  path: string
  icon: string
  order: number
}

export const COMPONENT_ROUTES: Record<string, ComponentRoute> = {
  'console/dashboard': { path: '/dashboard', icon: 'DataLine', order: 1 },
  'system/task/index': { path: '/tasks', icon: 'Calendar', order: 2 },
  'system/ticket/index': { path: '/tickets', icon: 'Tickets', order: 3 },
  'system/facility/index': { path: '/facilities', icon: 'OfficeBuilding', order: 4 },
  'system/category/index': { path: '/categories', icon: 'Grid', order: 5 },
  'system/route/index': { path: '/routes', icon: 'Guide', order: 6 },
  'console/plan': { path: '/plans', icon: 'Timer', order: 7 },
  'console/audit': { path: '/audit', icon: 'DocumentChecked', order: 8 },
  'console/statistics': { path: '/statistics', icon: 'TrendCharts', order: 9 },
  'system/message/index': { path: '/messages', icon: 'Bell', order: 10 },
  'ai/chat': { path: '/ai', icon: 'MagicStick', order: 11 },
  'system/user/index': { path: '/system/users', icon: 'User', order: 21 },
  'system/role/index': { path: '/system/roles', icon: 'UserFilled', order: 22 },
  'system/menu/index': { path: '/system/menus', icon: 'Menu', order: 23 },
  'system/dept/index': { path: '/system/depts', icon: 'OfficeBuilding', order: 24 },
  'system/post/index': { path: '/system/posts', icon: 'Postcard', order: 25 },
  'system/dict/index': { path: '/system/dicts', icon: 'Collection', order: 26 },
  'monitor/operlog/index': { path: '/system/operlog', icon: 'Document', order: 30 },
  'monitor/logininfor/index': { path: '/system/logininfor', icon: 'Key', order: 31 }
}

/** 后端菜单仅返回 component 时使用的标题（与路由 meta.title 保持一致） */
export const FALLBACK_TITLES: Record<string, string> = {
  '/dashboard': '运行总览',
  '/tasks': '巡检任务',
  '/tickets': '工单看板',
  '/facilities': '设施档案',
  '/categories': '设施分类',
  '/routes': '巡检路线',
  '/plans': '周期计划',
  '/audit': '业务审计',
  '/statistics': '统计分析',
  '/messages': '消息中心',
  '/ai': 'AI 助手',
  '/system/users': '用户管理',
  '/system/roles': '角色管理',
  '/system/menus': '菜单管理',
  '/system/depts': '部门管理',
  '/system/posts': '岗位管理',
  '/system/dicts': '字典管理',
  '/system/operlog': '操作日志',
  '/system/logininfor': '登录日志'
}
