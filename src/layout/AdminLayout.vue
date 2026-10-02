<template>
  <div class="ops-layout">
    <aside class="ops-aside" :class="{ collapsed }">
      <div class="brand">
        <BrandMark />
        <div class="brand-text">
          <strong>景区设施运维中枢</strong>
          <span>Scenic Operations Console</span>
        </div>
      </div>
      <el-menu router :default-active="$route.path" :default-openeds="['/system']" class="ops-menu" background-color="transparent" text-color="#cbd5e1" active-text-color="#ffffff" :collapse="collapsed" :collapse-transition="false">
        <el-menu-item v-for="item in primaryItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>
            <span class="menu-label">{{ item.title }}</span>
            <span v-if="item.path === '/messages' && unread" class="menu-count">{{ unread > 99 ? '99+' : unread }}</span>
          </template>
          <i v-if="(collapsed || narrow) && item.path === '/messages' && unread" class="collapsed-dot"></i>
        </el-menu-item>
        <el-sub-menu v-if="systemItems.length" index="/system">
          <template #title><el-icon><Setting /></el-icon><span class="menu-label">系统管理</span></template>
          <el-menu-item v-for="item in systemItems" :key="item.path" :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title><span class="menu-label">{{ item.title }}</span></template>
          </el-menu-item>
        </el-sub-menu>      </el-menu>
      <div class="aside-foot">Vue 3 · Vite · Element Plus</div>
    </aside>
    <section class="ops-main" :class="{ collapsed }">
      <header class="ops-topbar">
        <div class="topbar-left">
          <el-button class="collapse-btn" text :icon="collapsed ? Expand : Fold" :title="collapsed ? '展开导航' : '收起导航'" @click="toggleCollapsed" />
          <div>
            <div class="crumb">景区设施巡检报修系统 / {{ $route.meta.title || '控制台' }}</div>
            <div class="today">{{ today }}</div>
          </div>
        </div>
        <el-dropdown @command="handleCommand">
          <div class="user-chip">
            <div class="avatar">{{ initials }}</div>
            <div class="user-copy"><strong>{{ auth.user?.nickName || auth.user?.userName || '管理员' }}</strong><span>{{ auth.roles.join(' / ') || '系统用户' }}</span></div>
            <el-icon><ArrowDown /></el-icon>
          </div>
          <template #dropdown><el-dropdown-menu><el-dropdown-item command="logout">退出登录</el-dropdown-item></el-dropdown-menu></template>
        </el-dropdown>
      </header>
      <main class="ops-content"><router-view /></main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { Expand, Fold } from '@element-plus/icons-vue'
import BrandMark from '@/components/BrandMark.vue'
import { useAuthStore } from '@/stores/auth'
import { useMenuStore } from '@/stores/menu'
import { listMessages } from '@/api/system'

const auth = useAuthStore()
const menuStore = useMenuStore()
const route = useRoute()
const router = useRouter()
const today = dayjs().format('YYYY年MM月DD日 dddd')
const initials = computed(() => (auth.user?.nickName || auth.user?.userName || '管').slice(0, 1))
const unread = ref(0)
let unreadTimer: number | undefined
/* 侧边栏折叠状态本地记忆，刷新后保持一致 */
const COLLAPSE_KEY = 'tyd_ops_sidebar_collapsed'
const collapsed = ref(localStorage.getItem(COLLAPSE_KEY) === '1')
/* 窄屏下侧边栏自动收成图标条，此时未读改用小红点提示（与手动折叠保持一致） */
const narrow = ref(window.innerWidth <= 900)
const primaryItems = computed(() => menuStore.items.filter(item => !item.path.startsWith('/system/')))
const systemItems = computed(() => menuStore.items.filter(item => item.path.startsWith('/system/')))

watch(collapsed, value => localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0'))
function toggleCollapsed() { collapsed.value = !collapsed.value }
function syncNarrow() { narrow.value = window.innerWidth <= 900 }

/**
 * 角标只统计「发给当前账号」的未读消息。
 * 管理员虽然能看全站消息，但把别人未读算成自己的未读会误导（自己发出去的消息也会被算进去）。
 */
async function loadUnread() {
  if (!auth.hasPermission('system:message:list')) return
  try {
    const result: any = await listMessages({ receiverId: auth.user?.userId, isRead: '0', pageNum: 1, pageSize: 1 })
    unread.value = result.total || 0
  } catch { unread.value = 0 }
}

onMounted(async () => {
  window.addEventListener('resize', syncNarrow)
  if (!menuStore.loaded) await menuStore.load()
  await loadUnread()
  /* 消息可能由后台定时任务产生（如接单超时退回），定时刷新角标避免数字长期不更新 */
  unreadTimer = window.setInterval(loadUnread, 60000)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', syncNarrow)
  if (unreadTimer) window.clearInterval(unreadTimer)
})
/** 切页面时顺带刷新一次，读完消息回到列表时角标立即跟上 */
watch(() => route.path, () => loadUnread())

async function handleCommand(command: string) {
  if (command === 'logout') {
    await auth.logout()
    menuStore.reset()
    router.replace('/login')
  }
}
</script>

<style scoped>
.ops-layout { display: flex; min-height: 100vh; }
.ops-aside { position: fixed; inset: 0 auto 0 0; width: 232px; padding: 18px 14px; color: #e2e8f0; background: linear-gradient(180deg, #0f172a 0%, #134e4a 100%); display: flex; flex-direction: column; z-index: 10; transition: width .2s ease, padding .2s ease; }
.brand { display: flex; gap: 12px; align-items: center; padding: 6px 8px 22px; }
.brand strong { display: block; font-size: 15px; }
.brand span { display: block; margin-top: 3px; color: #94a3b8; font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }
.ops-menu { border: 0; flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding-right: 3px; box-sizing: border-box; }
.ops-menu::-webkit-scrollbar { width: 4px; }
.ops-menu::-webkit-scrollbar-track { background: transparent; }
.ops-menu::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, .34); border-radius: 999px; }
.ops-menu::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, .6); }
.ops-menu :deep(.el-menu-item) { height: 48px; margin: 4px 0; border-radius: 10px; }
.ops-menu :deep(.el-menu-item.is-active) { background: rgba(255,255,255,.14); box-shadow: inset 3px 0 0 #fbbf24; }
/*
 * 未读数角标自绘，不用 el-badge：
 * el-menu-item 是 flex 容器，会把 el-badge 拉伸成行高，导致数字被挤到菜单行底部。
 */
.menu-count {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 0 0 2px rgba(15, 23, 42, .35);
}
.aside-foot { color: #64748b; font-size: 11px; padding: 14px 8px 4px; }
.ops-main { width: calc(100% - 232px); margin-left: 232px; transition: width .2s ease, margin-left .2s ease; }
.topbar-left { display: flex; align-items: center; gap: 12px; }
.collapse-btn { width: 36px; height: 36px; border-radius: 10px; color: var(--ops-muted); font-size: 17px; }
.collapse-btn:hover { color: var(--ops-primary); background: #eef7f6; }
.collapsed-dot { position: absolute; top: 9px; right: 12px; width: 8px; height: 8px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 0 2px #134e4a; }

/* 折叠态：只留图标，标签改为悬浮提示；与窄屏规则保持同一套紧凑布局 */
.ops-aside.collapsed { width: 76px; padding-inline: 8px; }
.ops-aside.collapsed .brand { justify-content: center; padding-inline: 0; }
.ops-aside.collapsed .brand-text,
.ops-aside.collapsed .menu-label,
.ops-aside.collapsed .menu-count,
.ops-aside.collapsed .aside-foot { display: none; }
.ops-aside.collapsed .ops-menu { width: 100%; }
.ops-aside.collapsed .ops-menu :deep(.el-menu-item),
.ops-aside.collapsed .ops-menu :deep(.el-sub-menu__title) { position: relative; justify-content: center; padding-inline: 0 !important; }
.ops-main.collapsed { width: calc(100% - 76px); margin-left: 76px; }
.ops-topbar { height: 78px; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; background: #fff; border-bottom: 1px solid var(--ops-border); }
.crumb { font-weight: 700; }
.today { color: var(--ops-muted); font-size: 12px; margin-top: 5px; }
.user-chip { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.avatar { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, #0f766e, #0ea5e9); font-weight: 700; }
.user-copy strong, .user-copy span { display: block; }
.user-copy strong { font-size: 13px; }
.user-copy span { color: var(--ops-muted); font-size: 11px; margin-top: 2px; }
.ops-content { min-height: calc(100vh - 78px); }
@media (max-width: 900px) {
  .ops-aside { width: 76px; padding-inline: 8px; }
  .brand div:last-child, .ops-menu span, .aside-foot { display: none; }
  .brand { justify-content: center; padding-inline: 0; }
  .ops-main { width: calc(100% - 76px); margin-left: 76px; }
  .ops-menu :deep(.el-menu-item) { position: relative; justify-content: center; padding-inline: 0 !important; }
}
</style>
